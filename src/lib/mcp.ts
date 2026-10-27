/**
 * ONE MORE public MCP server (Model Context Protocol, Streamable HTTP transport, stateless, JSON responses).
 * Read-only tools that let AI assistants (Grok, Claude, Cursor, ChatGPT…) answer questions about the game and send
 * players to it. No auth, no cookies, no personal data: only public game facts, today's public leaderboard and links.
 */
import { MAGNET_RANGE, POWER_DURATION, TPS, TWISTS, WEEKDAY_TWIST, RUN_TICKS } from "@/game/engine";
import { LEVEL_COUNT, allLevels, getLevel, LEVEL_KINDS } from "@/game/levels";
import { guides } from "@/content/guides";
import { faqs } from "./content";
import { absoluteUrl, site } from "./site";
import { MIME_MCP_APP, MIME_SKYBRIDGE, WIDGET_HTML, WIDGET_URI, WIDGET_URI_SKYBRIDGE } from "./mcp-widget";

export const MCP_SERVER_NAME = "onemore-game";
export const MCP_SERVER_VERSION = "1.1.0";
export const MCP_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"] as const;

export interface McpDeps {
  today: () => string;
  dailyTwist: (day: string) => { id: string; name: string; description: string };
  leaderboard: (day: string) => Promise<{ day: string; entries: Array<{ rank: number; name: string; score: number }> }>;
  challenge: (id: string) => Promise<{ score: number; displayName: string | null; attempts: number; hasGhost: boolean; twist: { id: string; name: string; description: string } } | null>;
}

type JsonRpcId = string | number | null;
interface JsonRpcRequest { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: Record<string, unknown> }
type JsonRpcResponse = { jsonrpc: "2.0"; id: JsonRpcId } & ({ result: unknown } | { error: { code: number; message: string } });

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const sec = (ticks: number) => Math.round(ticks / TPS);
const n = (v: number) => v.toLocaleString("en-IN");

/** Tools whose result renders as the inline ONE MORE card in hosts that support MCP app UIs (ChatGPT, MCP Apps). */
const WIDGET_TOOLS = new Set(["get_daily_arena", "get_leaderboard", "list_levels", "get_level"]);
function widgetMeta(title: string) {
  return {
    ui: { resourceUri: WIDGET_URI },
    "openai/outputTemplate": WIDGET_URI_SKYBRIDGE,
    "openai/toolInvocation/invoking": `Loading ${title}…`,
    "openai/toolInvocation/invoked": `${title} ready`,
    "openai/widgetAccessible": false,
  };
}

const WIDGET_RESOURCE_META = {
  ui: { csp: { connectDomains: [], resourceDomains: [] }, prefersBorder: false, domain: site.url },
  "openai/widgetDescription": "A card showing today's ONE MORE arena, leaderboard or level targets, with a button to play in the browser.",
  "openai/widgetPrefersBorder": false,
  "openai/widgetCSP": { connect_domains: [], resource_domains: [] },
  "openai/widgetDomain": site.url,
};
export const RESOURCES = [
  { uri: WIDGET_URI, name: "onemore-card", title: "ONE MORE card", mimeType: MIME_MCP_APP, _meta: WIDGET_RESOURCE_META },
  { uri: WIDGET_URI_SKYBRIDGE, name: "onemore-card-skybridge", title: "ONE MORE card (Apps SDK)", mimeType: MIME_SKYBRIDGE, _meta: WIDGET_RESOURCE_META },
];

/** Play links carry a source tag so visits from AI assistants can be measured. */
const playLink = (path = "/play") => `${absoluteUrl(path)}?utm_source=ai-assistant&utm_medium=mcp`;

