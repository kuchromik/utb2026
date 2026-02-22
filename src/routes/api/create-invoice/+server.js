import { json } from '@sveltejs/kit';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { env } from '$env/dynamic/private';

let db;
let storage;
let isFirebaseInitialized = false;

/**
 * Initialisiert Firebase Admin nur wenn nötig (nicht während des Builds)
 */
async function initializeFirebaseAdmin() {
    if (isFirebaseInitialized) {
        return true;
    }

    // Überspringe Initialisierung während des Build-Prozesses
    if (!env.FIREBASE_PRIVATE_KEY || !env.FIREBASE_CLIENT_EMAIL) {
        console.warn('Firebase Admin Credentials nicht verfügbar - überspringe Initialisierung');
        return false;
    }

    try {
        // Dynamischer Import nur zur Laufzeit
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');
        const { getStorage } = await import('firebase-admin/storage');

        if (getApps().length === 0) {
            // Private Key richtig formatieren - handhabe verschiedene Encoding-Szenarien
            let privateKey = env.FIREBASE_PRIVATE_KEY;
            
            // Falls der Key als Base64 kodiert ist (FIREBASE_PRIVATE_KEY_BASE64)
            if (env.FIREBASE_PRIVATE_KEY_BASE64) {
                privateKey = Buffer.from(env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
            } 
            // Falls der Key escaped newlines hat (\n als literal string)
            else if (privateKey.includes('\\n')) {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }
            
            // Validierung des Private Keys
            if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
                throw new Error('Private Key hat ungültiges Format. Stellen Sie sicher, dass er BEGIN und END PRIVATE KEY enthält.');
            }
            
            console.log('Initialisiere Firebase Admin...');
            console.log('Project ID:', env.VITE_FIREBASE_PROJECT_ID);
            console.log('Storage Bucket:', env.VITE_FIREBASE_STORAGE_BUCKET);
            console.log('Client Email:', env.FIREBASE_CLIENT_EMAIL);
            console.log('Private Key starts with:', privateKey.substring(0, 50));
            
            initializeApp({
                credential: cert({
                    projectId: env.VITE_FIREBASE_PROJECT_ID,
                    clientEmail: env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey
                }),
                storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET
            });
        }

        db = getFirestore();
        storage = getStorage();
        isFirebaseInitialized = true;
        console.log('Firebase Admin erfolgreich initialisiert');
        return true;
    } catch (error) {
        console.error('Fehler bei Firebase Admin Initialisierung:', error);
        console.error('Error Details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return false;
    }
}

/**
 * @param {{
 *   request: Request;
 * }} event
 */
export async function POST({ request }) {
    try {
        // Initialisiere Firebase Admin erst zur Laufzeit
        const initialized = await initializeFirebaseAdmin();

        if (!initialized) {
            return json({ 
                error: 'Firebase Admin konnte nicht initialisiert werden',
                details: 'Bitte überprüfen Sie die Umgebungsvariablen (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)' 
            }, { status: 500 });
        }

        const { job, customer, userId } = await request.json();

        if (!job || !customer || !userId) {
            return json({ error: 'Fehlende erforderliche Daten' }, { status: 400 });
        }

        // Hole Firmendaten und Rechnungsnummer aus Firebase
        // Versuche zuerst die spezifische Dokument-ID, dann das erste Dokument
        let companySnap;
        let companyData;
        
        // Versuche zuerst die bekannte ID aus Ihrer Datenbank
        const knownCompanyId = 'dX9hqQJu8vcMeIVLTl4l';
        companySnap = await db.collection('company').doc(knownCompanyId).get();
        
        if (!companySnap.exists) {
            // Fallback: Hole das erste Dokument aus der Collection
            console.log('Dokument mit ID nicht gefunden, suche erstes Dokument in company Collection...');
            const companyQuery = await db.collection('company').limit(1).get();
            
            if (companyQuery.empty) {
                return json({ error: 'Firmendaten nicht gefunden' }, { status: 404 });
            }
            
            companySnap = companyQuery.docs[0];
        }

        companyData = companySnap.data();
        if (!companyData) {
            return json({ error: 'Firmendaten sind ungültig' }, { status: 500 });
        }
        
        console.log('Firmendaten geladen:', { 
            name: companyData.name, 
            currentInvoice: companyData.currentInvoice 
        });

        const currentInvoiceNumber = companyData.currentInvoice || 1;
        
        // PDF erstellen
        const pdfDoc = createInvoicePDF(job, customer, companyData, currentInvoiceNumber);
        const pdfBytes = pdfDoc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfBytes);
        
        // Dateiname generieren
        const invoiceFileName = `Rechnung_${currentInvoiceNumber}_${job.jobname.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        const timestamp = Date.now();
        const storagePath = `invoices/${userId}/${timestamp}_${invoiceFileName}`;
        
        console.log('Lade PDF in Firebase Storage hoch...');
        console.log('Storage Path:', storagePath);
        
        // PDF in Firebase Storage hochladen
        try {
            const bucket = storage.bucket();
            console.log('Bucket Name:', bucket.name);
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
            
            console.log('PDF erfolgreich hochgeladen');
        } catch (storageError) {
            console.error('Fehler beim Storage Upload:', storageError);
            throw new Error(`Firebase Storage Fehler: ${storageError instanceof Error ? storageError.message : 'Unbekannt'}. Stellen Sie sicher, dass Firebase Storage aktiviert ist und der Bucket existiert.`);
        }

        // Download-URL generieren (signiert für 7 Tage)
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 Tage
        });

        // Rechnungsnummer in Firebase erhöhen
        await companySnap.ref.update({
            currentInvoice: currentInvoiceNumber + 1
        });

        console.log('Rechnungsnummer erhöht auf:', currentInvoiceNumber + 1);

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
