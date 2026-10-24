import { afterEach, describe, expect, it, vi } from "vitest";
import { resetServerConfig, serverConfig } from "@/lib/env";

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; resetServerConfig(); vi.restoreAllMocks(); });
const setEnv = (o: Record<string, string | undefined>) => { process.env = { ...saved, ...o } as NodeJS.ProcessEnv; resetServerConfig(); };

describe("server config", () => {
  it("development falls back to memory + console when production settings lack credentials", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setEnv({ NODE_ENV: "development", DATA_BACKEND: "firestore", MAIL_PROVIDER: "resend", GOOGLE_CLOUD_PROJECT: undefined, GCLOUD_PROJECT: undefined, GOOGLE_APPLICATION_CREDENTIALS: undefined, FIRESTORE_EMULATOR_HOST: undefined, RESEND_API_KEY: "" });
    expect(serverConfig()).toMatchObject({ dataBackend: "memory", mailProvider: "console" });
  });
  it("development keeps Firestore when a project is configured", () => {
    setEnv({ NODE_ENV: "development", DATA_BACKEND: "firestore", GOOGLE_CLOUD_PROJECT: "onemoregameme" });
    expect(serverConfig().dataBackend).toBe("firestore");
  });
  it("treats empty values as unset", () => {
    setEnv({ NODE_ENV: "development", DATA_BACKEND: "", MAIL_PROVIDER: "" });
    expect(serverConfig()).toMatchObject({ dataBackend: "memory", mailProvider: "console" });
  });
  it("production never falls back and refuses insecure backends", () => {
    setEnv({ NODE_ENV: "production", APP_SECRET: "x".repeat(40), DATA_BACKEND: "memory", ALLOW_INSECURE_DEV_BACKENDS: "false" });
    expect(() => serverConfig()).toThrow(/memory backend/);
    setEnv({ NODE_ENV: "production", APP_SECRET: "x".repeat(40), DATA_BACKEND: "firestore", MAIL_PROVIDER: "resend", GOOGLE_CLOUD_PROJECT: undefined });
    expect(serverConfig()).toMatchObject({ dataBackend: "firestore", mailProvider: "resend" });
    setEnv({ NODE_ENV: "production", APP_SECRET: "short" });
    expect(() => serverConfig()).toThrow(/APP_SECRET/);
  });
});

import { parseServiceAccount } from "@/lib/store/firestore";
describe("service account parsing", () => {
  const key = { project_id: "onemoregameme", client_email: "svc@onemoregameme.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n" };
  it("accepts raw JSON and base64, and restores escaped newlines", () => {
    const raw = parseServiceAccount(JSON.stringify(key))!;
    expect(raw.projectId).toBe("onemoregameme");
    expect(raw.privateKey).toContain("\n");
    expect(parseServiceAccount(Buffer.from(JSON.stringify(key)).toString("base64"))!.clientEmail).toBe(key.client_email);
    expect(parseServiceAccount("")).toBeNull();
  });
  it("rejects incomplete keys", () => {
    expect(() => parseServiceAccount(JSON.stringify({ project_id: "x" }))).toThrow(/missing/);
  });
});
