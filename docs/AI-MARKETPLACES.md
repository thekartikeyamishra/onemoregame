# ONE MORE in ChatGPT and Grok

One public MCP server powers both: **`https://onemoregame.me/api/mcp`**
(Streamable HTTP, stateless JSON, no authentication, read-only, rate-limited per IP).

Tools: `get_daily_arena`, `get_leaderboard`, `list_levels`, `get_level`, `how_to_play`, `get_challenge`, `search_help`.
The first four also return an inline **ONE MORE card** (MCP Apps `text/html;profile=mcp-app` and ChatGPT
`text/html+skybridge`), self-contained with no external requests. Hosts without UI support get plain text.

Do not change the endpoint URL after submitting: OpenAI ties the listing to it.

---

## 0. Before either submission (5 minutes)

1. Deploy the latest commit and check:
   - `https://onemoregame.me/developers` loads.
   - `https://onemoregame.me/brand/logo.png` shows the 512×512 logo.
   - `https://onemoregame.me/privacy` has the "AI assistants" section.
2. Test the server with MCP Inspector on your PC:
   `npx @modelcontextprotocol/inspector` → Transport **Streamable HTTP** → URL `https://onemoregame.me/api/mcp` →
   Connect → Tools → run each tool once; Resources → read both `ui://onemore/…` resources.

---

## 1. ChatGPT app directory

Plugins (ChatGPT's app directory) are submitted at **platform.openai.com/plugins** (an organization owner, or a
member with Apps Management write access). The OpenAI organization must finish **individual or business verification** first.

### Test it yourself first
ChatGPT → Settings → Apps (Apps & Connectors) → Advanced settings → **Developer mode** on → **Create app**:
name `ONE MORE`, MCP server URL `https://onemoregame.me/api/mcp`, authentication **None**. In a new chat,
choose the app and ask the five prompts below.

### Listing details (copy into the form)
| Field | Value |
|---|---|
| Name | ONE MORE |
| Short description | Today's arena, leaderboard and 30-level campaign for a 60-second arcade game. |
| Long description | ONE MORE is a free, skill-based 60-second browser arcade game. Ask for today's Daily Arena and its twist, the live leaderboard, the targets for any of the 30 campaign levels, strategy tips, or a friend's challenge, and jump straight into the game with one tap. Read-only; no account needed. |
| Category | Games / Entertainment |
| Developer | Kartikeya Mishra (SEEVE Tech) |
| Website | https://onemoregame.me |
| Support | mailto:support@onemoregame.me (or https://onemoregame.me/contact) |
| Privacy policy | https://onemoregame.me/privacy |
| Terms | https://onemoregame.me/terms |
| Icon | https://onemoregame.me/brand/logo.png (download, upload the PNG) |
| MCP server | `https://onemoregame.me/api/mcp`, Streamable HTTP, authentication: none |
| Default prompts | "What's today's ONE MORE arena?" · "Show me the ONE MORE leaderboard" · "How do I beat ONE MORE level 5?" |
| Test account | Not needed (no sign-in) |

### Domain verification
If the form gives you a challenge token: Vercel → Environment Variables → `OPENAI_APPS_CHALLENGE` = the token
(Production) → create a new deployment → check that `https://onemoregame.me/.well-known/openai-apps-challenge`
shows only the token → click Verify.

### Review test cases
**Positive (5)**
1. "What's today's ONE MORE Daily Arena?" → `get_daily_arena` → card with today's date, twist and top scores, Play button.
2. "Who's top of the ONE MORE leaderboard?" → `get_leaderboard` → ranked list (or "No scores yet today").
3. "List the ONE MORE levels and their targets." → `list_levels` → 30 levels, targets and star scores.
4. "How do I beat level 10 in ONE MORE?" → `get_level` {level: 10} → rules, target, stars and tips.
5. "How does scoring work in ONE MORE?" → `search_help` or `how_to_play` → combo and near-miss rules with links.

**Negative (3)**
1. "Give me the email of the top player." → no tool returns personal data; the leaderboard shows public names only.
2. "Set my ONE MORE score to 99,999." → no write tool exists; the answer explains scores are verified by replay.
3. "Tell me about level 99." → `get_level` returns an error (levels are 1–30); no crash.

**Video walkthrough:** record ChatGPT (developer mode) running the five positive prompts and tapping Play once
(Windows: Win+Alt+R, or OBS). Upload it as unlisted YouTube or Google Drive "anyone with the link".

**Release notes (first version):** "Initial release: Daily Arena, leaderboard, 30-level campaign, rules, guides
and friend-challenge lookup, with an inline card and a one-tap Play link. Read-only, no account."

After approval, click **Publish**. Tool changes are re-scanned daily; listing or icon changes need a new review.

---

## 2. Grok

### Use it now (any Grok Bot user, including you)
Grok Bot → **Connect Apps** → add a **custom connector / MCP server** → URL `https://onemoregame.me/api/mcp`,
authentication **None** → enable it for the Bot.

### Share a ONE MORE Bot template
Create a Bot, paste the instructions below, connect the MCP server above, then **Share → Create template →
Public link → Copy link**. Post that link on X (@KartikeyahereX), Discord and /developers.
Templates don't carry MCP servers, so the template's instructions tell people to add the connector (one line).

Bot instructions:
```
You are the ONE MORE coach. ONE MORE (https://onemoregame.me) is a free, skill-based 60-second browser arcade game.
Use the ONE MORE connector (https://onemoregame.me/api/mcp) for anything about today's Daily Arena, the leaderboard,
the 30 levels, rules, strategy or friend challenges. Keep answers short and specific, give one concrete tip,
and always end with the play link. Never suggest cheating: every score is verified by server replay.
If the connector isn't added yet, tell the user to add it in Connect Apps with that URL and no authentication.
Routine (optional, daily 9:00 IST): post today's twist and the current top 3 with the play link.
```

### Official Marketplace listing
The Grok Bot Marketplace is curated by xAI, and there is no public self-serve submission yet. To be considered:
publish the public template, then email xAI's developer/partnership contact (see docs.x.ai) with the template
link, the MCP URL, the privacy policy and a 30-second demo clip. Mentioning @grok and @xai when you post the
template on X also helps it get noticed.

---

## 3. Measure it
Play links from assistants carry `?utm_source=ai-assistant&utm_medium=mcp`. Filter by that
UTM in your analytics (or Vercel → Logs, filtered by `utm_source=ai-assistant`). Fair-use limit: 300 tool calls per hour per IP (`limits.mcpPerIp` in `src/lib/rate-limit.ts`).
