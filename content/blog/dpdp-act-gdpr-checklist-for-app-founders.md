---
title: "DPDP Act and GDPR for app founders: what to build into your app"
description: "An engineering checklist for apps serving India and Europe: consent, notices, deletion, breach response and children's data under the DPDP Act and GDPR."
seoTitle: "DPDP Act and GDPR checklist for app founders"
date: 2026-10-21
tags: ["DPDP Act", "GDPR", "privacy", "planning"]
faq:
  - q: "Does the DPDP Act apply to small startups?"
    a: "Yes. The Act applies to digital personal data processed in India, and to processing outside India connected with offering goods or services to people in India, regardless of company size. Some obligations are heavier for Significant Data Fiduciaries, and the government can exempt certain classes, including startups, from specific provisions by notification."
  - q: "When do the DPDP Rules take effect?"
    a: "The DPDP Rules, 2025 were notified in November 2025 with a phased rollout. Provisions on the Data Protection Board applied immediately, consent manager registration follows after about a year, and most obligations on data fiduciaries, such as notices, security safeguards, breach reporting, retention and children's data, apply about 18 months after notification."
  - q: "Is a cookie banner enough for GDPR?"
    a: "No. A consent banner covers optional cookies and trackers. GDPR also requires a lawful basis for each kind of processing, clear notices, data subject rights such as access and erasure, security, breach notification and contracts with processors."
---

> This article explains how privacy laws typically translate into engineering work. It is not legal advice. Laws and official guidance change; confirm the details for your product with a qualified lawyer.

If your app collects names, emails, phone numbers, locations or anything else that identifies a person, India's Digital Personal Data Protection Act, 2023 (DPDP Act) almost certainly applies to it, and if you have users in the European Union or the UK, so does the GDPR. Both laws are mostly about process and documentation, but a surprising amount of compliance has to be built into the product itself. It's far cheaper to build it in during version one than to retrofit it.

## The timeline that matters for India

The DPDP Act was passed in 2023. The detailed DPDP Rules, 2025 were notified in November 2025 with a staggered start:

- **Immediately:** the rules that set up the Data Protection Board of India.
- **After about one year:** registration of consent managers.
- **After about 18 months:** most duties on businesses, including notices, security safeguards, breach notification, data retention and erasure, and verifiable consent for children's data.

That puts the main obligations roughly in the middle of 2027. If you're building now, build to the rules now; the app you launch today will still be running then.

Penalties under the Act can reach ₹250 crore for some failures, such as not taking reasonable security safeguards to prevent a breach. Under the GDPR, the highest tier of fines reaches €20 million or 4% of worldwide annual turnover, whichever is higher.

## The checklist

Each item below is something an engineer builds, not just a sentence in a policy.

### 1. Data map before code

List every piece of personal data the app will touch: what it is, why you need it, where it's stored, who processes it (your cloud, analytics, email, AI providers) and how long you keep it. This one table drives everything else and is the first thing a lawyer or auditor will ask for.

Ruthlessly remove anything without a clear purpose. Data you never collect can't leak and doesn't need a deletion flow.

### 2. Notice and consent that a person can actually read

Under the DPDP Act, consent must be free, specific, informed, unconditional and unambiguous, given by a clear affirmative action, and requested with a notice in clear and plain language. The notice must explain what data you collect and why, and how a person can withdraw consent and complain.

Engineering implications:

- **No pre-ticked boxes.** Consent is a deliberate tap.
- **Separate purposes, separate toggles.** Product emails and marketing emails are different consents.
- **Language choice.** The DPDP framework expects notices to be available in English or Indian languages listed in the Constitution. If you serve Hindi-speaking users, offer the notice in Hindi.
- **Record it.** Store what the user agreed to, which version of the notice, and when. You'll need to prove consent later.
- **Withdrawal as easy as giving.** A settings toggle that takes effect immediately, not an email to support.

The GDPR offers other lawful bases besides consent, such as contract or legitimate interests, but the same principle applies: document which basis covers each purpose.

### 3. Rights requests as product features

Both laws give people rights over their data. Under the DPDP Act: access to a summary of their data, correction and completion, erasure, grievance redressal, and nominating someone to act for them. The GDPR adds portability, restriction and objection.

