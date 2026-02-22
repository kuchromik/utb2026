# convert-firebase-key.ps1
# Liest die Firebase Service Account JSON und gibt die Credentials aus

param(
    [string]$JsonPath = ".\serviceAccountKey.json"
)

if (-not (Test-Path $JsonPath)) {
    Write-Error "Datei nicht gefunden: $JsonPath"
    Write-Host ""
    Write-Host "Verwendung: .\convert-firebase-key.ps1 -JsonPath .\pfad\zu\serviceAccountKey.json" -ForegroundColor Yellow
    exit 1
}

try {
    $serviceAccount = Get-Content $JsonPath | ConvertFrom-Json
}
catch {
    Write-Error "Fehler beim Lesen der JSON-Datei: $_"
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "FIREBASE CREDENTIALS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "FIREBASE_CLIENT_EMAIL:" -ForegroundColor Yellow
Write-Host $serviceAccount.client_email
Write-Host ""

Write-Host "FIREBASE_PRIVATE_KEY (für .env Datei - lokale Entwicklung):" -ForegroundColor Yellow
Write-Host "`"$($serviceAccount.private_key)`""
Write-Host ""

Write-Host "FIREBASE_PRIVATE_KEY_BASE64 (für Vercel/Serverless - EMPFOHLEN):" -ForegroundColor Green
$privateKeyBytes = [System.Text.Encoding]::UTF8.GetBytes($serviceAccount.private_key)
$base64Key = [System.Convert]::ToBase64String($privateKeyBytes)
Write-Host $base64Key
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup-Anweisungen:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Für LOKALE Entwicklung (.env Datei):" -ForegroundColor White
Write-Host "  1. Kopieren Sie FIREBASE_CLIENT_EMAIL (oben)" -ForegroundColor Gray
Write-Host "  2. Kopieren Sie FIREBASE_PRIVATE_KEY (inkl. Anführungszeichen)" -ForegroundColor Gray
Write-Host "  3. Fügen Sie beide in Ihre .env Datei ein" -ForegroundColor Gray
Write-Host ""
Write-Host "Für VERCEL/Serverless Deployment:" -ForegroundColor White
Write-Host "  1. Gehen Sie zu Vercel → Settings → Environment Variables" -ForegroundColor Gray
Write-Host "  2. Erstellen Sie Variable: FIREBASE_CLIENT_EMAIL" -ForegroundColor Gray
Write-Host "     Wert: (siehe oben, ohne Anführungszeichen)" -ForegroundColor Gray
Write-Host "  3. Erstellen Sie Variable: FIREBASE_PRIVATE_KEY_BASE64" -ForegroundColor Gray
Write-Host "     Wert: (Base64 String oben)" -ForegroundColor Gray
Write-Host "  4. Setzen Sie für alle Umgebungen: Production, Preview, Development" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================`n" -ForegroundColor Cyan

# Optional: In Zwischenablage kopieren (Windows)
if ($PSVersionTable.PSVersion.Major -ge 5 -and $IsWindows -ne $false) {
    try {
        $base64Key | Set-Clipboard
        Write-Host "[OK] Base64 Key wurde in die Zwischenablage kopiert!" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        # Clipboard nicht verfuegbar, ignorieren
    }
}
