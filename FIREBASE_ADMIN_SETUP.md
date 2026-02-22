# Firebase Admin Setup für Vercel Deployment

## Problem: "Invalid PEM formatted message" Fehler

Dieser Fehler tritt auf, wenn der Firebase Private Key nicht korrekt formatiert ist.

## Lösung: Private Key richtig formatieren

### 1. Private Key aus Firebase Console herunterladen

1. Gehen Sie zur [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **Project Settings** (⚙️) → **Service Accounts**
4. Klicken Sie auf **Generate New Private Key**
5. Laden Sie die JSON-Datei herunter

Die Datei sieht so aus:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 2. Umgebungsvariablen konfigurieren

#### Für lokale Entwicklung (.env)

Erstellen/Bearbeiten Sie `.env`:

```env
# Firebase Admin Credentials
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----\n"

# Wichtig: Der Private Key muss in Anführungszeichen stehen und \n für Zeilenumbrüche enthalten
```

**WICHTIG:** 
- Verwenden Sie `\n` für Zeilenumbrüche (nicht echte Zeilenumbrüche!)
- Der gesamte Key muss in Anführungszeichen stehen
- Kopieren Sie den kompletten `private_key` Wert aus der JSON-Datei

#### Für Vercel Deployment

1. Gehen Sie zu Ihrem Vercel-Projekt
2. Settings → Environment Variables
3. Fügen Sie hinzu:

**FIREBASE_CLIENT_EMAIL:**
```
firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

**FIREBASE_PRIVATE_KEY:**

**Option A - Direkt (empfohlen):**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
[mehrere Zeilen]
...
-----END PRIVATE KEY-----
```
Kopieren Sie den gesamten Private Key MIT den `-----BEGIN/END PRIVATE KEY-----` Zeilen.

**Option B - Als escaped String:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```

### 3. Script zum Konvertieren

Falls Sie den Private Key aus der JSON-Datei kopieren möchten:

**Node.js Script (convert-key.js):**
```javascript
const fs = require('fs');

// Lesen Sie die heruntergeladene JSON-Datei
const serviceAccount = JSON.parse(
  fs.readFileSync('./path-to-your-service-account.json', 'utf8')
);

console.log('FIREBASE_CLIENT_EMAIL:');
console.log(serviceAccount.client_email);
console.log('\nFIREBASE_PRIVATE_KEY:');
console.log(serviceAccount.private_key);
console.log('\n--- Für .env Datei (mit escaped \\n) ---');
console.log(`FIREBASE_PRIVATE_KEY="${serviceAccount.private_key}"`);
```

Ausführen:
```bash
node convert-key.js
```

### 4. Testen der Konfiguration

Nach dem Setzen der Umgebungsvariablen:

**Lokal:**
```bash
npm run dev
```

**Vercel:**
1. Commit und Push Ihre Änderungen
2. Vercel deployed automatisch
3. Prüfen Sie die Build-Logs in Vercel Dashboard

## Troubleshooting

### Fehler: "Invalid PEM formatted message"
- ✅ Stellen Sie sicher, dass der Private Key `-----BEGIN PRIVATE KEY-----` und `-----END PRIVATE KEY-----` enthält
- ✅ Verwenden Sie `\n` für Zeilenumbrüche (wenn in einer Zeile)
- ✅ Keine zusätzlichen Leerzeichen am Anfang/Ende
- ✅ In Vercel: Verwenden Sie die Plain-Text-Ansicht beim Einfügen

### Fehler: "Firebase Admin konnte nicht initialisiert werden"
- ✅ Überprüfen Sie ob `FIREBASE_CLIENT_EMAIL` gesetzt ist
- ✅ Überprüfen Sie ob `FIREBASE_PRIVATE_KEY` gesetzt ist
- ✅ Überprüfen Sie ob `VITE_FIREBASE_PROJECT_ID` gesetzt ist
- ✅ Überprüfen Sie ob `VITE_FIREBASE_STORAGE_BUCKET` gesetzt ist

### Build schlägt fehl
- ✅ Die neue Implementierung überspringt die Firebase-Initialisierung während des Builds
- ✅ Firebase Admin wird nur zur Laufzeit (bei API-Aufrufen) initialisiert
- ✅ Wenn der Build trotzdem fehlschlägt, prüfen Sie die Build-Logs

### Private Key wird nicht erkannt
```bash
# Testen Sie in Node.js:
node -e "console.log(process.env.FIREBASE_PRIVATE_KEY)"
```

Sollte den vollständigen Key anzeigen mit `\n` Zeichen.

## Best Practices

1. **Nie** den Private Key im Code committen
2. **.gitignore** sollte `.env` enthalten
3. Verwenden Sie unterschiedliche Service Accounts für Production/Development
4. Rotieren Sie den Private Key regelmäßig
5. Service Account sollte nur minimal benötigte Berechtigungen haben

## Benötigte Umgebungsvariablen (Checkliste)

Für die Rechnungsfunktion benötigen Sie:

```env
# Firebase Client (bereits vorhanden)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Firebase Admin (NEU für Rechnungen)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# SMTP (bereits vorhanden)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

## Verifizierung

Nach dem Setup sollten Sie:

1. ✅ Build erfolgreich (lokal: `npm run build`)
2. ✅ Dev-Server startet (lokal: `npm run dev`)
3. ✅ API-Endpunkt funktioniert (Test mit Rechnung-Button)
4. ✅ Vercel Deployment erfolgreich

Bei Problemen, prüfen Sie die Logs:
- Lokal: Terminal-Ausgabe
- Vercel: Deployment-Logs im Dashboard
