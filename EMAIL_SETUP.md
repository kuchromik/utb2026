# E-Mail-Benachrichtigungsfunktion

## Übersicht

Die Anwendung sendet automatisch E-Mail-Benachrichtigungen an Kunden, wenn ein Auftrag als "Klar?" markiert wird. Je nachdem, ob der Auftrag versendet wird oder zur Abholung bereit ist, wird eine entsprechende E-Mail generiert.

## Funktionsweise

### Workflow

1. **Auftrag als "Klar?" markieren**: Wenn ein Benutzer die Checkbox "Klar?" für einen Auftrag setzt, öffnet sich ein Bestätigungsdialog.

2. **Bestätigungsdialog**:
   - **Bei Versand** (toShip = true): Der Benutzer muss eine Sendungsverfolgungsnummer eingeben.
   - **Bei Abholung** (toShip = false): Es wird nur eine Bestätigung angezeigt.

3. **Nach Bestätigung**:
   - Der Auftragsstatus wird in Firebase auf `shipped_ready: true` gesetzt
   - Bei Versand wird die Tracking-Nummer in Firebase gespeichert
   - Eine E-Mail wird an die im Kunden-Datensatz hinterlegte E-Mail-Adresse versendet

### E-Mail-Inhalte

**Versand-E-Mail**:
- Informiert über erfolgreichen Versand
- Enthält die Sendungsverfolgungsnummer
- Professionelles HTML-Layout

**Abholungs-E-Mail**:
- Informiert über Abholbereitschaft
- Zeigt Öffnungszeiten an (Montag-Freitag: 8:00-17:00)
- Professionelles HTML-Layout

## Einrichtung

