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
        const { customerEmail, customerFirstName, customerLastName, jobname, toShip, trackingNumber } = await request.json();

        // Validierung
        if (!customerEmail || !customerFirstName || !customerLastName || !jobname) {
            return json({ error: 'Fehlende erforderliche Felder' }, { status: 400 });
        }

        if (toShip && !trackingNumber) {
            return json({ error: 'Sendungsverfolgungsnummer ist erforderlich' }, { status: 400 });
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

        console.log('SMTP-Konfiguration:', {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            user: smtpUser,
            hasPassword: !!smtpPass
        });

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
        let subject, text, html;

        if (toShip) {
            subject = `Ihre Bestellung wurde versendet - ${jobname}`;
            text = `
Hallo ${customerFirstName} ${customerLastName},

Ihre Bestellung "${jobname}" wurde erfolgreich versendet.

Link zur Sendungsverfolgung: ${trackingNumber}

Bitte beachten Sie, dass es einige Stunden dauern kann, bis der Paketdienst einen konkreten Liefertermin bereitstellt.

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
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .tracking { background: #fff; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; font-family: monospace; }
        .footer { margin-top: 20px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Ihre Bestellung wurde versendet</h2>
        </div>
        <div class="content">
            <p>Hallo <strong>${customerFirstName} ${customerLastName}</strong>,</p>
            <p>Ihre Bestellung "<strong>${jobname}</strong>" wurde erfolgreich versendet.</p>
            <div class="tracking">
                <strong>Link zur Sendungsverfolgung:</strong><br>
                <a href="${trackingNumber}" target="_blank" style="color: #667eea; text-decoration: none; font-weight: bold;">${trackingNumber}</a>
            </div>
            <p>Bitte beachten Sie, dass es einige Stunden dauern kann, bis der Paketdienst einen konkreten Liefertermin bereitstellt.</p>
        </div>
        <div class="footer">
            <p>Mit freundlichen Grüßen<br>Kai-Uwe Chromik</p>
        </div>
    </div>
</body>
</html>
            `.trim();
        } else {
            subject = `Ihre Bestellung ist abholbereit - ${jobname}`;
            text = `
Hallo ${customerFirstName} ${customerLastName},

Ihre Bestellung "${jobname}" ist fertiggestellt und kann während unserer Öffnungszeiten abgeholt werden.

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
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .hours { background: #fff; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Ihre Bestellung ist abholbereit</h2>
        </div>
        <div class="content">
            <p>Hallo <strong>${customerFirstName} ${customerLastName}</strong>,</p>
            <p>Ihre Bestellung "<strong>${jobname}</strong>" ist fertiggestellt und kann während unserer Öffnungszeiten abgeholt werden.</p>
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

        // E-Mail senden (mit BCC-Kopie an Versandlog)
        const info = await transporter.sendMail({
            from: smtpFrom,
            to: customerEmail,
            bcc: 'versandlog@online.de',
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
        console.error('Fehler beim E-Mail-Versand:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return json({ 
            error: 'E-Mail konnte nicht versendet werden', 
            details: errorMessage
        }, { status: 500 });
    }
}
