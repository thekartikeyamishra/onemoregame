import { describe, expect, it } from "vitest";
import { TOOLS, handleMcpMessage, type McpDeps } from "@/lib/mcp";
import { getLevel } from "@/game/levels";

const deps: McpDeps = {
  today: () => "2026-10-27",
  dailyTwist: () => ({ id: "turbo", name: "Turbo Tuesday", description: "Hazards move 25% faster." }),
  leaderboard: async (day) => ({ day, entries: [{ rank: 1, name: "Asha", score: 3200 }, { rank: 2, name: "Ravi", score: 2900 }] }),
  challenge: async (id) => (id === "abcdefghjk" ? { score: 2500, displayName: "Kay", attempts: 3, hasGhost: true, twist: { id: "classic", name: "Classic Sunday", description: "" } } : null),
};
const call = (method: string, params?: unknown) => handleMcpMessage({ jsonrpc: "2.0", id: 1, method, params }, deps);
const tool = async (name: string, args: Record<string, unknown> = {}) => {
  const r = await call("tools/call", { name, arguments: args });
  return (r as { result: { content: Array<{ text: string }>; structuredContent?: Record<string, unknown>; isError?: boolean } }).result;
};

describe("MCP server", () => {
  it("initializes, negotiating the protocol version", async () => {
    const r = await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
    expect(r).toMatchObject({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "onemore-game" } } });
    const old = await call("initialize", { protocolVersion: "1999-01-01" });
    expect((old as { result: { protocolVersion: string } }).result.protocolVersion).toBe("2025-11-25");
  });

  it("ignores notifications and rejects unknown methods/invalid messages", async () => {
    expect(await handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, deps)).toBeNull();
    expect(await call("nope")).toMatchObject({ error: { code: -32601 } });
    expect(await handleMcpMessage("x", deps)).toMatchObject({ error: { code: -32600 } });
    expect(await call("tools/call", { name: "missing" })).toMatchObject({ error: { code: -32602 } });
  });

  it("lists read-only tools with schemas", async () => {
    const r = (await call("tools/list")) as { result: { tools: typeof TOOLS } };
    expect(r.result.tools.length).toBe(7);
    for (const t of r.result.tools) { expect(t.inputSchema.type).toBe("object"); expect(t.annotations.readOnlyHint).toBe(true); }
  });

  it("answers with live data and play links", async () => {
    const d = await tool("get_daily_arena");
    expect(d.content[0].text).toContain("Turbo Tuesday");
    expect(d.content[0].text).toContain("1. Asha: 3,200");
    expect(d.content[0].text).toMatch(/\/play/);
    expect((await tool("get_leaderboard", { limit: 1 })).structuredContent).toMatchObject({ entries: [{ rank: 1, name: "Asha", score: 3200 }] });
    const lv = await tool("get_level", { level: 5 });
    expect(lv.structuredContent).toMatchObject({ level: 5, kind: "boss", target: getLevel(5)!.target });
    expect((await tool("list_levels")).structuredContent!.levels).toHaveLength(30);
    expect((await tool("how_to_play")).content[0].text).toContain("Magnet Monday");
    expect((await tool("get_challenge", { challenge: "https://onemoregame.me/c/abcdefghjk" })).content[0].text).toContain("Kay scored 2,500");
    expect((await tool("get_challenge", { challenge: "zzzzzzzzzz" })).structuredContent).toMatchObject({ found: false });
    expect((await tool("search_help", { query: "power-ups magnet" })).content[0].text.length).toBeGreaterThan(20);
  });

  it("reports bad arguments and outages as tool errors, not crashes", async () => {
    expect((await tool("get_level", { level: 99 })).isError).toBe(true);
    expect((await tool("get_challenge", { challenge: "!!" })).isError).toBe(true);
    const down = await handleMcpMessage({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "get_leaderboard" } }, { ...deps, leaderboard: async () => { throw new Error("x"); } });
    expect(down).toMatchObject({ result: { isError: true } });
  });
});

describe("MCP app UI (ChatGPT / MCP Apps)", () => {
  it("advertises resources and links widget tools to the card template", async () => {
    const init = await call("initialize", { protocolVersion: "2025-06-18" });
    expect((init as { result: { capabilities: Record<string, unknown> } }).result.capabilities).toHaveProperty("resources");
    const arena = TOOLS.find((t) => t.name === "get_daily_arena")! as { _meta?: Record<string, unknown> };
    expect(arena._meta).toMatchObject({ ui: { resourceUri: "ui://onemore/card-v1.html" }, "openai/outputTemplate": "ui://onemore/card-v1.skybridge.html" });
    expect((TOOLS.find((t) => t.name === "search_help") as { _meta?: unknown })._meta).toBeUndefined();
    for (const t of TOOLS) expect(t.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, openWorldHint: false });
  });

  it("serves both card resources as self-contained HTML", async () => {
    const list = (await call("resources/list")) as { result: { resources: Array<{ uri: string; mimeType: string }> } };
    expect(list.result.resources.map((r) => r.mimeType).sort()).toEqual(["text/html+skybridge", "text/html;profile=mcp-app"]);
    for (const r of list.result.resources) {
      const read = (await call("resources/read", { uri: r.uri })) as { result: { contents: Array<{ text: string; mimeType: string }> } };
      const html = read.result.contents[0].text;
      expect(read.result.contents[0].mimeType).toBe(r.mimeType);
      expect(html).toMatch(/^<!doctype html>/);
      expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=|https?:\/\/(?!onemoregame\.me)[a-z]/i); // no external resources
    }
    expect(await call("resources/read", { uri: "ui://nope" })).toMatchObject({ error: { code: -32002 } });
  });

  it("play links are tagged for attribution", async () => {
    const r = await tool("get_daily_arena");
    expect(r.structuredContent?.playUrl).toMatch(/\/play\?utm_source=ai-assistant&utm_medium=mcp$/);
  });
});