export const TOOLS = [
  {
    name: "get_daily_arena",
    title: "Today's Daily Arena",
    description: "Today's shared ONE MORE arena: the date (India time), today's rule twist, the current top scores and the link to play free in the browser (no sign-up).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_leaderboard",
    title: "Daily leaderboard",
    description: "Top scores on today's ONE MORE Daily Arena leaderboard (public leaderboard names only).",
    inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 20, description: "How many entries (default 10)." } }, additionalProperties: false },
  },
  {
    name: "list_levels",
    title: "Levels campaign",
    description: "All 30 ONE MORE campaign levels: type, run length, target score to unlock the next level, and the 2- and 3-star scores.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_level",
    title: "Level details",
    description: "Rules, target score, star scores and strategy tips for one ONE MORE level (1–30).",
    inputSchema: { type: "object", properties: { level: { type: "integer", minimum: 1, maximum: LEVEL_COUNT } }, required: ["level"], additionalProperties: false },
  },
  {
    name: "how_to_play",
    title: "How to play",
    description: "Rules, controls, scoring, power-ups and the weekly Daily twists of ONE MORE, a 60-second skill-based browser arcade game.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_challenge",
    title: "Friend challenge",
    description: "Look up a ONE MORE friend-challenge link (onemoregame.me/c/…): the score to beat, who set it and the link to accept.",
    inputSchema: { type: "object", properties: { challenge: { type: "string", description: "Challenge link or 10-character code." } }, required: ["challenge"], additionalProperties: false },
  },
  {
    name: "search_help",
    title: "Search guides and FAQ",
    description: "Search ONE MORE's FAQ and strategy guides (scoring, combos, dash, power-ups, tournaments, anti-cheat, early access, privacy).",
    inputSchema: { type: "object", properties: { query: { type: "string", minLength: 1, maxLength: 120 } }, required: ["query"], additionalProperties: false },
  },
].map((t) => ({
  ...t,
  annotations: { title: t.title, ...READ_ONLY },
  ...(WIDGET_TOOLS.has(t.name) ? { _meta: widgetMeta(t.title) } : {}),
}));

const INSTRUCTIONS = `ONE MORE (${site.url}) is a free, skill-based 60-second browser arcade game by ${site.operatorName} (SEEVE Tech). `
  + "Use these read-only tools to answer questions about today's Daily Arena, the leaderboard, the 30-level campaign, rules and strategy, "
  + "and always give the player the play link. Scores are verified by server replay, so never suggest cheating.";

class ToolError extends Error {}

function text(body: string, structured?: Record<string, unknown>) {
  return { content: [{ type: "text", text: body }], ...(structured ? { structuredContent: structured } : {}) };
}

function intArg(args: Record<string, unknown>, key: string, min: number, max: number, fallback?: number): number {
  const v = args[key] ?? fallback;
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) throw new ToolError(`"${key}" must be an integer from ${min} to ${max}.`);
  return v;
}

