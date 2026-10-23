import "server-only";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firestore is only ever touched from the server (Admin SDK).
 * Client access is denied entirely by firestore.rules.
 *
 * Configure ONE of:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64  = base64 of the service-account JSON
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 */
function credentials(): ServiceAccount | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const raw = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as Record<string, string>;
    return { projectId: raw.project_id, clientEmail: raw.client_email, privateKey: raw.private_key };
  }
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (projectId && clientEmail && key) return { projectId, clientEmail, privateKey: key.replace(/\\n/g, "\n") };
  return null;
}

let db: Firestore | null | undefined;

export function getDb(): Firestore | null {
  if (db !== undefined) return db;
  const creds = credentials();
  if (!creds) {
    db = null;
    return db;
  }
  const app = getApps()[0] ?? initializeApp({ credential: cert(creds) });
  db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}
