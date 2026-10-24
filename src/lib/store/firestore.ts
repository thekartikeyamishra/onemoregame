import { applicationDefault, cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { AlreadyExistsError, type DocData, type Query, type Store, type Tx } from "./types";

let db: Firestore | null = null;

/**
 * Service-account credentials for hosts without Google workload identity (e.g. Vercel).
 * FIREBASE_SERVICE_ACCOUNT_KEY may hold the downloaded JSON key as-is or base64-encoded. Server-only; never NEXT_PUBLIC.
 */
export function parseServiceAccount(raw: string | undefined): (ServiceAccount & { projectId: string }) | null {
  const v = raw?.trim();
  if (!v) return null;
  const text = v.startsWith("{") ? v : Buffer.from(v, "base64").toString("utf8");
  const j = JSON.parse(text) as { project_id?: string; client_email?: string; private_key?: string };
  if (!j.project_id || !j.client_email || !j.private_key) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id, client_email or private_key");
  return { projectId: j.project_id, clientEmail: j.client_email, privateKey: j.private_key.replace(/\\n/g, "\n") };
}

function serviceAccountOptions() {
  const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  return sa ? { credential: cert(sa), projectId: sa.projectId } : null;
}

function firestore(): Firestore {
  if (db) return db;
  const app =
    getApps()[0] ??
    initializeApp(
      process.env.FIRESTORE_EMULATOR_HOST
        ? { projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "demo-one-more" }
        : serviceAccountOptions() ?? {
            credential: applicationDefault(),
            // App Hosting infers the project; elsewhere it must come from the environment.
            ...(process.env.GOOGLE_CLOUD_PROJECT ? { projectId: process.env.GOOGLE_CLOUD_PROJECT } : {}),
          },
    );
  db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

function isAlreadyExists(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === 6;
}

export class FirestoreStore implements Store {
  async get<T extends DocData>(collection: string, id: string) {
    const snap = await firestore().collection(collection).doc(id).get();
    return snap.exists ? (snap.data() as T) : null;
  }

  async getMany<T extends DocData>(collection: string, ids: string[]) {
    if (ids.length === 0) return [];
    const col = firestore().collection(collection);
    const snaps = await firestore().getAll(...ids.map((id) => col.doc(id)));
    return snaps.map((s) => (s.exists ? (s.data() as T) : null));
  }

  async add(collection: string, data: DocData) {
    const ref = await firestore().collection(collection).add(data);
    return ref.id;
  }

  async transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R> {
    const fs = firestore();
    try {
      return await fs.runTransaction(async (t) => {
        const ref = (c: string, id: string) => fs.collection(c).doc(id);
        const tx: Tx = {
          get: async (c, id) => {
            const s = await t.get(ref(c, id));
            return s.exists ? (s.data() as never) : null;
          },
          create: (c, id, d) => void t.create(ref(c, id), d),
          set: (c, id, d) => void t.set(ref(c, id), d),
          update: (c, id, p) => void t.update(ref(c, id), p),
          delete: (c, id) => void t.delete(ref(c, id)),
        };
        return fn(tx);
      });
    } catch (e) {
      if (isAlreadyExists(e)) throw new AlreadyExistsError();
      throw e;
    }
  }

  async query<T extends DocData>(collection: string, q: Query) {
    let query: FirebaseFirestore.Query = firestore().collection(collection);
    for (const [f, v] of q.where ?? []) query = query.where(f, "==", v);
    if (q.orderBy) query = query.orderBy(q.orderBy.field, q.orderBy.direction ?? "asc");
    if (q.limit) query = query.limit(q.limit);
    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, data: d.data() as T }));
  }

  async delete(collection: string, id: string) {
    await firestore().collection(collection).doc(id).delete();
  }

  async count(collection: string, where: Array<[string, unknown]>) {
    let query: FirebaseFirestore.Query = firestore().collection(collection);
    for (const [f, v] of where) query = query.where(f, "==", v);
    const agg = await query.count().get();
    return agg.data().count;
  }
}