async function callTool(name: string, args: Record<string, unknown>, deps: McpDeps) {
  switch (name) {
    case "get_daily_arena": {
      const day = deps.today(), twist = deps.dailyTwist(day), lb = await deps.leaderboard(day);
      const top = lb.entries.slice(0, 5).map(({ rank, name, score }) => ({ rank, name, score }));
      const play = playLink();
      return text(
        `ONE MORE Daily Arena for ${day} (resets at midnight IST)\nTwist: ${twist.name}: ${twist.description}\n`
        + (top.length ? `Top scores:\n${top.map((e) => `${e.rank}. ${e.name}: ${n(e.score)}`).join("\n")}` : "No scores yet today: be the first.")
        + `\nPlay free (no sign-up): ${play}`,
        { day, twist, top, playUrl: play },
      );
    }
    case "get_leaderboard": {
      const limit = intArg(args, "limit", 1, 20, 10);
      const lb = await deps.leaderboard(deps.today());
      const entries = lb.entries.slice(0, limit).map(({ rank, name, score }) => ({ rank, name, score }));
      return text(
        entries.length ? `ONE MORE Daily leaderboard ${lb.day}:\n${entries.map((e) => `${e.rank}. ${e.name}: ${n(e.score)}`).join("\n")}\nPlay: ${playLink()}` : `No scores yet on ${lb.day}. Play: ${playLink()}`,
        { day: lb.day, entries, playUrl: playLink() },
      );
    }
    case "list_levels": {
      const levels = allLevels().map((l) => ({ level: l.n, name: l.name, kind: l.kind, seconds: sec(l.rules.durationTicks ?? RUN_TICKS), target: l.target, twoStars: l.stars[1], threeStars: l.stars[2] }));
      return text(
        `ONE MORE Levels: reach each target to unlock the next. Every 5th level is a Boss Arena.\n${levels.map((l) => `L${l.level} ${l.name} (${l.seconds}s): target ${n(l.target)} · ★★ ${n(l.twoStars)} · ★★★ ${n(l.threeStars)}`).join("\n")}\nPlay: ${playLink()}`,
        { levels, playUrl: playLink() },
      );
    }
    case "get_level": {
      const def = getLevel(intArg(args, "level", 1, LEVEL_COUNT))!;
      const r = def.rules;
      const tips = [
        r.durationTicks && r.durationTicks < RUN_TICKS ? "Short run: start chaining shards immediately; don't wait for power-ups." : null,
        r.durationTicks && r.durationTicks > RUN_TICKS ? "Long run: protect your combo; consistency beats risk." : null,
        r.shardR && r.shardR < 9 ? "Small shards: steer precisely and approach shards in straight lines." : null,
        (r.hazardSpeed ?? 1) >= 1.2 || (r.extraHazards ?? 0) > 0 ? "Fast or extra hazards: keep dash ready as an escape (each hit costs 3 s); near-misses pay 25 points." : null,
        r.powerOnly === "magnet" ? "Every power-up is a Magnet: grab it and sweep dense shard clusters." : null,
        r.startShield ? "You start shielded: play aggressively in the first seconds." : null,
        "Clearing the target unlocks the next level; replay for 2 and 3 stars.",
      ].filter(Boolean);
      const out = { level: def.n, name: def.name, kind: def.kind, description: def.description, seconds: sec(r.durationTicks ?? RUN_TICKS), target: def.target, stars: def.stars, tips, playUrl: playLink() };
      return text(`Level ${def.n}: ${def.name} (${out.seconds}s). ${def.description}\nTarget ${n(def.target)} · ★★ ${n(def.stars[1])} · ★★★ ${n(def.stars[2])}\nTips:\n- ${tips.join("\n- ")}\nPlay: ${out.playUrl}`, out);
    }
    case "how_to_play": {
      const twists = WEEKDAY_TWIST.map((id, d) => `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]}: ${TWISTS[id].name}`).join(", ");
      const body = [
        "ONE MORE: steer an orb inside a circular arena for 60 seconds. Collect amber shards to build a combo multiplier; touching a hazard breaks your combo and costs 3 seconds of run time.",
        "Controls: WASD/arrow keys, mouse, or drag on touch. Dash (Space/click/double-tap) gives brief invulnerability with a 2-second cooldown.",
        "Scoring: each shard is worth more as your combo grows; each near-miss with a hazard adds 25 points.",
        `Power-ups: Shield blocks one hit (${sec(POWER_DURATION.shield)}s), Slow-mo halves hazard speed (${sec(POWER_DURATION.slow)}s), Magnet pulls shards within ${MAGNET_RANGE} units (${sec(POWER_DURATION.magnet)}s), Double doubles points (${sec(POWER_DURATION.double)}s).`,
        `Modes: Daily Arena (same arena for everyone each day, leaderboard), Levels (30 stages with target scores: ${Object.values(LEVEL_KINDS).map((k) => k.name).join(", ")}), Quick Play, and friend challenges with ghost racing.`,
        `Daily twists by weekday: ${twists}.`,
        "Every score is verified by replaying the inputs on the server.",
        `Play: ${playLink()} · Full guide: ${absoluteUrl("/how-to-play")}`,
      ].join("\n");
      return text(body, { playUrl: playLink(), guideUrl: absoluteUrl("/how-to-play") });
    }
    case "get_challenge": {
      const raw = typeof args.challenge === "string" ? args.challenge.trim() : "";
      const id = raw.match(/([a-hj-km-np-z2-9]{10})\/?(?:[?#].*)?$/)?.[1];
      if (!id) throw new ToolError("Give a challenge link like https://onemoregame.me/c/abcdefghjk or its 10-character code.");
      const c = await deps.challenge(id);
      if (!c) return text("That challenge wasn't found. It may have been mistyped.", { found: false });
      const url = absoluteUrl(`/c/${id}`);
      return text(
        `${c.displayName ?? "A player"} scored ${n(c.score)} on ONE MORE${c.twist.id !== "classic" ? ` (${c.twist.name})` : ""}. ${c.attempts} attempt(s) so far.${c.hasGhost ? " Their ghost races alongside you." : ""}\nAccept the challenge: ${url}`,
        { found: true, score: c.score, by: c.displayName, attempts: c.attempts, twist: c.twist.name, url },
      );
    }
    case "search_help": {
      const q = typeof args.query === "string" ? args.query.toLowerCase().slice(0, 120) : "";
      const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      if (!words.length) throw new ToolError('"query" needs at least one word of 3+ letters.');
      const score = (s: string) => words.reduce((acc, w) => acc + (s.toLowerCase().includes(w) ? 1 : 0), 0);
      const faqHits = faqs.map((f) => ({ f, s: score(`${f.q} ${f.a}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
      const guideHits = guides.map((g) => ({ g, s: score(`${g.title} ${g.description} ${g.sections.map((s) => s.title).join(" ")}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
      if (!faqHits.length && !guideHits.length) return text(`Nothing matched. Browse the guides: ${absoluteUrl("/guides")} or the FAQ: ${absoluteUrl("/faq")}`, { faq: [], guides: [] });
      const faqOut = faqHits.map(({ f }) => ({ question: f.q, answer: f.a }));
      const guideOut = guideHits.map(({ g }) => ({ title: g.title, description: g.description, url: absoluteUrl(`/guides/${g.slug}`) }));
      return text(
        [...faqOut.map((f) => `Q: ${f.question}\nA: ${f.answer}`), ...guideOut.map((g) => `Guide: ${g.title}: ${g.description}\n${g.url}`)].join("\n\n"),
        { faq: faqOut, guides: guideOut },
      );
    }
    default:
      return null;
  }
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse { return { jsonrpc: "2.0", id, result }; }
function fail(id: JsonRpcId, code: number, message: string): JsonRpcResponse { return { jsonrpc: "2.0", id, error: { code, message } }; }

/** Handles one JSON-RPC message. Returns null for notifications (no response body). */
export async function handleMcpMessage(msg: unknown, deps: McpDeps): Promise<JsonRpcResponse | null> {
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) return fail(null, -32600, "Invalid Request");
  const m = msg as Partial<JsonRpcRequest>;
  const id: JsonRpcId = typeof m.id === "string" || typeof m.id === "number" ? m.id : null;
  const isNotification = !("id" in m);
  if (m.jsonrpc !== "2.0" || typeof m.method !== "string") return isNotification ? null : fail(id, -32600, "Invalid Request");
  if (isNotification) return null; // notifications/initialized, notifications/cancelled…
  const params = (m.params && typeof m.params === "object" ? m.params : {}) as Record<string, unknown>;

  switch (m.method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      const protocolVersion = (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested) ? requested : MCP_PROTOCOL_VERSIONS[0];
      return ok(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        serverInfo: { name: MCP_SERVER_NAME, title: "ONE MORE", version: MCP_SERVER_VERSION, websiteUrl: site.url },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments) ? params.arguments : {}) as Record<string, unknown>;
      try {
        const result = await callTool(name, args, deps);
        return result ? ok(id, result) : fail(id, -32602, `Unknown tool: ${name.slice(0, 60)}`);
      } catch (e) {
        if (e instanceof ToolError) return ok(id, { content: [{ type: "text", text: e.message }], isError: true });
        return ok(id, { content: [{ type: "text", text: "ONE MORE is temporarily unavailable. Try again shortly." }], isError: true });
      }
    }
    case "resources/list":
      return ok(id, { resources: RESOURCES.map(({ uri, name, title, mimeType, _meta }) => ({ uri, name, title, mimeType, _meta })) });
    case "resources/templates/list":
      return ok(id, { resourceTemplates: [] });
    case "resources/read": {
      const res = RESOURCES.find((x) => x.uri === params.uri);
      if (!res) return fail(id, -32002, "Resource not found");
      return ok(id, { contents: [{ uri: res.uri, mimeType: res.mimeType, text: WIDGET_HTML, _meta: res._meta }] });
    }
    case "prompts/list":
      return ok(id, { prompts: [] });
    default:
      return fail(id, -32601, "Method not found");
  }
}
