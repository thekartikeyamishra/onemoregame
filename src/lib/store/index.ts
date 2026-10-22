import { serverConfig } from "../env";
import type { Store } from "./types";

let instance: Store | null = null;

export async function getStore(): Promise<Store> {
  if (instance) return instance;
  const cfg = serverConfig();
  if (cfg.dataBackend === "memory") {
    const { MemoryStore } = await import("./memory");
    // Survive dev hot reloads.
    const g = globalThis as unknown as { __oneMoreMemoryStore?: Store };
    instance = g.__oneMoreMemoryStore ??= new MemoryStore();
  } else {
    const { FirestoreStore } = await import("./firestore");
    instance = new FirestoreStore();
  }
  return instance;
}

export function setStoreForTests(store: Store | null) {
  instance = store;
}

export * from "./types";
