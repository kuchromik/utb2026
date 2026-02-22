import nodemailer from 'nodemailer';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * @param {{
 *   request: Request;
 * }} event
 */
export async function POST({ request }) {
    try {
        const { 
            customerEmail, 
            customerName,
            jobname, 
            invoiceNumber,
            amount,
            vatRate,
            pdfBase64,
            fileName
        } = await request.json();

        // Validierung
        if (!customerEmail || !customerName || !jobname || !invoiceNumber || !pdfBase64 || !fileName) {
            return json({ error: 'Fehlende erforderliche Felder' }, { status: 400 });
        }

        // SMTP-Konfiguration aus Umgebungsvariablen
        const smtpHost = env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(env.SMTP_PORT || '587');
        const smtpSecure = env.SMTP_SECURE === 'true';
        const smtpUser = env.SMTP_USER;
        const smtpPass = env.SMTP_PASS;
        const smtpFrom = env.SMTP_FROM || smtpUser;

        // Validierung der SMTP-Credentials
        if (!smtpUser || !smtpPass) {
            console.error('SMTP-Credentials fehlen!');
            return json({ 
                error: 'Server-Konfigurationsfehler', 
                details: 'SMTP-Zugangsdaten nicht konfiguriert' 
            }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        // E-Mail-Inhalt erstellen
        const subject = `Rechnung Nr. ${invoiceNumber} - ${jobname}`;
        
        const text = `
Sehr geehrte/r ${customerName},

anbei erhalten Sie die Rechnung Nr. ${invoiceNumber} für Ihren Auftrag "${jobname}".

Rechnungsbetrag: ${amount} € (inkl. ${vatRate}% MwSt.)

Bitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen auf das in der Rechnung angegebene Konto.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Kai-Uwe Chromik
Chromik Offsetdruck
        `.trim();

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .invoice-info { background: #fff; padding: 15px; border-left: 4px solid #3B82F6; margin: 15px 0; }
        .amount { font-size: 1.2em; color: #059669; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 0.9em; color: #666; }
        .attachment-note { background: #FEF3C7; padding: 10px; border-radius: 5px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📄 Rechnung Nr. ${invoiceNumber}</h2>
        </div>
        <div class="content">
            <p>Sehr geehrte/r <strong>${customerName}</strong>,</p>
            <p>anbei erhalten Sie die Rechnung Nr. <strong>${invoiceNumber}</strong> für Ihren Auftrag "<strong>${jobname}</strong>".</p>
            <div class="invoice-info">
                <strong>Rechnungsbetrag:</strong><br>
                <span class="amount">${amount} € (inkl. ${vatRate}% MwSt.)</span>
            </div>
            <p>Bitte überweisen Sie den Rechnungsbetrag innerhalb von <strong>14 Tagen</strong> auf das in der Rechnung angegebene Konto.</p>
            <div class="attachment-note">
                📎 Die Rechnung finden Sie als PDF-Anhang dieser E-Mail.
            </div>
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        </div>
        <div class="footer">
            <p>Mit freundlichen Grüßen<br>
            <strong>Kai-Uwe Chromik</strong><br>
            Chromik Offsetdruck</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        // E-Mail mit PDF-Anhang senden
        const info = await transporter.sendMail({
            from: smtpFrom,
            to: customerEmail,
            bcc: 'versandlog@online.de',
            subject: subject,
            text: text,
            html: html,
            attachments: [
                {
                    filename: fileName,
                    content: pdfBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf'
                }
            ]
        });

        return json({ 
            success: true, 
            messageId: info.messageId,
            message: 'Rechnung erfolgreich per E-Mail versendet' 
        });

    } catch (error) {
        console.error('Fehler beim Rechnungsversand:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return json({ 
            error: 'Rechnung konnte nicht versendet werden', 
            details: errorMessage
        }, { status: 500 });
    }
}
