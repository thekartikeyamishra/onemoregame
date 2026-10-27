import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { BattleHome } from "@/components/battle/BattleHome";
import { ATTACK_ABILITIES, DEFENDER_ABILITIES, DEFENDER_LEVELS, TEAMS } from "@/game/battle/config";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/battle",
  "Battle mode: attackers vs defenders, up to 5v5",
  "ONE MORE Battle: a free multiplayer browser game. Defenders collect, attackers sabotage, then swap. 1v1, 1 vs many, AI teammates or AI opponents. 3- or 5-minute rounds, no sign-up.",
);

const faqs = [
  { q: "How do I play with friends?", a: "Create a room, then share the invite link or the 6-character code. Friends open it on any phone or computer, type a gamer tag and pick a team. No account or app needed." },
  { q: "What if we don't have enough players?", a: "The host can add AI players (easy, medium or hard) to either team, and an empty team gets an AI automatically when the battle starts. You can play 1 vs AI, or you and AI teammates against your friends." },
  { q: "How does a battle work?", a: `Two rounds. In round 1 ${TEAMS.A.name} defends (collects shards) while ${TEAMS.B.name} attacks (sabotages); in round 2 the roles swap. The team with the higher average defending score per defender wins. A tie goes to a 90-second Sudden Surge where both teams defend and the arena attacks everyone.` },
  { q: "Is it fair when teams are uneven?", a: "Yes. Team scores are averaged per defender, and attackers' energy is scaled so the total pressure per defender is the same in 1v5 and 5v1." },
  { q: "What happens if my connection drops?", a: "Your moves are saved and sent when the connection recovers. If you're offline for more than 8 seconds, the AI pilots your orb for the rest of that round, so your team isn't left a player short." },
  { q: "Can someone cheat?", a: "Attacks are stamped and checked by the server (energy, level, cooldown), and every round's result comes from the server replaying everyone's inputs. A modified client can't fake a score or an attack." },
  { q: "Does it use a lot of data?", a: "No. Each player sends only their direction changes and ability presses, about every 1.5 seconds, and every device re-simulates the arena itself. A 5-minute round typically uses well under 1 MB." },
];

export default function BattlePage() {
  return (
    <>
      <JsonLd data={breadcrumbLd("/battle", "Battle")} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageHero eyebrow="New · multiplayer" title="Battle mode">
        <p>Defenders collect. Attackers sabotage. Then you swap. Battle up to 5v5 with friends on any device, or fill the room with AI.</p>
      </PageHero>
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <BattleHome />
        </div>
      </div>
      <div className="section">
        <div className="container prose">
          <h2 id="how">How a battle works</h2>
          <ol>
            <li><strong>Pick sides.</strong> {TEAMS.A.name} and {TEAMS.B.name}, 1 to 5 players each, humans or AI in any mix: 1v1, 1v5, 3v2, you plus AI against friends, or you against AI.</li>
            <li><strong>Round 1.</strong> {TEAMS.A.name} defends: everyone plays their own copy of the same arena, collecting shards and building combos. {TEAMS.B.name} attacks from a command view that shows every defender live.</li>
            <li><strong>Round 2.</strong> Roles swap. Same length: 3 or 5 minutes, chosen by the host.</li>
            <li><strong>Winner.</strong> Higher average defending score per defender. Tie? A 90-second Sudden Surge decides it.</li>
          </ol>
          <h2>Defender kit</h2>
          <p>Energy refills over time. Spend it on abilities; you level up by scoring (level 2 at {DEFENDER_LEVELS[1].toLocaleString("en-IN")} points, level 3 at {DEFENDER_LEVELS[2].toLocaleString("en-IN")}).</p>
          <ul>{DEFENDER_ABILITIES.map((a) => <li key={a.id}><strong>{a.icon} {a.name}</strong> ({a.cost} energy{a.level > 1 ? `, level ${a.level}` : ""}): {a.blurb}</li>)}</ul>
          <p>Level 2 also gives <strong>Second Wind</strong>: once every 15 seconds, a knock-down doesn&apos;t break a 3+ combo.</p>
          <h2>Attacker kit</h2>
          <p>Target one defender, or (from level 2) the whole team at a higher cost. Every attack is announced on the defender&apos;s screen 3 seconds before it lands, so skill decides the outcome.</p>
          <ul>{ATTACK_ABILITIES.map((a) => <li key={a.id}><strong>{a.icon} {a.name}</strong> ({a.cost} energy{a.level > 1 ? `, level ${a.level}` : ""}): {a.blurb}</li>)}</ul>
          <h2>Questions</h2>
          {faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
          <p className="updated">Last updated {site.contentUpdated}.</p>
        </div>
      </div>
    </>
  );
}
