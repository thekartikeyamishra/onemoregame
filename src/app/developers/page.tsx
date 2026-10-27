import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { AdsenseScript } from "@/components/AdsenseScript";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { TOOLS } from "@/lib/mcp";
import { absoluteUrl, site } from "@/lib/site";

export const metadata = pageMetadata(
  "/developers",
  "ONE MORE for AI assistants (MCP server)",
  "Connect ONE MORE to Grok, Claude, Cursor or any MCP client: a free, read-only MCP server with today's Daily Arena, leaderboard, levels, rules and friend challenges.",
);

export default function Developers() {
  const endpoint = absoluteUrl("/api/mcp");
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/developers", "Developers")} />
      <PageHero eyebrow="Developers" title="ONE MORE in your AI assistant">
        <p>A free, public <a href="https://modelcontextprotocol.io" rel="noopener noreferrer" target="_blank">Model Context Protocol</a> server. Ask your assistant &ldquo;what&apos;s today&apos;s ONE MORE twist?&rdquo;, &ldquo;how do I beat Level 10?&rdquo; or &ldquo;who&apos;s top of the leaderboard?&rdquo; and it answers with live data and a link to play.</p>
      </PageHero>
      <div className="section">
        <div className="container prose">
          <h2 style={{ marginTop: 0 }}>Endpoint</h2>
          <p><code>{endpoint}</code></p>
          <ul>
            <li>Transport: Streamable HTTP (stateless, JSON responses). Protocol versions 2024-11-05 to 2025-11-25.</li>
            <li>Authentication: none. Read-only, no cookies, no personal data. Fair-use rate limit per IP.</li>
          </ul>

          <h2>Connect</h2>
          <ul>
            <li><strong>ChatGPT</strong>: ONE MORE is being submitted to the ChatGPT app directory. Until it&apos;s listed, workspaces with developer mode can add it under Settings → Apps → Create app (endpoint above, no authentication). Supported results show an inline ONE MORE card.</li>
            <li><strong>Grok Bot</strong>: Connect Apps → add a custom connector/MCP server and paste the endpoint above.</li>
            <li><strong>Claude</strong>: Settings → Connectors → Add custom connector → paste the endpoint.</li>
            <li><strong>Cursor</strong>: add to <code>~/.cursor/mcp.json</code>:</li>
          </ul>
          <pre><code>{JSON.stringify({ mcpServers: { "one-more": { url: endpoint } } }, null, 2)}</code></pre>

          <h2>Tools</h2>
          <div className="table-wrap"><table>
            <thead><tr><th scope="col">Tool</th><th scope="col">What it returns</th></tr></thead>
            <tbody>{TOOLS.map((t) => <tr key={t.name}><td><code>{t.name}</code></td><td>{t.description}</td></tr>)}</tbody>
          </table></div>

          <h2>Brand</h2>
          <p>Logo (1:1 PNG): <a href="/brand/logo.png">{absoluteUrl("/brand/logo.png")}</a>. Questions or a bigger integration (tournaments, campus events)? Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</p>
          <p className="updated">Last updated {site.contentUpdated}.</p>
        </div>
      </div>
    </>
  );
}
