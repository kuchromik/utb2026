import { env } from '$env/dynamic/private';

let storage;
let isFirebaseInitialized = false;

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
    const path = url.searchParams.get('path');
    if (!path) {
        return new Response('Fehlender Parameter: path', { status: 400 });
    }

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
        const file = bucket.file(path);
        const [buffer] = await file.download();

        // Dateinamen aus dem Pfad extrahieren
        const fileName = path.split('/').pop() ?? 'rechnung.pdf';

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                'Cache-Control': 'private, max-age=300'
            }
        });
    } catch (err) {
        console.error('Fehler beim Laden der Datei:', path, err);
        return new Response('Datei nicht gefunden', { status: 404 });
    }
}
