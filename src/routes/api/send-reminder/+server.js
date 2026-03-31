import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';

/** @type {any} */
let db;
/** @type {any} */
let storage;
let isFirebaseInitialized = false;

async function initializeFirebaseAdmin() {
    if (isFirebaseInitialized) return true;

    if (!env.FIREBASE_PRIVATE_KEY || !env.FIREBASE_CLIENT_EMAIL) {
        console.warn('Firebase Admin Credentials nicht verfügbar - überspringe Initialisierung');
        return false;
    }

    try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');
        const { getStorage } = await import('firebase-admin/storage');

        if (getApps().length === 0) {
            let privateKey = env.FIREBASE_PRIVATE_KEY;

            if (env.FIREBASE_PRIVATE_KEY_BASE64) {
                privateKey = Buffer.from(env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
            } else if (privateKey.includes('\\n')) {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }

            if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
                throw new Error('Private Key hat ungültiges Format.');
            }

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
        return true;
    } catch (error) {
        console.error('Fehler bei Firebase Admin Initialisierung:', error);
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
        const initialized = await initializeFirebaseAdmin();
        if (!initialized) {
            return json({ error: 'Firebase Admin konnte nicht initialisiert werden' }, { status: 500 });
        }

        const { job, customer, previewOnly } = await request.json();

        if (!job || !customer) {
            return json({ error: 'Fehlende erforderliche Daten' }, { status: 400 });
        }

        if (!job.invoiceNumber || !job.invoiceDate) {
            return json({ error: 'Rechnungsnummer oder Rechnungsdatum fehlt' }, { status: 400 });
        }

        // Jahr aus invoiceDate ableiten
        const invoiceYear = new Date(job.invoiceDate * 1000).getFullYear().toString();
        const prefix = `invoices/${invoiceYear}/Rechnung_${job.invoiceNumber}_`;

        // PDF aus Firebase Storage holen
        const bucket = storage.bucket();
        const [files] = await bucket.getFiles({ prefix });

        if (files.length === 0) {
            return json({
                error: `Rechnung nicht gefunden. Bitte stellen Sie sicher, dass die Rechnung in Firebase Storage gespeichert ist (Präfix: ${prefix})`
            }, { status: 404 });
        }

        const invoiceFile = files[0];
        const invoiceFileName = invoiceFile.name.split('/').pop();
        const [pdfBuffer] = await invoiceFile.download();

        if (previewOnly) {
            return json({
                pdfBase64: pdfBuffer.toString('base64'),
                fileName: invoiceFileName
            });
        }

        // E-Mail-Adresse bestimmen (gleiche Priorisierung wie bei der Rechnung)
        const selectedContact = job.contactEmail && customer.contacts
            ? customer.contacts.find(/** @param {any} c */ c => c.email === job.contactEmail)
            : null;
        const invoiceEmail = selectedContact?.invoiceMail ||
            customer.invoiceMail ||
            job.billingEmail ||
            job.contactEmail ||
            customer.email;

        if (!invoiceEmail) {
            return json({ error: 'Keine E-Mail-Adresse für den Kunden gefunden' }, { status: 400 });
        }

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

        const salutationName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        const invoiceDateStr = new Date(job.invoiceDate * 1000).toLocaleDateString('de-DE');
        const daysSinceInvoice = Math.floor((Date.now() / 1000 - job.invoiceDate) / 86400);
        const subject = `Zahlungserinnerung: Rechnung Nr. ${job.invoiceNumber} – ${job.jobname}`;

        const text =
            `Sehr geehrte Damen und Herren,\n\n` +
            `wir erlauben uns, Sie freundlich daran zu erinnern, dass die Zahlungsfrist für unsere ` +
            `Rechnung Nr. ${job.invoiceNumber} vom ${invoiceDateStr} ` +
            `(Auftrag: „${job.jobname}") bereits abgelaufen ist.\n\n` +
            `Die vereinbarte Zahlungsfrist betrug 14 Tage. ` +
            `Seit Rechnungsstellung sind nun ${daysSinceInvoice} Tage vergangen.\n\n` +
            `Wir bitten Sie herzlich, den ausstehenden Betrag umgehend auf das in der Rechnung ` +
            `angegebene Konto zu überweisen. Die Rechnung finden Sie erneut im Anhang dieser E-Mail.\n\n` +
            `Falls Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte ` +
            `als gegenstandslos. Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\n` +
            `Mit freundlichen Grüßen\nKai-Uwe Chromik\nChromik Offsetdruck`;

        const html =
            `<!DOCTYPE html><html><head><meta charset="utf-8"><style>` +
            `body{font-family:Arial,sans-serif;line-height:1.6;color:#333}` +
            `.container{max-width:600px;margin:0 auto;padding:20px}` +
            `.header{background:linear-gradient(135deg,#b91c1c 0%,#991b1b 100%);color:white;padding:20px;border-radius:8px;margin-bottom:20px}` +
            `.content{background:#f9f9f9;padding:20px;border-radius:8px}` +
            `.invoice-info{background:#fff;padding:15px;border-left:4px solid #b91c1c;margin:15px 0}` +
            `.overdue{font-size:1.1em;color:#b91c1c;font-weight:bold}` +
            `.footer{margin-top:20px;font-size:0.9em;color:#666}` +
            `.attachment-note{background:#FEF3C7;padding:10px;border-radius:5px;margin-top:15px}` +
            `</style></head><body><div class="container">` +
            `<div class="header"><h2>⚠️ Zahlungserinnerung – Rechnung Nr. ${job.invoiceNumber}</h2></div>` +
            `<div class="content">` +
            `<p>Sehr geehrte Damen und Herren,</p>` +
            `<p>wir erlauben uns, Sie freundlich daran zu erinnern, dass die Zahlungsfrist für unsere ` +
            `Rechnung Nr. <strong>${job.invoiceNumber}</strong> vom ${invoiceDateStr} ` +
            `(Auftrag: „<strong>${job.jobname}</strong>") bereits abgelaufen ist.</p>` +
            `<div class="invoice-info">` +
            `<span class="overdue">⏰ Die Zahlungsfrist betrug 14 Tage.</span><br>` +
            `Seit Rechnungsstellung sind nun <strong>${daysSinceInvoice} Tage</strong> vergangen.` +
            `</div>` +
            `<p>Wir bitten Sie herzlich, den ausstehenden Betrag <strong>umgehend</strong> auf das ` +
            `in der Rechnung angegebene Konto zu überweisen.</p>` +
            `<div class="attachment-note">📎 Die Rechnung finden Sie erneut als PDF-Anhang dieser E-Mail.</div>` +
            `<p>Falls Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte ` +
            `als gegenstandslos. Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.</p>` +
            `</div>` +
            `<div class="footer"><p>Mit freundlichen Grüßen<br><strong>Kai-Uwe Chromik</strong><br>Chromik Offsetdruck</p></div>` +
            `</div></body></html>`;

        await transporter.sendMail({
            from: smtpFrom,
            to: invoiceEmail,
            bcc: 'remindlog@online.de',
            subject,
            text,
            html,
            attachments: [{ filename: invoiceFileName, content: pdfBuffer, contentType: 'application/pdf' }]
        });

        console.log('Mahnung per E-Mail versendet an:', invoiceEmail);
        return json({ success: true, invoiceEmail });

    } catch (error) {
        console.error('Fehler beim Versand der Mahnung:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return json({
            error: 'Fehler beim Versand der Mahnung',
            details: errorMessage
        }, { status: 500 });
    }
}