### 1. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env`-Datei im Projektstammverzeichnis (falls noch nicht vorhanden) und fügen Sie folgende Variablen hinzu:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ihre-email@gmail.com
SMTP_PASS=ihr-app-passwort
SMTP_FROM=ihre-email@gmail.com
```

### 2. Gmail-Konfiguration (empfohlen)

Für Gmail müssen Sie ein **App-spezifisches Passwort** erstellen:

1. Aktivieren Sie die **2-Faktor-Authentifizierung** in Ihrem Google-Konto
2. Gehen Sie zu: https://myaccount.google.com/apppasswords
3. Wählen Sie "App auswählen" → "Andere (Benutzerdefinierter Name)"
4. Geben Sie einen Namen ein (z.B. "UTB 2026 Mailer")
5. Klicken Sie auf "Generieren"
6. Kopieren Sie das generierte Passwort und fügen Sie es als `SMTP_PASS` in die `.env`-Datei ein

### 3. Alternative SMTP-Anbieter

Sie können auch andere SMTP-Anbieter verwenden:

**Outlook/Office 365**:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Eigener SMTP-Server**:
```env
SMTP_HOST=mail.ihre-domain.de
SMTP_PORT=465
SMTP_SECURE=true
```

### 4. Öffnungszeiten anpassen

Die Öffnungszeiten in der E-Mail sind fest im Code hinterlegt. Um sie zu ändern, bearbeiten Sie die Datei:

`src/routes/api/send-email/+server.js`

Suchen Sie nach:
```javascript
Montag - Freitag: 8:00 - 17:00 Uhr
```

## Neue Datenbankfelder

### Job-Dokument in Firebase

Das Job-Dokument wurde um folgende Felder erweitert:

- **`toShip`** (boolean): Gibt an, ob der Auftrag versendet werden soll
- **`trackingNumber`** (string, optional): Sendungsverfolgungsnummer bei Versand

## Neue Komponenten

### ShippedConfirmModal.svelte

Modal-Komponente für die Bestätigung und Eingabe der Tracking-Nummer:
- Zeigt Auftragsinformationen an
- Bei Versand: Eingabefeld für Tracking-Nummer (Pflichtfeld)
- Bei Abholung: Nur Bestätigung
- Informiert über E-Mail-Versand an Kunden

## API-Endpunkt

### POST /api/send-email

**Request Body**:
```json
{
  "customerEmail": "kunde@example.com",
  "customerName": "Musterfirma GmbH",
  "jobname": "Flyer A5",
  "toShip": true,
  "trackingNumber": "12345678901234"
}
```

**Response (Erfolg)**:
```json
{
  "success": true,
  "messageId": "abc123...",
  "message": "E-Mail erfolgreich versendet"
}
```

**Response (Fehler)**:
```json
{
  "error": "E-Mail konnte nicht versendet werden",
  "details": "Connection refused"
}
```

## Fehlerbehebung

### E-Mail wird nicht versendet

1. **Überprüfen Sie die `.env`-Datei**: Sind alle SMTP-Zugangsdaten korrekt?
2. **Console-Logs**: Öffnen Sie die Browser-Entwicklerkonsole und prüfen Sie auf Fehlermeldungen
3. **Server-Logs**: Prüfen Sie die Terminal-Ausgabe des Entwicklungsservers
4. **Gmail-Sperre**: Gmail könnte den Zugriff blockiert haben. Prüfen Sie Ihre E-Mails auf Sicherheitswarnungen
5. **Firewall**: Stellen Sie sicher, dass Port 587 (oder 465) nicht blockiert ist

### Kunde hat keine E-Mail-Adresse

Wenn für einen Kunden keine E-Mail-Adresse hinterlegt ist:
- Der Auftragsstatus wird trotzdem aktualisiert
- Es erscheint eine Warnung: "Keine E-Mail-Adresse für diesen Kunden gefunden"
- Sie sollten den Kunden manuell kontaktieren

### Tracking-Nummer fehlt

Bei Versand-Aufträgen ist die Tracking-Nummer ein Pflichtfeld:
- Der Dialog lässt sich erst bestätigen, wenn eine Nummer eingegeben wurde
- Die Nummer wird sowohl in der E-Mail als auch in Firebase gespeichert

## Testen

### Lokales Testen

1. Erstellen Sie einen Test-Kunden mit Ihrer eigenen E-Mail-Adresse
2. Erstellen Sie einen Testauftrag für diesen Kunden
3. Setzen Sie "Versand?" nach Bedarf
4. Klicken Sie auf "Klar?" und füllen Sie den Dialog aus
5. Prüfen Sie Ihren E-Mail-Posteingang

### Produktiv-Deployment

Stellen Sie sicher, dass die `.env`-Variablen auch in Ihrer Produktionsumgebung gesetzt sind. Bei Verwendung von Vercel, Netlify oder ähnlichen Diensten:

1. Fügen Sie die Umgebungsvariablen über das Dashboard hinzu
2. Redeploy der Anwendung
3. Testen Sie mit einer echten E-Mail-Adresse

## Sicherheitshinweise

- **Niemals** die `.env`-Datei in Git committen (bereits in `.gitignore` ausgeschlossen)
- Verwenden Sie App-spezifische Passwörter, nicht Ihr Haupt-Passwort
- Rotieren Sie Passwörter regelmäßig
- Bei Produktiv-Deployment: Nutzen Sie die Umgebungsvariablen-Verwaltung der Hosting-Plattform

## Anpassungen

### Absender-Name ändern

Im API-Endpunkt können Sie einen benutzerdefinierten Absender-Namen hinzufügen:

```javascript
from: '"Ihre Firma" <ihre-email@gmail.com>',
```

### E-Mail-Template anpassen

Die E-Mail-Templates befinden sich in:
- `src/routes/api/send-email/+server.js`

Suchen Sie nach den Variablen `html` und `text` um die Templates anzupassen.

### Eigenes Logo hinzufügen

Sie können ein Logo in die HTML-E-Mail einbinden:

```html
<img src="https://ihre-domain.de/logo.png" alt="Logo" style="max-width: 150px;">
```
