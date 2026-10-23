import "server-only";

export class ConfigError extends Error {}

export interface ServerConfig {
  appSecret: string;
  dataBackend: "firestore" | "memory";
  mailProvider: "resend" | "console";
  resendApiKey: string | null;
  mailFrom: string | null;
  ownerNotifyEmail: string | null;
}

let cached: ServerConfig | null = null;

/** Read and validate server configuration lazily (at request time, never at build time). */
export function serverConfig(): ServerConfig {
  if (cached) return cached;
  const env = process.env;
  const isProd = env.NODE_ENV === "production";
  const allowDev = env.ALLOW_INSECURE_DEV_BACKENDS === "true";

  let appSecret = (env.APP_SECRET ?? "").trim();
  if (appSecret.length < 32) {
    if (isProd && !allowDev) throw new ConfigError("APP_SECRET must be at least 32 characters");
    appSecret = "dev-only-secret-not-for-production-use-000";
  }

  let dataBackend = ((env.DATA_BACKEND ?? "").trim() || (isProd ? "firestore" : "memory")) as ServerConfig["dataBackend"];
  if (!["firestore", "memory"].includes(dataBackend)) throw new ConfigError("DATA_BACKEND is invalid");
  if (dataBackend === "memory" && isProd && !allowDev) throw new ConfigError("memory backend is not allowed in production");
  // Development only: Firestore requested but nothing tells the Admin SDK which project/credentials to use
  // (typical when production settings were copied into .env/.env.local). Fall back so `npm run dev` just works.
  const hasGcpContext = Boolean(env.FIRESTORE_EMULATOR_HOST || env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT || env.GOOGLE_APPLICATION_CREDENTIALS);
  if (!isProd && dataBackend === "firestore" && !hasGcpContext) {
    console.warn("[setup] DATA_BACKEND=firestore but no GOOGLE_CLOUD_PROJECT / credentials are set — using the in-memory store for local development. Set GOOGLE_CLOUD_PROJECT=onemoregameme and run `gcloud auth application-default login` to use real Firestore locally.");
    dataBackend = "memory";
  }

  let mailProvider = ((env.MAIL_PROVIDER ?? "").trim() || (isProd ? "resend" : "console")) as ServerConfig["mailProvider"];
  if (!["resend", "console"].includes(mailProvider)) throw new ConfigError("MAIL_PROVIDER is invalid");
  if (mailProvider === "console" && isProd && !allowDev) throw new ConfigError("console mailer is not allowed in production");
  if (!isProd && mailProvider === "resend" && !(env.RESEND_API_KEY?.trim() && env.MAIL_FROM?.trim())) {
    console.warn("[setup] MAIL_PROVIDER=resend without RESEND_API_KEY/MAIL_FROM — printing emails to this terminal instead (development only).");
    mailProvider = "console";
  }

  cached = {
    appSecret,
    dataBackend,
    mailProvider,
    resendApiKey: env.RESEND_API_KEY?.trim() || null,
    mailFrom: env.MAIL_FROM?.trim() || null,
    ownerNotifyEmail: env.OWNER_NOTIFY_EMAIL?.trim() || null,
  };
  return cached;
}

/** Test hook. */
export function resetServerConfig() {
  cached = null;
}
