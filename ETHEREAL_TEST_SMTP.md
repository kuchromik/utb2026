# Ethereal Email Test-Zugang

## Zugriff auf Test-Mails

**URL:** https://ethereal.email/messages

**Login:**
- E-Mail: ivxodpgbafhebyli@ethereal.email
- Passwort: qj1ZcBUDE5g3N3ZeJS

## Was ist Ethereal?

Ethereal.email ist ein Test-SMTP-Service:
- ✅ E-Mails werden NICHT wirklich versendet
- ✅ Keine Rate-Limits
- ✅ Unbegrenzte Test-Mails
- ✅ PDF-Anhänge funktionieren
- ✅ Ansicht im Web-Interface

## Verwendung

**Lokal (npm run dev):**
- `.env.local` wird automatisch verwendet
- Alle E-Mails gehen an Ethereal

**Vercel (Production):**
- `.env` (1&1) wird verwendet
- E-Mails werden wirklich versendet

## Neuen Test-Account erstellen

Falls Sie einen neuen Account benötigen:
```bash
node create-test-smtp-account.js
```

Aktualisieren Sie dann die Werte in `.env.local`.