Build these as features:

- **Export my data:** a button that produces a readable file.
- **Delete my account:** one flow that removes or anonymises the user across your database, file storage, analytics, email lists and backups (on their normal expiry cycle), and confirms when it's done.
- **Correct my details:** editable profile fields for everything you hold.
- **Contact for grievances:** a clearly published contact, with a response well within the legal deadline. The DPDP Rules require a grievance system that responds within 90 days; aim for days, not months.

### 4. Retention and automatic deletion

Keep personal data only as long as the purpose needs it. Under the DPDP Rules, certain large platform categories must erase data after a period of user inactivity, with a warning sent 48 hours before erasure, while some logs must be kept for at least a year.

In practice, every collection in your database should have a retention rule and a scheduled job that enforces it. "We'll clean it up later" means never.

### 5. Security safeguards

"Reasonable security safeguards" includes encryption, access control, logging and monitoring, and the ability to detect and respond to breaches. For an app that usually means:

- encryption in transit (HTTPS everywhere) and at rest;
- no direct client access to databases; access through authenticated server code or strict security rules;
- least-privilege service accounts and API keys stored as secrets, never in the app bundle;
- audit logs for access to personal data;
- rate limits and abuse protection on every public endpoint;
- hashed or tokenised identifiers wherever raw values aren't needed (for example, store a salted hash of an IP address for fraud checks instead of the IP itself).

### 6. A breach plan you've rehearsed

Under the DPDP Rules, you must inform affected users without delay and notify the Data Protection Board, with a detailed report within 72 hours of becoming aware. The GDPR requires notifying the supervisory authority within 72 hours where feasible, and users when the risk to them is high.

Prepare a one-page runbook: who decides, how you find affected users, the message templates, and where the logs are. Rehearse it once. During a real incident nobody has time to design a process.

### 7. Children's data

The DPDP Act defines a child as anyone under 18 and requires verifiable consent from a parent or lawful guardian before processing a child's data. It also prohibits tracking, behavioural monitoring and targeted advertising directed at children. The GDPR sets the age of digital consent between 13 and 16 depending on the country.

If children might use your app, design for it from the start: an age gate, a parental-consent flow, and no ad tracking for those users. If your app isn't meant for children, say so clearly and act on reports.

### 8. Processors and transfers

Your cloud host, email service, analytics, crash reporting and AI model provider all process personal data on your behalf. You're responsible for choosing them carefully and having contracts (data processing agreements) in place. For EU users, transfers outside the EU need a recognised safeguard such as standard contractual clauses. Keep the list of processors in your privacy policy current.

### 9. AI features need extra care

If you send user content to a language model:

- tell users in the notice;
- strip or mask identifiers you don't need before sending;
- check the provider's data-retention and training settings;
- never put another user's data into a shared prompt or cache.

The same features that protect privacy often [cut AI costs](/blog/control-llm-costs-in-production-apps): smaller prompts, fewer calls, and caching only anonymous questions.

## What this adds to your budget

Done during the first build, standard privacy work typically adds 4–8% to an app's effort; for apps processing personal data at scale, 10–18%; for health, finance or children's apps, 22–35%. The [app cost calculator](/tools/app-cost-calculator) includes this as a separate line, and the [cost breakdown](/blog/how-much-does-it-cost-to-build-an-app) explains why it belongs in every quote.

Retrofitting is far more expensive than these numbers, because you'll be changing a live database with real users in it.

## A one-page summary

| Build this | Why |
|---|---|
| Data map | Drives every other decision |
| Clear notice, separate consents, consent records | DPDP consent and notice rules; GDPR lawful basis |
| Export, correct, delete, grievance contact | Data principal and data subject rights |
| Retention rules with scheduled deletion | Storage limitation; DPDP erasure rules |
| Encryption, access control, logs, rate limits | Reasonable security safeguards |
| Breach runbook | 72-hour reporting duties |
| Age gate and parental consent if needed | Children's data rules |
| Processor list and contracts | Accountability and transfers |

Privacy done well is mostly invisible to users, and that's the point. If you'd like these built into your app from the start, [let's talk](/work-with-me).
