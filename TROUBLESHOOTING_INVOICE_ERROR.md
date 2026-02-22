# Lösung: Rechnungsversand Fehler "DECODER routines::unsupported"

## Problem
Der Rechnungsversand schlägt mit folgendem Fehler fehl:
```
Error: 2 UNKNOWN: Getting metadata from plugin failed with error: 
error:1E08010C:DECODER routines::unsupported
```

## Ursache
Der Firebase Private Key wird in der Serverless-Umgebung (Vercel) nicht korrekt dekodiert. Dies ist ein bekanntes Problem mit multiline Strings in Umgebungsvariablen.

## Lösung

### Schritt 1: Service Account Key bereitstellen
Stellen Sie sicher, dass Sie die Firebase Service Account JSON-Datei haben:
- Firebase Console → Project Settings → Service Accounts
- "Generate New Private Key" klicken
- JSON-Datei herunterladen (z.B. `serviceAccountKey.json`)

### Schritt 2: Private Key konvertieren
Führen Sie das bereitgestellte PowerShell-Script aus:

```powershell
.\convert-firebase-key.ps1 -JsonPath .\serviceAccountKey.json
```

Das Script zeigt Ihnen:
- `FIREBASE_CLIENT_EMAIL` - Ihre Service Account E-Mail
- `FIREBASE_PRIVATE_KEY_BASE64` - Base64-kodierter Private Key (wird automatisch in Zwischenablage kopiert)

### Schritt 3: Umgebungsvariablen in Vercel setzen

1. Gehen Sie zu Ihrem Vercel-Projekt
2. **Settings** → **Environment Variables**
3. Fügen Sie folgende Variablen hinzu:

**Variable 1:**
- **Key:** `FIREBASE_CLIENT_EMAIL`
- **Value:** (Aus dem Script, z.B.: `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com`)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

**Variable 2:**
- **Key:** `FIREBASE_PRIVATE_KEY_BASE64`
- **Value:** (Der lange Base64-String aus dem Script oder Zwischenablage)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

### Schritt 4: Code-Update
Der Code wurde bereits aktualisiert, um die Base64-Variable zu unterstützen:
- `src/routes/api/create-invoice/+server.js` erkennt automatisch `FIREBASE_PRIVATE_KEY_BASE64`
- Dekodiert den Base64-String automatisch
- Besseres Error-Logging für Debugging

### Schritt 5: Deployment
1. Commit und Push der Code-Änderungen (falls nicht bereits geschehen)
2. In Vercel wird automatisch ein neues Deployment gestartet
3. Oder: Manueller Redeploy in Vercel Dashboard

### Schritt 6: Testen
1. Öffnen Sie Ihre App
2. Versuchen Sie, eine Rechnung zu versenden
3. Prüfen Sie die Vercel Logs unter **Deployments → Functions**

## Lokale Entwicklung
Für lokale Entwicklung erstellen/aktualisieren Sie Ihre `.env` Datei:

```env
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

Lokal funktioniert auch die direkte Methode mit `\n` Escape-Sequenzen.

## Überprüfung

### In Vercel Logs suchen Sie nach:
✅ Erfolgreich: 
```
Initialisiere Firebase Admin...
Firebase Admin erfolgreich initialisiert
```

❌ Fehler:
```
Fehler bei Firebase Admin Initialisierung
```

### Häufige Probleme:

**Problem:** Variable nicht gesetzt
```
Firebase Admin Credentials nicht verfügbar - überspringe Initialisierung
```
**Lösung:** Stellen Sie sicher, dass `FIREBASE_CLIENT_EMAIL` und `FIREBASE_PRIVATE_KEY_BASE64` beide gesetzt sind

**Problem:** Base64-String ist ungültig
```
Private Key hat ungültiges Format
```
**Lösung:** Führen Sie das Script erneut aus und kopieren Sie den kompletten Base64-String

**Problem:** Umgebung nicht ausgewählt
```
Variable ist undefined in Production
```
**Lösung:** In Vercel Environment Variables müssen ALLE Umgebungen ausgewählt sein

## Zusätzliche Debugging-Schritte

Falls der Fehler weiterhin auftritt, fügen Sie vorübergehend Debug-Logs hinzu:

1. Öffnen Sie Vercel Logs (Real-time Logs im Dashboard)
2. Reproduzieren Sie den Fehler
3. Suchen Sie nach den Log-Einträgen von `Initialisiere Firebase Admin...`
4. Die Logs zeigen jetzt auch:
   - Project ID
   - Client Email  
   - Erste 50 Zeichen des Private Keys (zur Verifikation)

## Wichtige Hinweise

⚠️ **Sicherheit:**
- Committen Sie NIEMALS die Service Account JSON-Datei
- Teilen Sie den Private Key nicht öffentlich
- `.env` sollte in `.gitignore` stehen

✅ **Best Practices:**
- Verwenden Sie unterschiedliche Service Accounts für Production/Development
- Rotieren Sie Keys regelmäßig
- Geben Sie dem Service Account nur minimal benötigte Berechtigungen

## Support-Informationen

Bei weiteren Problemen:
1. Prüfen Sie die Vercel Function Logs
2. Prüfen Sie die Firebase Console → Usage
3. Verifizieren Sie, dass der Service Account die Berechtigung für Firestore und Storage hat
4. Siehe auch: [FIREBASE_ADMIN_SETUP.md](./FIREBASE_ADMIN_SETUP.md) für detaillierte Informationen
