# Rechnungsfunktion - Setup und Konfiguration

## Übersicht

Die Rechnungsfunktion ermöglicht das automatische Erstellen und Versenden von PDF-Rechnungen direkt aus der Anwendung heraus.

## Funktionen

- ✅ PDF-Rechnung mit Firmenkopf und Kundendaten
- ✅ Automatische Rechnungsnummerierung
- ✅ Speicherung der PDFs in Firebase Storage
- ✅ E-Mail-Versand mit PDF-Anhang  
- ✅ Unterstützung für separate Rechnungs-E-Mail-Adresse
- ✅ Automatische MwSt-Berechnung

## Benötigte Umgebungsvariablen

Erstellen oder erweitern Sie die `.env` Datei mit folgenden Variablen:

### Firebase Admin (für serverseitige Operationen)

```env
FIREBASE_CLIENT_EMAIL=your-firebase-admin-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Diese Werte finden Sie in der Firebase Console:
1. Gehen Sie zu Project Settings > Service Accounts
2. Klicken Sie auf "Generate New Private Key"
3. Laden Sie die JSON-Datei herunter
4. Kopieren Sie `client_email` und `private_key` in Ihre `.env`

### SMTP (bereits vorhanden für E-Mail-Versand)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

## Firebase-Struktur

### Collection: `company`

Erstellen Sie in Firestore eine Collection `company` mit einem Dokument `companyData`:

```javascript
{
  name: "Chromik Offsetdruck",
  address: "Musterstraße 123",
  zip: "12345",
  city: "Berlin",
  phone: "+49 123 456789",
  email: "info@chromik.de",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
  bank: "Commerzbank",
  taxId: "123/456/78901",
  currentInvoice: 1  // Wird automatisch hochgezählt
}
```

### Collection: `customers`

Erweitern Sie Kundendaten optional mit:

```javascript
{
  // ... bestehende Felder ...
  invoiceMail: "buchhaltung@kunde.de"  // Optional: Separate Rechnungsadresse
}
```

Wenn `invoiceMail` nicht vorhanden ist, wird die normale `email` verwendet.

## Verwendung

### 1. Button in der fertigen Aufträge Liste

In der Liste der fertigen Aufträge gibt es nun einen "Rechnung"-Button (orange) statt dem Checkbox.

### 2. Bestätigungsdialog

Beim Klick öffnet sich ein Modal mit:
- Auftragsdetails
- Kundendaten  
- Ziel-E-Mail-Adresse
- Bestätigung: "Jetzt versenden an [E-Mail]"

### 3. Ablauf nach Bestätigung

1. PDF wird generiert mit:
   - Firmenkopf und Kundendaten
   - Rechnungsnummer aus Firebase
   - Auftragsdetails und Beträge
   - MwSt-Berechnung
   - Zahlungsinformationen

2. PDF wird in Firebase Storage gespeichert:
   - Pfad: `invoices/{userId}/{timestamp}_{filename}.pdf`
   - Signierte URL für 7 Tage

3. E-Mail wird versendet mit:
   - PDF als Anhang
   - Professionellem HTML-Template
   - BCC an versandlog@online.de

4. Job wird aktualisiert:
   - `invoice_ready: true`
   - `invoiceNumber: 123`
   - `invoicePath: "invoices/..."`
   - `invoiceDate: timestamp`

5. Rechnungsnummer wird in Firebase erhöht

## Fehlerbehebung

### "Firmendaten nicht gefunden"
- Erstellen Sie die Collection `company` mit Dokument `companyData` in Firestore

### "SMTP-Credentials fehlen"
- Überprüfen Sie die `.env` Datei auf korrekte SMTP-Einstellungen

### "Kunde konnte nicht gefunden werden"
- Stellen Sie sicher, dass der Job eine gültige `customerId` hat
- Überprüfen Sie, ob der Kunde in der `customers` Collection existiert

### Firebase Admin Fehler
- Stellen Sie sicher, dass `FIREBASE_CLIENT_EMAIL` und `FIREBASE_PRIVATE_KEY` korrekt gesetzt sind
- Der Private Key muss mit Zeilenumbrüchen (`\n`) formatiert sein

## Datenschutz

- PDFs werden verschlüsselt in Firebase Storage gespeichert
- Signierte URLs haben ein Ablaufdatum (7 Tage)
- E-Mails werden über verschlüsselte SMTP-Verbindung versendet
- BCC-Kopie geht an versandlog@online.de für Archivierung

## API-Endpunkte

### POST `/api/create-invoice`

Erstellt eine PDF-Rechnung und speichert sie in Firebase Storage.

**Request Body:**
```json
{
  "job": { /* Job-Objekt */ },
  "customer": { /* Customer-Objekt */ },
  "userId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "invoiceNumber": 123,
  "downloadUrl": "https://...",
  "storagePath": "invoices/...",
  "pdfBase64": "...",
  "fileName": "Rechnung_123_..."
}
```

### POST `/api/send-invoice`

Versendet eine Rechnung per E-Mail mit PDF-Anhang.

**Request Body:**
```json
{
  "customerEmail": "kunde@example.com",
  "customerName": "Firma XY",
  "jobname": "Flyer 1000 Stück",
  "invoiceNumber": 123,
  "amount": "150,00",
  "vatRate": 19,
  "pdfBase64": "...",
  "fileName": "Rechnung_123.pdf"
}
```

## Installierte Pakete

- `jspdf` - PDF-Generierung
- `jspdf-autotable` - Tabellen in PDFs
- `firebase-admin` - Serverseitige Firebase-Operationen
- `nodemailer` - E-Mail-Versand (bereits vorhanden)

## Zukünftige Erweiterungen

Mögliche Verbesserungen:
- [ ] Rechnungsvorlagen-Auswahl
- [ ] Logo-Upload für Firmenkopf
- [ ] Mahnungsfunktion
- [ ] Rechnungsübersicht/Archiv
- [ ] PDF-Download ohne E-Mail-Versand
- [ ] Verschiedene Sprachen für Rechnungen
