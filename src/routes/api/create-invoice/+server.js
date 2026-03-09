import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';
import _jspdfModule from 'jspdf';
import _autoTableModule from 'jspdf-autotable';

// When Vite bundles CJS modules, module.exports becomes the default export.
// jspdf:          default = { jsPDF: constructor, ... }  → destructure directly
// jspdf-autotable: default = { default: fn, ... }        → take .default for the function
/** @type {any} */
const { jsPDF } = /** @type {any} */ (_jspdfModule);
/** @type {(doc: any, options: any) => void} */
const autoTable = /** @type {any} */ (_autoTableModule).default;
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';

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

        const { job, customer, userId, invoiceEmail, customerName, amount, vatRate, previewOnly } = await request.json();

        if (!job || !customer || (!userId && !previewOnly)) {
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

        // Sicherstellen, dass currentInvoiceNumber eine Zahl ist
        const currentInvoiceNumber = parseInt(companyData.currentInvoice, 10) || 1;
        
        // PDF erstellen
        console.log('Erstelle PDF für Rechnung Nr.', currentInvoiceNumber);
        const pdfDoc = await createInvoicePDF(job, customer, companyData, currentInvoiceNumber);
        const pdfBytes = pdfDoc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfBytes);
        
        // Dateiname generieren
        const invoiceFileName = `Rechnung_${currentInvoiceNumber}_${job.jobname.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        
        console.log('PDF erstellt:', invoiceFileName);

        // Nur Vorschau: PDF zurückgeben ohne Rechnungsnummer zu erhöhen oder E-Mail zu senden
        if (previewOnly) {
            return json({
                pdfBase64: pdfBuffer.toString('base64'),
                invoiceNumber: currentInvoiceNumber,
                fileName: invoiceFileName
            });
        }

        // Rechnungsnummer in Firebase erhöhen (sicherstellen, dass es eine Zahl ist)
        const nextInvoiceNumber = currentInvoiceNumber + 1;
        await companySnap.ref.update({
            currentInvoice: nextInvoiceNumber
        });

        console.log('Rechnungsnummer erhöht von', currentInvoiceNumber, 'auf', nextInvoiceNumber);

        // PDF in Firebase Storage speichern (Unterordner nach Kalenderjahr)
        try {
            const year = new Date().getFullYear().toString();
            const storagePath = `invoices/${year}/${invoiceFileName}`;
            const bucket = storage.bucket();
            const file = bucket.file(storagePath);
            await file.save(pdfBuffer, {
                metadata: { contentType: 'application/pdf' }
            });
            console.log('PDF in Firebase Storage gespeichert:', storagePath);
        } catch (storageError) {
            // Fehler beim Storage-Upload nicht den E-Mail-Versand blockieren
            console.error('PDF konnte nicht in Firebase Storage gespeichert werden:', storageError);
        }

        // E-Mail direkt serverseitig versenden (kein PDF-Roundtrip durch den Browser)
        if (invoiceEmail) {
            const smtpHost = env.SMTP_HOST || 'smtp.gmail.com';
            const smtpPort = parseInt(env.SMTP_PORT || '587');
            const smtpSecure = env.SMTP_SECURE === 'true';
            const smtpUser = env.SMTP_USER;
            const smtpPass = env.SMTP_PASS;
            const smtpFrom = env.SMTP_FROM || smtpUser;

            if (!smtpUser || !smtpPass) {
                return json({ error: 'SMTP-Zugangsdaten nicht konfiguriert' }, { status: 500 });
            }

            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: { user: smtpUser, pass: smtpPass }
            });

            const displayVat = Number(vatRate || job.vatRate || 19);
            const emailNetto = parseFloat((Number(job.amount) || 0).toFixed(2));
            const emailShipping = parseFloat((Number(job.shippingCosts) || 0).toFixed(2));
            const emailNettosumme = parseFloat((emailNetto + emailShipping).toFixed(2));
            const emailMwst = parseFloat((emailNettosumme * displayVat / 100).toFixed(2));
            const emailGesamt = parseFloat((emailNettosumme + emailMwst).toFixed(2));
            const displayAmount = emailGesamt.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const salutationName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
            const subject = `Rechnung Nr. ${currentInvoiceNumber} - ${job.jobname}`;

            const text = `Hallo ${salutationName},\n\nanbei erhalten Sie die Rechnung Nr. ${currentInvoiceNumber} für Ihren Auftrag "${job.jobname}".\n\nRechnungsbetrag: ${displayAmount} € (inkl. ${displayVat}% MwSt.)\n\nBitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen auf das in der Rechnung angegebene Konto.\n\nMit freundlichen Grüßen\nKai-Uwe Chromik\nChromik Offsetdruck`;

            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3B82F6 0%,#2563EB 100%);color:white;padding:20px;border-radius:8px;margin-bottom:20px}.content{background:#f9f9f9;padding:20px;border-radius:8px}.invoice-info{background:#fff;padding:15px;border-left:4px solid #3B82F6;margin:15px 0}.amount{font-size:1.2em;color:#059669;font-weight:bold}.footer{margin-top:20px;font-size:0.9em;color:#666}.attachment-note{background:#FEF3C7;padding:10px;border-radius:5px;margin-top:15px}</style></head><body><div class="container"><div class="header"><h2>📄 Rechnung Nr. ${currentInvoiceNumber}</h2></div><div class="content"><p>Hallo <strong>${salutationName}</strong>,</p><p>anbei erhalten Sie die Rechnung Nr. <strong>${currentInvoiceNumber}</strong> für Ihren Auftrag "<strong>${job.jobname}</strong>".</p><div class="invoice-info"><strong>Rechnungsbetrag:</strong><br><span class="amount">${displayAmount} € (inkl. ${displayVat}% MwSt.)</span></div><p>Bitte überweisen Sie den Rechnungsbetrag innerhalb von <strong>14 Tagen</strong> auf das in der Rechnung angegebene Konto.</p><div class="attachment-note">📎 Die Rechnung finden Sie als PDF-Anhang dieser E-Mail.</div><p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p></div><div class="footer"><p>Mit freundlichen Grüßen<br><strong>Kai-Uwe Chromik</strong><br>Chromik Offsetdruck</p></div></div></body></html>`;

            await transporter.sendMail({
                from: smtpFrom,
                to: invoiceEmail,
                bcc: 'invoicelog@online.de',
                subject,
                text,
                html,
                attachments: [{ filename: invoiceFileName, content: pdfBuffer, contentType: 'application/pdf' }]
            });

            console.log('Rechnung per E-Mail versendet an:', invoiceEmail);
        }

        return json({
            success: true,
            invoiceNumber: currentInvoiceNumber,
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
 * @returns {Promise<jsPDF>} PDF-Dokument
 */
async function createInvoicePDF(job, customer, company, invoiceNumber) {
    const doc = new jsPDF({ compress: true });
    
    // Logo laden und einfügen (oben rechts mit 20mm Abstand)
    try {
        let logoBase64;
        let logoLoaded = false;
        
        // Versuche zuerst lokale Datei (Development)
        const localLogoPath = join(process.cwd(), 'static', 'logo.png');
        if (existsSync(localLogoPath)) {
            console.log('Logo lokal gefunden:', localLogoPath);
            const logoData = readFileSync(localLogoPath);
            logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
            logoLoaded = true;
        }
        
        // Falls lokal nicht gefunden, lade von öffentlicher URL (Production)
        if (!logoLoaded) {
            console.log('Logo lokal nicht gefunden, lade von öffentlicher URL...');
            const logoUrl = 'https://chromikoffsetdruck.de/logo.png';
            console.log('Versuche Logo von:', logoUrl);
            const response = await fetch(logoUrl);
            if (response.ok) {
                const buffer = await response.arrayBuffer();
                logoBase64 = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
                logoLoaded = true;
                console.log('Logo erfolgreich von URL geladen');
            } else {
                console.warn('Logo konnte nicht von URL geladen werden. Status:', response.status);
            }
        }
        
        if (logoLoaded) {
            // Logo-Dimensionen (351 x 51 Pixel = Verhältnis 6.88:1)
            const logoWidth = 80; // mm
            const logoHeight = logoWidth / 6.88; // ca. 11.63 mm (proportional)
            
            // Position: 10mm vom rechten und oberen Rand
            // A4 Breite ist 210mm
            const xPosition = 210 - 10 - logoWidth; // für rechtsbündig mit 10mm Abstand
            const yPosition = 10;
            
            doc.addImage(logoBase64, 'PNG', xPosition, yPosition, logoWidth, logoHeight);
            console.log('Logo erfolgreich eingefügt');
        }
    } catch (error) {
        console.warn('Logo konnte nicht geladen werden:', error);
        // Fahre ohne Logo fort
    }
    
    // Firmenkopf
    /* ersetzt durch Logo
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name || 'Chromik Offsetdruck', 20, 20);
    */
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const companyInfo = [
        company.owner || '',
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

    // Kundenadresse
    yPos = yPos + 5; // Abstand zum Firmenkopf
    doc.setFont('helvetica', 'bold');
    doc.text('Rechnungsempfänger:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    
    // Prüfe ob Job eine abweichende Rechnungsadresse hat
    let customerName, customerAddress;
    
    if (job.billingAddress) {
        // Verwende die job-spezifische Rechnungsadresse
        customerName = String(job.billingAddress.firma || '');
        customerAddress = [
            customerName,
            String(job.billingAddress.strasse || ''),
            `${String(job.billingAddress.plz || '')} ${String(job.billingAddress.ort || '')}`.trim(),
            String(job.billingAddress.land || '')
        ].filter(Boolean);
    } else {
        // Verwende die Standard-Kundenadresse
        customerName = String(customer.company || `${customer.firstName || ''} ${customer.lastName || ''}`.trim());
        customerAddress = [
            customerName,
            String(customer.street || customer.address || ''),
            `${String(customer.zip || '')} ${String(customer.city || '')}`.trim(),
            String(customer.country || '')
        ].filter(Boolean);
    }
    
    yPos += 7;
    customerAddress.forEach(/** @param {string} line */ (line) => {
        doc.text(line, 20, yPos);
        yPos += 5;
    });

    // Rechnungsnummer und Datum
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rechnung Nr. ${invoiceNumber}`, 20, 110);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('de-DE');
    doc.text(`Rechnungs- und Lieferdatum: ${today}`, 20, 115);

    // Auftragsdetails als Tabelle
    yPos = Math.max(yPos + 10, 120);
    
    const netAmountOnly = parseFloat((Number(job.amount) || 0).toFixed(2));
    const vatRate = Number(job.vatRate) || 19;
    const shippingNetto = (job.shippingCosts != null)
        ? parseFloat(Number(job.shippingCosts).toFixed(2))
        : 0;
    const hasShipping = shippingNetto > 0;
    const nettosumme = parseFloat((netAmountOnly + shippingNetto).toFixed(2));
    const vatAmount = parseFloat((nettosumme * vatRate / 100).toFixed(2));
    const grossAmount = parseFloat((nettosumme + vatAmount).toFixed(2));

    // A4: 210mm, left margin 20mm, right margin 20mm → usable: 170mm
    // Col widths: Beschreibung 105 + Menge 30 + Gesamt 35 = 170mm
    autoTable(doc, {
        startY: yPos,
        margin: { left: 20, right: 20 },
        head: [['Beschreibung', 'Menge', 'Betrag']],
        body: [
            [
                String(job.jobname || '') + (job.details ? '\n' + String(job.details) : ''),
                `${job.quantity} Stück`,
                `${netAmountOnly.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [50, 50, 50] },
        styles: { fontSize: 10, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 105 },
            1: { cellWidth: 30 },
            2: { cellWidth: 35, halign: 'right' }
        }
    });

    // Summentabelle
    yPos = /** @type {any} */ (doc).lastAutoTable.finalY + 10;
    /*
    doc.text(`Produzent: ${job.producer}`, 20, yPos);
    yPos += 10;
    */
    // Summentabelle
    autoTable(doc, {
        startY: yPos,
        margin: { left: 20, right: 20 },
        body: [
            ['Nettobetrag', `${netAmountOnly.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`],
            ...(hasShipping ? [
                ['Versandkosten netto', `${shippingNetto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`],
                ['Nettosumme', `${nettosumme.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`]
            ] : []),
            [`MwSt. ${vatRate}%`, `${vatAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`],
            ['Gesamtbetrag', `${grossAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`]
        ],
        styles: { fontSize: 10 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { halign: 'right', cellWidth: 35 }
        },
        theme: 'plain',
        didParseCell: function(data) {
            const lastRowIndex = hasShipping ? 4 : 2;
            if (data.row.index === lastRowIndex) {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // Zahlungsinformationen
    // @ts-ignore - lastAutoTable wird durch Plugin hinzugefügt
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlungsinformationen:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Zahlungsfrist berechnen (heute + 14 Tage)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    const dueDateString = dueDate.toLocaleDateString('de-DE');
    
    const paymentInfo = [
        `Empfänger: ${company.owner || ''}`,
        `IBAN: ${company.iban || ''}`,
        `BIC: ${company.bic || ''}`,
        `Bank: ${company.bank || ''}`,
        '',
        `Zahlbar bis zum ${dueDateString}.`
    ];
    
    yPos += 7;
    paymentInfo.forEach(/** @param {string} line */ (line) => {
        doc.text(line, 20, yPos);
        yPos += 5;
    });

    // QR-Code für SEPA-Überweisung generieren
    try {
        // EPC QR-Code Format für SEPA-Überweisungen
        const epcData = [
            'BCD',                                          // Service Tag
            '002',                                          // Version
            '1',                                            // Character Set (1 = UTF-8)
            'SCT',                                          // Identification (SEPA Credit Transfer)
            company.bic || '',                              // BIC
            company.owner || '',                             // Empfängername
            company.iban || '',                             // IBAN
            `EUR${grossAmount.toFixed(2)}`,                 // Betrag mit Währung
            '',                                             // Purpose (leer)
            '',                                             // Structured Reference (leer)
            `Rechnung ${invoiceNumber}`,                    // Unstructured Remittance (Verwendungszweck)
            ''                                              // Beneficiary to Originator Information
        ].join('\n');

        // QR-Code als Data URL generieren
        const qrDataUrl = await QRCode.toDataURL(epcData, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 200,
            margin: 1
        });

        // QR-Code rechts neben den Zahlungsinformationen platzieren
        const qrSize = 35; // mm
        const qrX = 130; // rechts positioniert
        const qrY = /** @type {any} */ (doc).lastAutoTable.finalY + 15; // gleiche Höhe wie "Zahlungsinformationen:"
        
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        
        // Text unter dem QR-Code
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('QR-Code scannen', qrX + qrSize/2, qrY + qrSize + 4, { align: 'center' });
        doc.text('für Überweisung', qrX + qrSize/2, qrY + qrSize + 8, { align: 'center' });
        doc.setTextColor(0);
    } catch (error) {
        console.warn('QR-Code konnte nicht generiert werden:', error);
    }

    // Fußzeile
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = `${company.name || ''} | ${company.taxId ? 'Steuernr: ' + company.taxId : ''}`;
    doc.text(footerText, 20, pageHeight - 10);

    return doc;
}
