import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./Logo";
import { SocialIcon } from "./SocialIcon";
import { STUDIO, socialOrder, socials } from "@/lib/socials";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="wordmark" aria-label="ONE MORE home">
              <LogoMark />
              <span>ONE MORE</span>
            </Link>
            <p className="muted small" style={{ marginTop: "1rem", maxWidth: "36ch" }}>
              A skill-first browser arcade game. {site.tagline}
            </p>
            <p className="small muted" style={{ margin: 0 }}>A {STUDIO.name} game by {STUDIO.creator}.</p>
            <ul className="social-row" aria-label="ONE MORE on social media" style={{ listStyle: "none", padding: 0 }}>
              {socialOrder.map((id) => (
                <li key={id} style={{ margin: 0 }}>
                  <a href={socials[id].href} target="_blank" rel="noopener me" aria-label={`${socials[id].label} ${socials[id].handle}`} title={`${socials[id].label} ${socials[id].handle}`}>
                    <SocialIcon id={id} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <nav aria-label="Game">
            <h2>Game</h2>
            <ul>
              <li><Link href="/play">Play</Link></li>
              <li><Link href="/how-to-play">How to Play</Link></li>
              <li><Link href="/guides">Guides</Link></li>
              <li><Link href="/campus-clash">Campus Clash</Link></li>
              <li><Link href="/fair-play">Fair Play</Link></li>
              <li><Link href="/early-access">Early Access</Link></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2>Project</h2>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/community">Community</Link></li>
              <li><Link href="/changelog">Changelog</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h2>Legal</h2>
            <ul>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/cookies">Cookies</Link></li>
              <li><Link href="/editorial-policy">Editorial policy</Link></li>
            </ul>
          </nav>
        </div>
        <div className="footer-base">
          <span>© {year} {site.operatorName ?? "ONE MORE"}. All rights reserved.</span>
          <span>ONE MORE is a working product name.</span>
        </div>
      </div>
    </footer>
  );
}
