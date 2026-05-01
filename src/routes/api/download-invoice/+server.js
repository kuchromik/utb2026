import { env } from '$env/dynamic/private';

/** @type {any} */
let storage;
let isFirebaseInitialized = false;

/** @param {string} inputPath */
function sanitizePathInput(inputPath) {
    let path = (inputPath || '').trim();

    // Manche Clients kodieren den Pfad versehentlich doppelt.
    try {
        path = decodeURIComponent(path);
    } catch {
        // Bereits dekodiert oder ungueltige Escape-Sequenz.
    }

    // Einheitliche Pfadseparatoren fuer Storage-Objektpfade.
    path = path.replace(/\\+/g, '/');
    return path;
}

/**
 * @param {any} bucket
 * @param {string} requestedPath
 */
async function resolveFileFromInvoicePrefix(bucket, requestedPath) {
    const match = requestedPath.match(/^invoices\/(\d{4})\/Rechnung_(\d+)_.*\.pdf$/i);
    if (!match) return null;

    const [, year, invoiceNumber] = match;
    const prefix = `invoices/${year}/Rechnung_${invoiceNumber}_`;
    const [files] = await bucket.getFiles({ prefix });
    const pdfFiles = files.filter((/** @type {any} */ f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) return null;

    // Rechnungsnummer sollte eindeutig sein; nutze erste PDF-Datei stabil sortiert.
    pdfFiles.sort((/** @type {any} */ a, /** @type {any} */ b) => a.name.localeCompare(b.name));
    return pdfFiles[0];
}

/** @param {string} fileName */
function buildDownloadHeaders(fileName) {
    const asciiFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, max-age=300'
    };
}

async function initializeFirebaseAdmin() {
    if (isFirebaseInitialized) return true;

    if (!env.FIREBASE_PRIVATE_KEY || !env.FIREBASE_CLIENT_EMAIL) {
        return false;
    }

    try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getStorage } = await import('firebase-admin/storage');

        if (getApps().length === 0) {
            let privateKey = env.FIREBASE_PRIVATE_KEY;
            if (env.FIREBASE_PRIVATE_KEY_BASE64) {
                privateKey = Buffer.from(env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
            } else if (privateKey.includes('\\n')) {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }

            initializeApp({
                credential: cert({
                    projectId: env.VITE_FIREBASE_PROJECT_ID,
                    clientEmail: env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey
                }),
                storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET
            });
        }

        storage = getStorage();
        isFirebaseInitialized = true;
        return true;
    } catch (err) {
        console.error('Firebase Admin Initialisierung fehlgeschlagen:', err);
        return false;
    }
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ url }) {
    const pathParam = url.searchParams.get('path');
    if (!pathParam) {
        return new Response('Fehlender Parameter: path', { status: 400 });
    }

    const path = sanitizePathInput(pathParam);

    // Sicherheitsprüfung: nur Pfade innerhalb von invoices/ erlaubt
    if (!path.startsWith('invoices/') || path.includes('..')) {
        return new Response('Ungültiger Pfad', { status: 403 });
    }

    const initialized = await initializeFirebaseAdmin();
    if (!initialized) {
        return new Response('Firebase nicht verfügbar', { status: 503 });
    }

    try {
        const bucket = storage.bucket();
        let file = bucket.file(path);
        let [exists] = await file.exists();

        if (!exists) {
            const fallbackFile = await resolveFileFromInvoicePrefix(bucket, path);
            if (fallbackFile) {
                file = fallbackFile;
                exists = true;
                console.warn('Datei ueber Prefix-Fallback gefunden:', { requested: path, resolved: file.name });
            }
        }

        if (!exists) {
            return new Response('Datei nicht gefunden', { status: 404 });
        }

        const [buffer] = await file.download();
        const fileName = file.name.split('/').pop() ?? 'rechnung.pdf';

        return new Response(buffer, {
            status: 200,
            headers: buildDownloadHeaders(fileName)
        });
    } catch (err) {
        console.error('Fehler beim Laden der Datei:', path, err);
        return new Response('Datei nicht gefunden', { status: 404 });
    }
}
