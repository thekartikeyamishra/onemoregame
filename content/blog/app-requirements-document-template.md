---
title: "How to write an app requirements document developers can actually quote from"
seoTitle: "App requirements document template for accurate quotes"
description: "A practical app requirements document (PRD) template that gets accurate, comparable quotes: users, journeys, screens, rules, integrations and acceptance."
date: 2026-10-21
tags: ["planning", "MVP", "hiring", "app costs"]
faq:
  - q: "How long should an app requirements document be?"
    a: "For a first version, usually 4 to 12 pages. Long enough to list every screen, rule and integration, short enough that a developer reads all of it. Prefer tables and bullet points over prose."
  - q: "Should the requirements document include designs?"
    a: "Rough wireframes or sketches help a lot, even photos of hand-drawn screens. Polished designs aren't needed to get a quote; they are usually part of the project itself."
---

Send the same one-paragraph idea to five developers and you'll get five quotes that can't be compared, because each one guessed a different app. Send a clear requirements document and the quotes converge, the questions get better, and the project that follows has far fewer surprises.

You don't need to be technical to write one. You need to be specific. This template is what developers wish every client sent.

## Why it matters

A requirements document (often called a PRD, product requirements document) does three jobs:

1. **Pricing.** Developers estimate effort feature by feature. If features are vague, they either pad the estimate or underquote and argue later. The [cost breakdown](/blog/how-much-does-it-cost-to-build-an-app) shows how much a single feature like chat or offline sync can swing a budget.
2. **Comparison.** Every bidder quotes the same thing, so you compare price and approach, not guesses.
3. **Acceptance.** It becomes the baseline for what "done" means in your [milestone contract](/blog/freelance-app-project-contract-milestones).

## The template

Copy these sections into a document and fill them in. Use plain language and tables.

### 1. One-paragraph summary

What the app does, for whom, and why now. Include the one-sentence outcome from the [MVP scoping method](/blog/mvp-scope-what-to-cut-from-version-one): "A ___ can ___ in ___, without ___."

### 2. Users and roles

List each type of user and what they can do. Roles drive permissions, screens and testing.

| Role | Who they are | Can do |
|---|---|---|
| Customer | Parents booking a tutor | Search, book, pay, cancel |
| Tutor | Verified teachers | Set availability, accept bookings |
| Admin | You | Verify tutors, refund, view reports |

### 3. Platforms and scale

- Platforms: Android, iOS, web, or a [PWA](/blog/pwa-vs-native-app-2026).
- Expected users in the first 6 and 12 months.
- Countries and languages.
- Devices to support (for example, Android 10+ and iOS 16+).

These answers change architecture and cost more than most features.

### 4. User journeys

Describe the three to five most important journeys step by step, from the user's point of view:

> **Book a trial class.** Parent opens the app → searches "maths, class 8, Gomti Nagar" → sees tutors with price and next free slot → opens a profile → picks a slot → pays ₹299 → gets a confirmation message and a reminder an hour before.

Journeys reveal screens, rules and integrations you'd otherwise forget.

### 5. Screen list

A table of every screen, with its purpose and key elements. Sketches or wireframe links next to each one are a big plus.

| Screen | Purpose | Key elements |
|---|---|---|
| Search results | Find a tutor | Filters (subject, area, price), list, empty state |
| Tutor profile | Decide | Photo, subjects, price, reviews, next slots |
| Checkout | Pay | Slot summary, price, payment, terms |

Don't forget the unglamorous screens: sign-up and login, forgotten password, settings, notifications, empty states, errors, delete account.

### 6. Business rules

The logic behind the screens, written as testable statements. This is where most hidden cost lives.

- A booking can be cancelled up to 12 hours before the slot for a full refund.
- A tutor can't be booked in two places at once.
- Prices include GST; invoices show the tax separately.
- Reviews are only allowed after a completed class.

### 7. Integrations

Every external service, and what it's used for: payments (Razorpay, Stripe, store billing), maps, SMS and WhatsApp, email, analytics, CRM, accounting, AI models. Say if accounts already exist.

### 8. Admin and operations

What you need to run the business: approving users, refunds, reports, content updates, support. Decide what can be a spreadsheet export for version one.

### 9. Data, privacy and compliance

What personal data you collect, why, and how long you keep it; whether children might use the app; which countries' users you'll have. This determines consent flows, data export and deletion features and security work. The [DPDP Act and GDPR checklist](/blog/dpdp-act-gdpr-checklist-for-app-founders) lists what to include.

### 10. Non-functional requirements

- Performance (for example, screens load within two seconds on a mid-range phone on 4G)
- Offline behaviour
- Accessibility (text scaling, screen readers, contrast)
- Security expectations
- Uptime and support hours after launch

### 11. Out of scope

A list of things you're deliberately not building in this version. It prevents misunderstandings and keeps quotes lean.

### 12. Assets and constraints

Existing brand, designs, content, code or APIs; budget range; deadline and why it matters; who makes decisions and how quickly.

### 13. Acceptance criteria

For each major feature, two or three statements you'll test before accepting it:

- "A parent can book and pay for a slot, and both parent and tutor receive confirmations within one minute."
- "Cancelling more than 12 hours ahead triggers an automatic full refund."

## Common mistakes

- **Describing solutions instead of problems.** "Use blockchain for reviews" instead of "reviews must be trustworthy". Let developers propose the solution.
- **Copying a competitor's whole app.** Their app is the result of years of iteration. Specify your first version.
- **No priorities.** Mark each feature must-have, should-have or later. Bidders can then quote both a lean and a full version.
- **Hiding the budget.** A range helps good developers propose the best version you can afford instead of guessing.

## Before you send it

Run your feature list through the [app cost calculator](/tools/app-cost-calculator) to sanity-check the budget, cut anything that isn't a must-have, and ask a developer friend to read it for ten minutes. Every question they ask is a gap to fill before bidders find it.

If you'd like a second pair of eyes on your document, or help writing it during a short discovery phase, [send it over](/work-with-me).
