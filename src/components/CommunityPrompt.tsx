"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { socials, type SocialId } from "@/lib/socials";
import { SocialIcon } from "./SocialIcon";

const DISMISS_KEY = "om_community_dismissed_until";
const SESSION_KEY = "om_community_shown";

function storage<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

/**
 * Decide whether to show the community prompt. Rules (keep players, don't nag):
 * never on the first run of a visit, only after a high moment (new best, beat a friend, streak ≥ 2) or the 3rd run,
 * at most once per browser session, and never again for 7 days after "Not now".
 */
export function shouldShowCommunity(o: { runsThisVisit: number; highMoment: boolean }): boolean {
  if (o.runsThisVisit < 2) return false;
  if (!o.highMoment && o.runsThisVisit !== 3) return false;
  const until = storage(() => Number(localStorage.getItem(DISMISS_KEY) ?? 0), 0);
  if (Date.now() < until) return false;
  return !storage(() => sessionStorage.getItem(SESSION_KEY) === "1", false);
}

export function markCommunityShown() {
  storage(() => sessionStorage.setItem(SESSION_KEY, "1"), undefined);
}

export function CommunityPrompt({ reason }: { reason: "best" | "beat" | "streak" | "regular" }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const lead: Record<typeof reason, string> = {
    best: "That's a new personal best.",
    beat: "You beat your friend's score.",
    streak: "Your streak is building.",
    regular: "Enjoying it?",
  };
  const primary = socials.discord, secondary = socials.youtube;
  const click = (id: SocialId) => track("social_clicked", { channel: id, place: "results" });
  return (
    <aside className="community-prompt" aria-label="Join the community">
      <p style={{ margin: "0 0 .5rem" }}><strong>{lead[reason]}</strong> Come share it with other players.</p>
      <ul className="community-links">
        <li>
          <a href={primary.href} target="_blank" rel="noopener" onClick={() => click("discord")} className="btn btn--primary btn--sm">
            <SocialIcon id="discord" /> Join the Discord
          </a>
          <span className="small muted">{primary.pitch}</span>
        </li>
        <li>
          <a href={secondary.href} target="_blank" rel="noopener" onClick={() => click("youtube")} className="btn btn--sm">
            <SocialIcon id="youtube" /> YouTube {secondary.handle}
          </a>
          <span className="small muted">{secondary.pitch}</span>
        </li>
      </ul>
      <button type="button" className="linklike small" onClick={() => {
        storage(() => localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 864e5)), undefined);
        setHidden(true);
      }}>Not now</button>
    </aside>
  );
}
