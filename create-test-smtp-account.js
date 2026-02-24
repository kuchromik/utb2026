// create-test-smtp-account.js
// Erstellt einen temporären Ethereal Email Test-Account

import nodemailer from 'nodemailer';

async function createTestAccount() {
    try {
        const testAccount = await nodemailer.createTestAccount();
        
        console.log('\n========================================');
        console.log('ETHEREAL EMAIL TEST ACCOUNT');
        console.log('========================================\n');
        
        console.log('Für Tests fügen Sie diese Werte in Ihre .env.local ein:\n');
        console.log('SMTP_HOST=' + testAccount.smtp.host);
        console.log('SMTP_PORT=' + testAccount.smtp.port);
        console.log('SMTP_SECURE=false');
        console.log('SMTP_USER=' + testAccount.user);
        console.log('SMTP_PASS=' + testAccount.pass);
        console.log('SMTP_FROM=' + testAccount.user);
        
        console.log('\n========================================');
        console.log('WICHTIG:');
        console.log('- E-Mails werden NICHT wirklich versendet');
        console.log('- Sie können alle Test-Mails hier ansehen:');
        console.log('  https://ethereal.email/messages');
        console.log('- Login mit: ' + testAccount.user);
        console.log('- Passwort: ' + testAccount.pass);
        console.log('========================================\n');
        
    } catch (error) {
        console.error('Fehler beim Erstellen des Test-Accounts:', error);
    }
}

createTestAccount();
