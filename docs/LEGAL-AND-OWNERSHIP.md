# Legal, financial and ownership summary (owner: Kartikeya Mishra)

**This is a working checklist, not legal or tax advice.** Laws change. Before taking money from investors,
hiring, or crossing the GST threshold, have a Chartered Accountant (tax) and an advocate (IP and contracts) review it.
In Bengaluru a one-time review usually costs ₹5,000–₹25,000, which is worth it before any of those three events.

## 1. Who owns what today

| Asset | Owner now | Proof / where it lives | Action |
|---|---|---|---|
| Source code, engine, art (drawn in code), sounds (generated in code), text | Kartikeya Mishra (author) | Git history (commits under kartikeyamishra099@gmail.com), `LICENSE` (all rights reserved), `package.json` `"license": "UNLICENSED"` | Keep the GitHub repo **private** before launch, or keep it public only if you accept that people can read it (the licence still forbids copying) |
| Name "ONE MORE", logo, domain onemoregame.me | Kartikeya Mishra | Domain registrar account in your name, 2FA on | Register the trademark (see §3). Turn on auto-renew and registrar lock |
| Player data (accounts, scores) | You are the "data fiduciary" (DPDP Act) / "controller" (GDPR) | Firestore project `onemoregameme` under your Google account | Keep the billing account and Firebase owner role in your name only |
| Store listings, payment accounts | The person or company that signs up | Play Console, App Store Connect, Razorpay, RevenueCat | Use your own legal name now; move to the company when you incorporate (§4) |
| Third-party code | Its authors, under their licences | 147 production packages: MIT, Apache-2.0, ISC, BSD, 0BSD, BlueOak, OFL (fonts), CC-BY-4.0 (data). **No GPL/AGPL.** `sharp`/libvips is LGPL-3.0, used only on the server (fine for a hosted service) | Re-run the audit before each funding round (`npm ls --omit=dev --all`) |

**AI-assisted code:** code written with AI tools is yours to use commercially. In India and the US, copyright needs
human authorship, so keep evidence of your creative direction (the requirements you wrote, design decisions, review,
edits: this chat history and your commit history are that evidence). The real protection for a game is the
**trademark, the domain, the community and the data**, not the code (see INVESTOR-FAQ, moats).

## 2. Contracts that protect ownership
- **Anyone who ever contributes** (freelancer, friend, intern, designer): sign a short **IP assignment +
  confidentiality agreement before work starts** ("all work product is assigned to Kartikeya Mishra / the company").
  Without it, they own what they made. This is the most common way founders lose ownership.
- **Employer check:** read your current employment contract (Xobit Technologies) for "moonlighting", "inventions"
  or "IP assignment" clauses. Build only on your own time and devices, and don't use employer code or data. If the
  clause is broad, get a written **no-claim letter** from the employer. Investors will ask.
- **Players:** the Terms already say players keep nothing in the code or game. Gamer tags and feedback are licensed
  to you to run the game (Terms §UGC).

## 3. Trademark (do this early: about ₹4,500 per class for an individual or startup in India)
- File "ONE MORE" (word mark) and the logo at **ipindia.gov.in** in **Class 9** (downloadable games/apps) and
  **Class 41** (online game services). Class 28 is only for physical games.
- Search first ("one more" is a common phrase; a word + logo combined mark is often easier to register).
- Use ™ after filing and ® only after registration. Internationally, use the **Madrid Protocol** through the Indian
  office when you have traction in a specific country.

## 4. Business structure (when to change)
| Stage | Structure | Why |
|---|---|---|
| Now (testing, little revenue) | **Sole proprietor** (you personally), with a separate bank account for the game | Cheapest; PAN-based; Razorpay and the stores accept individuals |
| Revenue grows, or co-founder/investor | **Private Limited** (or OPC if you stay alone) | Investors can only take equity in a company; limited liability. When you incorporate, sign an **IP assignment from you to the company** (founders often forget this) and move the domain, stores and payment accounts |
| Apply for **DPIIT Startup India recognition** after incorporating | Tax holiday eligibility (80-IAC), easier compliance, self-certification under labour laws | |

