# Firestore Security Rules - Deployment Anleitung

## Wichtig: Diese Rules müssen in Firebase Console deployed werden!

Die Datei `firestore.rules` enthält die Sicherheitsregeln für Ihre Firestore-Datenbank. Diese Rules sind **kritisch** für die Sicherheit Ihrer Anwendung.

## Was die aktuellen Rules tun:

1. **Nur authentifizierte Benutzer** können auf die Datenbank zugreifen
2. **Customer Collection**: Nur angemeldete User können Kunden lesen/schreiben
3. **Jobs Collection**: Nur angemeldete User können Jobs lesen/schreiben
4. Alle anderen Dokumente sind standardmäßig gesperrt

## Deployment-Schritte:

### Option 1: Über Firebase Console (Empfohlen)

1. Öffnen Sie die [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt: `codutb-38c1e`
3. Navigieren Sie zu **Firestore Database** → **Rules**
4. Kopieren Sie den Inhalt der `firestore.rules` Datei
5. Fügen Sie ihn in den Editor ein
6. Klicken Sie auf **Publish**

### Option 2: Über Firebase CLI

```bash
# Firebase CLI installieren (falls noch nicht installiert)
npm install -g firebase-tools

# Bei Firebase anmelden
firebase login

# Firebase Projekt initialisieren
firebase init firestore

# Rules deployen
firebase deploy --only firestore:rules
```

## Testen der Rules:

Nach dem Deployment testen Sie:
1. Versuchen Sie, ohne Login auf die Datenbank zuzugreifen (sollte fehlschlagen)
2. Melden Sie sich an und prüfen Sie, ob Sie Daten lesen/schreiben können

## Erweiterte Rules (Optional):

Wenn Sie spezifischere Berechtigungen benötigen, könnten Sie z.B.:
- Bestimmten E-Mail-Adressen Admin-Rechte geben
- Schreibrechte einschränken
- Feldvalidierung hinzufügen

Beispiel:
```javascript
// Nur bestimmte Admin-User können schreiben
function isAdmin() {
  return request.auth.token.email in [
    'admin@yourdomain.com',
    'user@yourdomain.com'
  ];
}

match /customer/{customerId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

## ⚠️ Wichtiger Hinweis:

Ohne diese Rules deployed zu haben, kann **jeder im Internet** auf Ihre Datenbank zugreifen! Deployen Sie die Rules **sofort**, wenn die Datenbank produktiv ist.
