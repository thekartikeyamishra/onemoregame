/**
 * Tiny per-instance TTL cache for expensive, non-personal reads (e.g. the public leaderboard top list).
 * Each server instance keeps its own copy; entries expire quickly so results stay fresh across instances.
 */
export class TtlCache<V> {
  private map = new Map<string, { value: V; expires: number }>();
  constructor(private ttlMs: number, private max = 200) {}
  get(key: string, now = Date.now()): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (now > e.expires) { this.map.delete(key); return undefined; }
    return e.value;
  }
  set(key: string, value: V, now = Date.now()) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value as string);
    this.map.set(key, { value, expires: now + this.ttlMs });
  }
  delete(key: string) { this.map.delete(key); }
  async getOrLoad(key: string, load: () => Promise<V>, now = Date.now()): Promise<V> {
    const hit = this.get(key, now);
    if (hit !== undefined) return hit;
    const v = await load();
    this.set(key, v, now);
    return v;
  }
}
