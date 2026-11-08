export type DocData = Record<string, unknown>;

export interface Tx {
  get<T extends DocData>(collection: string, id: string): Promise<T | null>;
  /** Create; the transaction fails if the document already exists. */
  create(collection: string, id: string, data: DocData): void;
  set(collection: string, id: string, data: DocData): void;
  update(collection: string, id: string, patch: DocData): void;
  delete(collection: string, id: string): void;
}

/** One inequality filter (Firestore allows it alongside equality filters; it must match the orderBy field). */
export interface Range { field: string; op: ">" | "<"; value: number }

export interface Query {
  where?: Array<[field: string, value: unknown]>;
  range?: Range;
  orderBy?: { field: string; direction?: "asc" | "desc" };
  limit?: number;
}

export interface Store {
  /** All reads must happen before any writes (Firestore semantics, enforced in memory too). */
  transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>;
  get<T extends DocData>(collection: string, id: string): Promise<T | null>;
  /** Batched read; results are in the same order as `ids`. */
  getMany<T extends DocData>(collection: string, ids: string[]): Promise<Array<T | null>>;
  add(collection: string, data: DocData): Promise<string>;
  query<T extends DocData>(collection: string, q: Query): Promise<Array<{ id: string; data: T }>>;
  /** Server-side count aggregation (billed as 1 read per 1,000 matches). */
  count(collection: string, where: Array<[string, unknown]>, range?: Range): Promise<number>;
  delete(collection: string, id: string): Promise<void>;
}

export class AlreadyExistsError extends Error {
  constructor() {
    super("already-exists");
  }
}

export const C = {
  signups: "waitlistSignups",
  referralCodes: "referralCodes",
  referralAttributions: "referralAttributions",
  invitations: "invitations",
  campusLeads: "campusLeads",
  mailOutbox: "mailOutbox",
  rateLimits: "rateLimits",
  sessions: "sessions",
  loginTokens: "loginTokens",
  players: "players",
  runStarts: "runStarts",
  runs: "runs",
  dailyScores: "dailyScores",
  weeklyScores: "weeklyScores",
  challenges: "challenges",
  feedback: "feedback",
  battleRooms: "battleRooms",
  battleLanes: "battleLanes",
  battleLaneSegs: "battleLaneSegs",
  purchases: "purchases",
  pushSubs: "pushSubs",
} as const;
