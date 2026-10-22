import { randomUUID } from "node:crypto";
import { AlreadyExistsError, type DocData, type Query, type Store, type Tx } from "./types";

/** In-process store for local development and tests. Not durable; never used in deployed environments. */
export class MemoryStore implements Store {
  private data = new Map<string, Map<string, DocData>>();
  private lock: Promise<unknown> = Promise.resolve();

  private col(name: string) {
    let c = this.data.get(name);
    if (!c) this.data.set(name, (c = new Map()));
    return c;
  }

  async get<T extends DocData>(collection: string, id: string): Promise<T | null> {
    const d = this.col(collection).get(id);
    return d ? (structuredClone(d) as T) : null;
  }

  async getMany<T extends DocData>(collection: string, ids: string[]) {
    return Promise.all(ids.map((id) => this.get<T>(collection, id)));
  }

  async add(collection: string, data: DocData): Promise<string> {
    const id = randomUUID();
    this.col(collection).set(id, structuredClone(data));
    return id;
  }

  async transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R> {
    const run = async () => {
      const writes: Array<() => void> = [];
      let wrote = false;
      const tx: Tx = {
        get: async (c, id) => {
          if (wrote) throw new Error("Transaction reads must happen before writes");
          return this.get(c, id);
        },
        create: (c, id, d) => {
          wrote = true;
          writes.push(() => {
            if (this.col(c).has(id)) throw new AlreadyExistsError();
            this.col(c).set(id, structuredClone(d));
          });
        },
        set: (c, id, d) => {
          wrote = true;
          writes.push(() => void this.col(c).set(id, structuredClone(d)));
        },
        update: (c, id, p) => {
          wrote = true;
          writes.push(() => {
            const cur = this.col(c).get(id);
            if (!cur) throw new Error("not-found");
            this.col(c).set(id, { ...cur, ...structuredClone(p) });
          });
        },
        delete: (c, id) => {
          wrote = true;
          writes.push(() => void this.col(c).delete(id));
        },
      };
      const result = await fn(tx);
      // Validate creates before applying anything (atomicity).
      const snapshot = new Map([...this.data].map(([k, v]) => [k, new Map(v)]));
      try {
        for (const w of writes) w();
      } catch (e) {
        this.data = snapshot;
        throw e;
      }
      return result;
    };
    const next = this.lock.then(run, run);
    this.lock = next.catch(() => undefined);
    return next;
  }

  async query<T extends DocData>(collection: string, q: Query) {
    let rows = [...this.col(collection).entries()].map(([id, data]) => ({ id, data: structuredClone(data) as T }));
    for (const [f, v] of q.where ?? []) rows = rows.filter((r) => r.data[f] === v);
    if (q.orderBy) {
      const { field, direction = "asc" } = q.orderBy;
      rows.sort((a, b) => {
        const x = a.data[field] as number, y = b.data[field] as number;
        return direction === "asc" ? x - y : y - x;
      });
    }
    return q.limit ? rows.slice(0, q.limit) : rows;
  }

  async delete(collection: string, id: string) {
    this.col(collection).delete(id);
  }

  async count(collection: string, where: Array<[string, unknown]>) {
    return (await this.query(collection, { where })).length;
  }
}
