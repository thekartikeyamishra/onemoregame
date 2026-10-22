/* Shared bootstrap for operator scripts. Run from the project root with credentials for the target project:
 *   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=<key outside the repo>)
 * and the SAME APP_SECRET as the deployed environment (otherwise email hashes won't match). */
import { FirestoreStore } from "../src/lib/store/firestore";
import { MemoryStore } from "../src/lib/store/memory";

export function scriptCtx() {
  const secret = process.env.APP_SECRET ?? "";
  if (secret.length < 32) throw new Error("Set APP_SECRET (same value as the deployed environment).");
  const store = process.env.DATA_BACKEND === "memory" ? new MemoryStore() : new FirestoreStore();
  return { store, secret };
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
