# Firebase Admin Setup für Vercel/Serverless Deployment

## Häufige Fehler und Lösungen

### "Invalid PEM formatted message" oder "DECODER routines::unsupported"

Diese Fehler treten auf, wenn der Firebase Private Key nicht korrekt formatiert ist oder in Serverless-Umgebungen falsch interpretiert wird.

## Setup-Anleitung

### 1. Private Key aus Firebase Console herunterladen

1. Gehen Sie zur [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **Project Settings** (⚙️) → **Service Accounts**
4. Klicken Sie auf **Generate New Private Key**
5. Laden Sie die JSON-Datei herunter (z.B. `serviceAccountKey.json`)

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

**WICHTIG für lokale Entwicklung:** 
- Verwenden Sie `\n` für Zeilenumbrüche (nicht echte Zeilenumbrüche!)
- Der gesamte Key muss in Anführungszeichen stehen
- Kopieren Sie den kompletten `private_key` Wert aus der JSON-Datei

#### Für Vercel/Serverless Deployment

Die korrekte Konfiguration in Vercel ist KRITISCH für die Funktion.

1. Gehen Sie zu Ihrem Vercel-Projekt
2. Settings → Environment Variables
3. Fügen Sie hinzu:

**FIREBASE_CLIENT_EMAIL:**
```
firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```
(Ohne Anführungszeichen)

**FIREBASE_PRIVATE_KEY - Methode 1 (Empfohlen für Vercel):**

Verwenden Sie Base64-Encoding für maximale Kompatibilität:

1. Erstellen Sie eine Variable: `FIREBASE_PRIVATE_KEY_BASE64`
2. Wert: Base64-kodierter Private Key (siehe Script unten)

```bash
# PowerShell - Private Key in Base64 konvertieren:
$serviceAccount = Get-Content .\serviceAccountKey.json | ConvertFrom-Json
$privateKey = $serviceAccount.private_key
$bytes = [System.Text.Encoding]::UTF8.GetBytes($privateKey)
$base64 = [System.Convert]::ToBase64String($bytes)
Write-Output $base64
```

**FIREBASE_PRIVATE_KEY - Methode 2 (Alternative):**

Falls Base64 nicht funktioniert, versuchen Sie:

1. Öffnen Sie die `serviceAccountKey.json`
2. Kopieren Sie den GESAMTEN `private_key` Wert (inkl. `-----BEGIN PRIVATE KEY-----\n...`)
3. Fügen Sie ihn DIREKT in Vercel ein (mit den `\n` escape sequences)

Beispiel:
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```

**WICHTIG:**
- Entfernen Sie KEINE `\n` Zeichen aus dem Key
- Der Key muss `-----BEGIN PRIVATE KEY-----` und `-----END PRIVATE KEY-----` enthalten
- Setzen Sie die Umgebungsvariable für: Production, Preview, und Development

### 3. Script zum Konvertieren und Testen

#### PowerShell Script: Convert und Base64 Encoding

Erstellen Sie eine Datei `convert-firebase-key.ps1`:

```powershell
# convert-firebase-key.ps1
# Liest die Firebase Service Account JSON und gibt die Credentials aus

param(
    [string]$JsonPath = ".\serviceAccountKey.json"
)

if (-not (Test-Path $JsonPath)) {
    Write-Error "Datei nicht gefunden: $JsonPath"
    exit 1
}

$serviceAccount = Get-Content $JsonPath | ConvertFrom-Json

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "FIREBASE CREDENTIALS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "FIREBASE_CLIENT_EMAIL:" -ForegroundColor Yellow
Write-Host $serviceAccount.client_email
Write-Host ""

Write-Host "FIREBASE_PRIVATE_KEY (für .env):" -ForegroundColor Yellow
Write-Host "`"$($serviceAccount.private_key)`""
Write-Host ""

Write-Host "FIREBASE_PRIVATE_KEY_BASE64 (für Vercel - EMPFOHLEN):" -ForegroundColor Green
$privateKeyBytes = [System.Text.Encoding]::UTF8.GetBytes($serviceAccount.private_key)
$base64Key = [System.Convert]::ToBase64String($privateKeyBytes)
Write-Host $base64Key
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup-Anweisungen:" -ForegroundColor Cyan
Write-Host "1. Kopieren Sie FIREBASE_CLIENT_EMAIL in Ihre Umgebungsvariablen" -ForegroundColor White
Write-Host "2. Für LOKALE Entwicklung: Nutzen Sie FIREBASE_PRIVATE_KEY" -ForegroundColor White
Write-Host "3. Für VERCEL: Nutzen Sie FIREBASE_PRIVATE_KEY_BASE64" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan
```

**Verwendung:**
```powershell
.\convert-firebase-key.ps1 -JsonPath ".\path\to\serviceAccountKey.json"
```

#### Node.js Alternative:

```javascript
// convert-key.js
const fs = require('fs');

const jsonPath = process.argv[2] || './serviceAccountKey.json';

if (!fs.existsSync(jsonPath)) {
    console.error(`Datei nicht gefunden: ${jsonPath}`);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('\n========================================');
console.log('FIREBASE CREDENTIALS');
console.log('========================================\n');

console.log('FIREBASE_CLIENT_EMAIL:');
console.log(serviceAccount.client_email);
console.log('');

console.log('FIREBASE_PRIVATE_KEY (für .env):');
console.log(`"${serviceAccount.private_key}"`);
console.log('');

console.log('FIREBASE_PRIVATE_KEY_BASE64 (für Vercel - EMPFOHLEN):');
const base64Key = Buffer.from(serviceAccount.private_key, 'utf8').toString('base64');
console.log(base64Key);
console.log('');

console.log('========================================');
console.log('Setup-Anweisungen:');
console.log('1. Kopieren Sie FIREBASE_CLIENT_EMAIL');
console.log('2. Für LOKALE Entwicklung: FIREBASE_PRIVATE_KEY');
console.log('3. Für VERCEL: FIREBASE_PRIVATE_KEY_BASE64');
console.log('========================================\n');
```

**Verwendung:**
```bash
node convert-key.js ./serviceAccountKey.json
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

### Fehler: "DECODER routines::unsupported" oder "Getting metadata from plugin failed"

Dieser Fehler tritt in Serverless-Umgebungen auf, wenn der Private Key falsch formatiert ist.

**Lösung:**
1. Verwenden Sie die **Base64-Methode** (siehe Methode 1 oben)
2. Erstellen Sie in Vercel die Variable `FIREBASE_PRIVATE_KEY_BASE64` statt `FIREBASE_PRIVATE_KEY`
3. Nutzen Sie das PowerShell-Script `convert-firebase-key.ps1` zum Konvertieren
4. Der Code erkennt automatisch die Base64-Variable und dekodiert sie
5. Stellen Sie sicher, dass die Variable für ALLE Umgebungen gesetzt ist (Production, Preview, Development)

**Schritt-für-Schritt für Vercel:**
```powershell
# 1. Führen Sie das Konvertierungs-Script aus
.\convert-firebase-key.ps1 -JsonPath .\serviceAccountKey.json

# 2. Kopieren Sie den FIREBASE_PRIVATE_KEY_BASE64 Wert (wird automatisch in Zwischenablage kopiert)

# 3. In Vercel:
#    - Settings → Environment Variables
#    - Erstellen Sie: FIREBASE_PRIVATE_KEY_BASE64
#    - Fügen Sie den kopierten Base64-String ein
#    - Wählen Sie ALLE Umgebungen aus
#    - Erstellen Sie auch: FIREBASE_CLIENT_EMAIL

# 4. Redeploy Ihrer Anwendung
```

### Fehler: "Invalid PEM formatted message"
- ✅ Stellen Sie sicher, dass der Private Key `-----BEGIN PRIVATE KEY-----` und `-----END PRIVATE KEY-----` enthält
- ✅ Verwenden Sie `\n` für Zeilenumbrüche (wenn in einer Zeile)
- ✅ Keine zusätzlichen Leerzeichen am Anfang/Ende
- ✅ In Vercel: Verwenden Sie die Base64-Methode (empfohlen)

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
