import { json } from '@sveltejs/kit';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { env } from '$env/dynamic/private';

// Firebase Admin initialisieren (nur einmal)
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET
    });
}

const db = getFirestore();
const storage = getStorage();

/**
 * @param {{
 *   request: Request;
 * }} event
 */
export async function POST({ request }) {
    try {
        const { job, customer, userId } = await request.json();

        if (!job || !customer || !userId) {
            return json({ error: 'Fehlende erforderliche Daten' }, { status: 400 });
        }

        // Hole Firmendaten und Rechnungsnummer aus Firebase
        const companyRef = db.collection('company').doc('companyData');
        const companySnap = await companyRef.get();
        
        if (!companySnap.exists) {
            return json({ error: 'Firmendaten nicht gefunden' }, { status: 404 });
        }

        const companyData = companySnap.data();
        if (!companyData) {
            return json({ error: 'Firmendaten sind ungültig' }, { status: 500 });
        }

        const currentInvoiceNumber = companyData.currentInvoice || 1;
        
        // PDF erstellen
        const pdfDoc = createInvoicePDF(job, customer, companyData, currentInvoiceNumber);
        const pdfBytes = pdfDoc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfBytes);
        
        // Dateiname generieren
        const invoiceFileName = `Rechnung_${currentInvoiceNumber}_${job.jobname.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        const timestamp = Date.now();
        const storagePath = `invoices/${userId}/${timestamp}_${invoiceFileName}`;
        
        // PDF in Firebase Storage hochladen
        const bucket = storage.bucket();
        const file = bucket.file(storagePath);
        
        await file.save(pdfBuffer, {
            metadata: {
                contentType: 'application/pdf',
                metadata: {
                    invoiceNumber: currentInvoiceNumber.toString(),
                    jobId: job.id,
                    customerId: customer.id || '',
                    createdAt: new Date().toISOString()
                }
            }
        });

        // Download-URL generieren (signiert für 7 Tage)
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 Tage
        });

        // Rechnungsnummer in Firebase erhöhen
        await companyRef.update({
            currentInvoice: currentInvoiceNumber + 1
        });

        // PDF als Base64 für E-Mail-Anhang
        const pdfBase64 = pdfBuffer.toString('base64');

        return json({
            success: true,
            invoiceNumber: currentInvoiceNumber,
            downloadUrl: url,
            storagePath,
            pdfBase64,
            fileName: invoiceFileName
        });

    } catch (error) {
        console.error('Fehler bei Rechnungserstellung:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return json({ 
            error: 'Fehler bei der Rechnungserstellung',
            details: errorMessage
        }, { status: 500 });
    }
}

/**
 * Erstellt ein PDF-Dokument für die Rechnung
 * @param {any} job - Auftragsdaten
 * @param {any} customer - Kundendaten  
 * @param {any} company - Firmendaten
 * @param {number} invoiceNumber - Rechnungsnummer
 * @returns {jsPDF} PDF-Dokument
 */
function createInvoicePDF(job, customer, company, invoiceNumber) {
    const doc = new jsPDF();
    
    // Firmenkopf
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name || 'Chromik Offsetdruck', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const companyInfo = [
        company.address || '',
        `${company.zip || ''} ${company.city || ''}`,
        company.phone || '',
        company.email || ''
    ].filter(Boolean);
    
    let yPos = 30;
    companyInfo.forEach(/** @param {string} line */ (line) => {
        doc.text(line, 20, yPos);
        yPos += 5;
    });

    // Rechnungsnummer und Datum
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rechnung Nr. ${invoiceNumber}`, 20, yPos + 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('de-DE');
    doc.text(`Datum: ${today}`, 20, yPos + 25);

    // Kundenadresse
    yPos = yPos + 40;
    doc.setFont('helvetica', 'bold');
    doc.text('Rechnungsempfänger:', 120, yPos);
    doc.setFont('helvetica', 'normal');
    
    const customerName = customer.company || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const customerAddress = [
        customerName,
        customer.street || customer.address || '',
        `${customer.zip || ''} ${customer.city || ''}`,
        customer.country || ''
    ].filter(Boolean);
    
    yPos += 7;
    customerAddress.forEach(/** @param {string} line */ (line) => {
        doc.text(line, 120, yPos);
        yPos += 5;
    });

    // Auftragsdetails als Tabelle
    yPos = Math.max(yPos + 10, 120);
    
    const netAmount = job.amount;
    const vatRate = job.vatRate || 19;
    const vatAmount = (netAmount * vatRate) / (100 + vatRate);
    const grossAmount = netAmount;
    const netAmountOnly = netAmount - vatAmount;

    // @ts-ignore - autoTable wird durch Plugin hinzugefügt
    doc.autoTable({
        startY: yPos,
        head: [['Position', 'Beschreibung', 'Menge', 'Einzelpreis', 'Gesamt']],
        body: [
            [
                '1',
                job.jobname,
                `${job.quantity} Stück`,
                `${(netAmountOnly / job.quantity).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`,
                `${netAmountOnly.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 10 }
    });

    // Details zu Auftrag
    // @ts-ignore - lastAutoTable wird durch Plugin hinzugefügt
    yPos = doc.lastAutoTable.finalY + 10;
    if (job.details) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Details: ${job.details}`, 20, yPos);
        yPos += 7;
    }
    doc.text(`Produzent: ${job.producer}`, 20, yPos);
    yPos += 10;

    // Summentabelle
    // @ts-ignore - autoTable wird durch Plugin hinzugefügt
    doc.autoTable({
        startY: yPos,
        body: [
            ['Nettobetrag', `${netAmountOnly.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`],
            [`MwSt. ${vatRate}%`, `${vatAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`],
            ['Gesamtbetrag', `${grossAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`]
        ],
        startX: 120,
        styles: { fontSize: 10 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { halign: 'right', cellWidth: 30 }
        },
        theme: 'plain'
    });

    // Zahlungsinformationen
    // @ts-ignore - lastAutoTable wird durch Plugin hinzugefügt
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlungsinformationen:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const paymentInfo = [
        `IBAN: ${company.iban || ''}`,
        `BIC: ${company.bic || ''}`,
        `Bank: ${company.bank || ''}`,
        '',
        'Zahlbar innerhalb von 14 Tagen ohne Abzug.'
    ];
    
    yPos += 7;
    paymentInfo.forEach(/** @param {string} line */ (line) => {
        doc.text(line, 20, yPos);
        yPos += 5;
    });

    // Fußzeile
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = `${company.name || ''} | ${company.taxId ? 'Steuernr: ' + company.taxId : ''}`;
    doc.text(footerText, 20, pageHeight - 10);

    return doc;
}
