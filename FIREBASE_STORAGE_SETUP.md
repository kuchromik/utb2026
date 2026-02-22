# Firebase Storage Setup

## Problem: "The specified bucket does not exist"

Dieser Fehler tritt auf, wenn Firebase Storage nicht aktiviert oder der Bucket nicht konfiguriert ist.

## Lösung: Firebase Storage aktivieren

### Schritt 1: Firebase Storage in der Console aktivieren

1. Gehen Sie zur [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt (z.B. "codutb-38c1e")
3. Klicken Sie im linken Menü auf **Storage**
4. Falls noch nicht aktiviert, klicken Sie auf **Get Started**
5. Wählen Sie:
   - **Start in production mode** (wir konfigurieren später die Security Rules)
   - Wählen Sie die Location (z.B. `europe-west3` für Deutschland)
6. Klicken Sie auf **Done**

### Schritt 2: Storage Bucket Name überprüfen

Nach der Aktivierung sollte Ihr Bucket Name sichtbar sein:
- Format: `your-project-id.appspot.com`
- Beispiel: `codutb-38c1e.appspot.com`

### Schritt 3: Umgebungsvariablen überprüfen

#### Lokale Entwicklung (.env)

```env
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
```

⚠️ **Wichtig:** Der Wert sollte NUR der Bucket-Name sein, NICHT eine vollständige URL.

**Richtig:**
```env
VITE_FIREBASE_STORAGE_BUCKET="codutb-38c1e.appspot.com"
```

**Falsch:**
```env
VITE_FIREBASE_STORAGE_BUCKET="gs://codutb-38c1e.appspot.com"
VITE_FIREBASE_STORAGE_BUCKET="https://firebasestorage.googleapis.com/..."
```

#### Vercel Deployment

1. Gehen Sie zu [Vercel Dashboard](https://vercel.com/)
2. Ihr Projekt → **Settings** → **Environment Variables**
3. Überprüfen Sie `VITE_FIREBASE_STORAGE_BUCKET`:
   - Wert: `codutb-38c1e.appspot.com` (Ihr Bucket-Name)
   - ✅ Alle Umgebungen ausgewählt

### Schritt 4: Storage Security Rules konfigurieren

Für die Rechnungsfunktion müssen die Storage Rules angepasst werden:

1. Firebase Console → Storage → **Rules** Tab
2. Ersetzen Sie die Rules mit:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Invoices - nur authentifizierte Benutzer können schreiben
    match /invoices/{userId}/{fileName} {
      // Lesen und Schreiben nur für authentifizierte Benutzer
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Nur PDF-Dateien erlauben
      allow write: if request.resource.contentType == 'application/pdf';
    }
    
    // Alle anderen Pfade blockieren
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Klicken Sie auf **Publish**

### Schritt 5: Deployment testen

Nach dem Setup:

1. Warten Sie auf das nächste Vercel Deployment (~1-2 Min)
2. Öffnen Sie https://utb2026.vercel.app
3. Versuchen Sie, eine Rechnung zu erstellen
4. Prüfen Sie die Vercel Function Logs für:
   ```
   Initialisiere Firebase Admin...
   Storage Bucket: codutb-38c1e.appspot.com
   Lade PDF in Firebase Storage hoch...
   PDF erfolgreich hochgeladen
   ```

## Troubleshooting

### Fehler: "The specified bucket does not exist"

**Checkliste:**
- ✅ Firebase Storage in der Console aktiviert
- ✅ `VITE_FIREBASE_STORAGE_BUCKET` in Vercel gesetzt
- ✅ Bucket Name ist korrekt (ohne `gs://` Präfix)
- ✅ Service Account hat Storage-Berechtigungen

### Service Account Berechtigungen prüfen

1. Firebase Console → Project Settings → Service Accounts
2. Ihr Service Account sollte die Rolle **Firebase Admin** oder **Storage Admin** haben
3. Falls nicht:
   - Gehen Sie zur [Google Cloud Console](https://console.cloud.google.com/)
   - IAM & Admin → IAM
   - Suchen Sie Ihren Service Account
   - Klicken Sie auf **Edit** (Stift-Symbol)
   - Fügen Sie Rolle hinzu: **Storage Admin**

### Bucket Name herausfinden

**Option 1: Firebase Console**
- Storage → Files Tab
- URL zeigt: `gs://your-project-id.appspot.com`
- Bucket Name: `your-project-id.appspot.com`

**Option 2: Firebase Config**
- Project Settings → General
- Unter "Your apps" → Web app
- `storageBucket: "your-project-id.appspot.com"`

### Vercel Logs prüfen

1. Vercel Dashboard → Deployments
2. Neueste Deployment → Functions
3. Klicken Sie auf `/api/create-invoice`
4. Suchen Sie nach: `Storage Bucket: ...`

Der geloggte Bucket Name sollte mit dem in der Firebase Console übereinstimmen.

## Erwartetes Ergebnis

Nach erfolgreicher Konfiguration:

1. ✅ PDF wird in Firebase Storage gespeichert unter: `invoices/{userId}/{timestamp}_Rechnung_{number}.pdf`
2. ✅ Download-URL wird generiert (7 Tage gültig)
3. ✅ PDF wird per E-Mail versendet
4. ✅ Job wird als `invoice_ready` markiert

In Firebase Storage sollten Sie sehen:
```
📁 invoices/
  📁 {userId}/
    📄 1708876543_Rechnung_1_Flyer_A5.pdf
    📄 1708876789_Rechnung_2_Visitenkarten.pdf
```

## Sicherheitshinweise

⚠️ **Wichtig:**
- Storage Rules sollten nur authentifizierten Benutzern Zugriff gewähren
- Jeder Benutzer sollte nur auf seine eigenen Rechnungen zugreifen können
- PDFs sollten nicht öffentlich lesbar sein
- Regelmäßig alte Rechnungen archivieren/löschen

## Alternative: Storage Rules deaktivieren (nur für Tests!)

**NUR für Testzwecke** können Sie temporär offene Rules setzen:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **NICHT für Production verwenden!** Dies erlaubt jedem authentifizierten Benutzer Zugriff auf alle Dateien.