## 5. Money and tax (India)
- **Income:** game income is business income. File ITR-3 (or ITR-4 under presumptive tax, section 44AD, if
  eligible). Keep all receipts (Vercel, Google Cloud, Apple, Google, domain) as expenses.
- **GST:** registration is mandatory above ₹20 lakh turnover in a year (services; ₹10 lakh in special-category
  states), and **Razorpay asks for it in many cases**. Online digital-goods sales may require registration earlier:
  ask your CA before turning on website checkout. Shop prices are shown GST-inclusive.
- **App store income:** Google and Apple collect GST on Indian sales and pay you the net amount. Foreign app store
  income is an export of services (generally zero-rated GST; keep a **LUT** filed once registered).
- **Foreign payouts:** money from Google, Apple and AdSense arrives as foreign remittance. Keep the bank's **FIRC/eBRC** for each.
- **AdSense:** submit tax info in AdSense (Form W-8BEN, India–US treaty). It reduces US withholding on US-sourced
  earnings, usually to 0% for ads income.
- **TDS:** if you pay Indian freelancers above the thresholds, deduct TDS (194J/194C).

## 6. Data protection and consumer law (already built in)
| Law | Status in ONE MORE |
|---|---|
| **DPDP Act 2023 (India)** | Notice (Privacy page), consent for updates emails, self-serve deletion (Account → Delete), grievance contact (Refunds page) |
| **GDPR / UK GDPR** | Lawful bases stated, data minimisation (hashed IPs, no tracking cookies), deletion, processors listed (Resend, Google, Razorpay, RevenueCat, Apple) |
| **Children (COPPA, DPDP, GDPR-K)** | Sign-up requires 18+, store target audience 18+, no ads in the apps. Playing without an account collects no personal data |
| **Consumer Protection Act 2019 + E-Commerce Rules 2020 (India)** | Prices incl. taxes, Refunds/Cancellation/Delivery page, grievance officer and timelines, no dark patterns (no fake timers, no loot boxes, one offer per session) |
| **EU digital-content withdrawal** | Checkout states immediate delivery; voluntary 7-day refund on website purchases |
| **App Store / Play policies** | IAP for digital goods in the apps, Restore purchases, account deletion, UGC report/hide, honest data-safety forms |
| **Spam laws (CAN-SPAM, GDPR, TRAI-style rules)** | Marketing emails only with opt-in, one-click unsubscribe, at most 3 win-back emails then stop |
| **Gaming laws in India** | ONE MORE is free-to-play skill gaming with **no money stakes, no cash prizes, no paid entry**. Keep it that way: paid-entry tournaments with cash prizes are regulated (the Online Gaming Act 2025 bans real-money games). Cosmetic purchases and free tournaments are fine |

## 7. Accounts to secure today (single points of failure for ownership)
1. Google account that owns Firebase, Cloud, AdSense, Play Console: **2-step verification with a hardware key or
   authenticator**, two recovery methods, no shared password.
2. GitHub, Vercel, domain registrar, Resend, Razorpay, Apple ID, RevenueCat: same.
3. Store the Android **upload keystore** (`.jks`) and passwords in a password manager **plus** an offline backup.
   Enrol in **Play App Signing** (Google keeps the app signing key; a lost upload key can then be reset).
4. Keep a dated export of the repo (zip) in two places. Revoke the old service-account key you once pasted in chat
   (key id a042c649…) if you haven't already.

## 8. International
- Selling worldwide through Google, Apple and AdSense is fine as an Indian individual. They act as merchant of record
  for app sales and handle VAT/GST abroad.
- Website (Razorpay) sales to foreign buyers need Razorpay International to be enabled. EU VAT can apply to digital
  sales to EU consumers: keep website checkout India-only until volumes justify a merchant-of-record (Paddle/Lemon
  Squeezy) or VAT OSS registration.
