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
        const { customerEmail, customerFirstName, customerLastName, contactEmail, contacts, jobname, toShip, shipDate } = await request.json();

        // Validierung
        if (!customerEmail || !customerFirstName || !customerLastName || !jobname || !shipDate) {
            return json({ error: 'Fehlende erforderliche Felder' }, { status: 400 });
        }

        // Abweichenden Ansprechpartner per contactEmail in contacts suchen
        let recipientEmail = customerEmail;
        let recipientFirstName = customerFirstName;
        let recipientLastName = customerLastName;

        if (contactEmail && Array.isArray(contacts) && contacts.length > 0) {
            const contact = contacts.find(c => c.email === contactEmail);
            if (contact) {
                recipientEmail = contact.email;
                recipientFirstName = contact.firstName;
                recipientLastName = contact.lastName;
            }
        }

        // SMTP-Konfiguration aus Umgebungsvariablen
        const smtpHost = env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(env.SMTP_PORT || '587');
        const smtpSecure = env.SMTP_SECURE === 'true';
        const smtpUser = env.SMTP_USER;
        const smtpPass = env.SMTP_PASS;
        const smtpFrom = env.SMTP_FROM || smtpUser;

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

        // Datum in deutsches Format umwandeln (YYYY-MM-DD -> DD.MM.YYYY)
        const [year, month, day] = String(shipDate).split('-');
        const shipDateFormatted = `${day}.${month}.${year}`;

        let subject, text, html;

        if (toShip) {
            subject = `Ihre Druckdaten sind geprüft – Versand am ${shipDateFormatted} – ${jobname}`;
            text = `
Hallo ${recipientFirstName} ${recipientLastName},

wir haben Ihre Druckdaten für den Auftrag „${jobname}" geprüft und alles ist in Ordnung.

Ihre Bestellung wird voraussichtlich am ${shipDateFormatted} versendet.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Kai-Uwe Chromik
            `.trim();

            html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .date-box { background: #fff; padding: 15px; border-left: 4px solid #22c55e; margin: 15px 0; font-size: 1.1em; }
        .footer { margin-top: 20px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>✅ Druckdaten geprüft</h2>
        </div>
        <div class="content">
            <p>Hallo <strong>${recipientFirstName} ${recipientLastName}</strong>,</p>
            <p>wir haben Ihre Druckdaten für den Auftrag „<strong>${jobname}</strong>" geprüft und alles ist in Ordnung.</p>
            <div class="date-box">
                <strong>📦 Voraussichtlicher Versand:</strong> ${shipDateFormatted}
            </div>
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        </div>
        <div class="footer">
            <p>Mit freundlichen Grüßen<br>Kai-Uwe Chromik</p>
        </div>
    </div>
</body>
</html>
            `.trim();
        } else {
            subject = `Ihre Druckdaten sind geprüft – Abholung ab ${shipDateFormatted} – ${jobname}`;
            text = `
Hallo ${recipientFirstName} ${recipientLastName},

wir haben Ihre Druckdaten für den Auftrag „${jobname}" geprüft und alles ist in Ordnung.

Ihre Bestellung steht ab dem ${shipDateFormatted} während unserer Öffnungszeiten zur Abholung bereit.

Unsere Öffnungszeiten:
Montag - Donnerstag: 9:00 - 15:00 Uhr oder nach Absprache

Wir freuen uns auf Ihren Besuch!

Mit freundlichen Grüßen
Kai-Uwe Chromik
            `.trim();

            html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .date-box { background: #fff; padding: 15px; border-left: 4px solid #22c55e; margin: 15px 0; font-size: 1.1em; }
        .hours { background: #fff; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>✅ Druckdaten geprüft</h2>
        </div>
        <div class="content">
            <p>Hallo <strong>${recipientFirstName} ${recipientLastName}</strong>,</p>
            <p>wir haben Ihre Druckdaten für den Auftrag „<strong>${jobname}</strong>" geprüft und alles ist in Ordnung.</p>
            <div class="date-box">
                <strong>🏪 Abholbereit ab:</strong> ${shipDateFormatted}
            </div>
            <div class="hours">
                <strong>Unsere Öffnungszeiten:</strong><br>
                Montag - Donnerstag: 9:00 - 15:00 Uhr oder nach Absprache
            </div>
            <p>Wir freuen uns auf Ihren Besuch!</p>
        </div>
        <div class="footer">
            <p>Mit freundlichen Grüßen<br>Kai-Uwe Chromik</p>
        </div>
    </div>
</body>
</html>
            `.trim();
        }

        const info = await transporter.sendMail({
            from: smtpFrom,
            to: recipientEmail,
            bcc: 'datachecklog@online.de',
            subject: subject,
            text: text,
            html: html
        });

        return json({
            success: true,
            messageId: info.messageId,
            message: 'E-Mail erfolgreich versendet'
        });

    } catch (error) {
        console.error('Fehler beim E-Mail-Versand (Datenprüfung):', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return json({
            error: 'E-Mail konnte nicht versendet werden',
            details: errorMessage
        }, { status: 500 });
    }
}
