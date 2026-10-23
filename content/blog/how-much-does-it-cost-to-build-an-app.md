---
title: "How much does it cost to build an app in 2026? A line-by-line breakdown"
description: "Real 2026 ranges for building a mobile or web app, feature by feature, with rates for India, Europe, the UK and the US, plus the running costs quotes omit."
date: 2026-10-21
seoTitle: "How much does it cost to build an app in 2026?"
tags: ["app costs", "MVP", "planning"]
faq:
  - q: "What is the cheapest way to build an app in 2026?"
    a: "Build one platform or a progressive web app first, use managed services for sign-in, payments and chat, keep the design on a good UI kit, and hire an experienced freelancer or small Indian team with milestone payments. A focused MVP this way can cost a few thousand US dollars."
  - q: "How much does a simple app cost in India?"
    a: "A tightly scoped first version on one platform typically costs ₹2–6 lakh with an experienced Indian freelancer or small agency. A cross-platform app with sign-in, payments and push notifications usually lands between ₹4 lakh and ₹20 lakh, depending on design depth and who builds it."
  - q: "How long does it take to build an app?"
    a: "A focused MVP usually takes 6 to 16 weeks of calendar time. Marketplaces, chat-heavy apps and regulated products take longer because of real-time features, moderation and compliance work."
---

Ask ten agencies what your app will cost and you'll get ten numbers, some of them five times apart. That isn't because nine of them are lying. It's because "an app" isn't a unit of anything. A booking tool for one salon and a two-sided marketplace with chat are both "an app", and they differ by an order of magnitude in effort.

This guide breaks the cost down the way an engineer scopes it, so you can build your own estimate and check any quote against it. If you'd rather click than read, the [app cost calculator](/tools/app-cost-calculator) runs exactly this model.

## The short answer

For a first version (an MVP) built by a competent team in 2026:

| App type | Typical effort | India (agency) | UK (agency) | US (agency) |
|---|---|---|---|---|
| Simple PWA or single-platform app | 250–450 hours | $6k–$22k | $19k–$63k | $25k–$90k |
| Cross-platform app with payments | 450–800 hours | $11k–$40k | $34k–$112k | $45k–$160k |
| Marketplace or chat-heavy app | 900–1,600 hours | $22k–$80k | $67k–$224k | $90k–$320k |

The spread inside each cell is real. The low end assumes a tight scope and a team that has built the same thing before; the high end assumes discovery happens during the build, which is how most budgets get blown.

## What you're actually paying for

Every serious estimate has the same six parts. When a quote doesn't show them, ask.

### 1. The foundation (40–64 hours)

Before a single feature exists, someone has to set up the project architecture, development and production environments, automated builds, crash reporting, and store accounts. This is the same for a to-do app and a fintech app, and it's the part cheap quotes quietly skip, which is why their apps can't be updated six months later.

### 2. Features (most of the bill)

Effort per feature for one experienced engineer, before platform multipliers:

- **Sign-in with email, Google and Apple:** 24–40 hours. Managed services like Firebase Auth keep it at the low end.
- **Push notifications:** 12–24 hours, more if you need scheduling or per-topic preferences.
- **Payments or subscriptions:** 40–80 hours. Store billing, receipts, refunds and the webhooks that keep your database honest.
- **In-app chat:** 60–120 hours. Real-time delivery, read states, media and moderation are each their own small project.
- **Offline mode:** 40–96 hours. Syncing data that was edited in two places is one of the hardest problems in app development.
- **Admin dashboard:** 48–100 hours. Often forgotten, always needed once real users arrive.
- **An AI feature:** 40–110 hours. The model call is the easy part; prompts, retrieval, evaluation, rate limits and cost controls are the work.

Add up what you need. If the total frightens you, good: that's the signal to [cut version one](/blog/mvp-scope-what-to-cut-from-version-one) before anyone writes code.

### 3. The platform multiplier

Engineering effort scales with how many codebases you maintain:

- **PWA:** about 0.8–0.9× (one codebase, no store review, installable from the browser)
- **One native platform:** 1×
- **iOS and Android with Flutter or React Native:** about 1.2–1.35×
- **iOS and Android fully native:** about 1.8–1.95×

Cross-platform frameworks are now mature enough that "fully native for both" is rarely the right first move. More on that in [Flutter vs React Native for startups](/blog/flutter-vs-react-native-for-startups-2026).

### 4. Design (24–200 hours)

Design mostly doesn't multiply by platform, because one design system serves both stores. A clean build on a quality UI kit takes 24–48 hours. A custom design system takes 60–120. Custom illustration and motion design can reach 200. Spend here only where it changes behaviour, such as onboarding and the first moment of value.

### 5. Testing and project management (+26–37%)

Quality assurance typically adds 18–25% of build effort, and project management 8–12%. A quote without either isn't cheaper; it just moves that work onto you.

### 6. Compliance (+4–35%)

If your app stores personal data, you need consent capture, a way to export and delete a user's data, retention rules and security safeguards. For apps serving Indian users, India's DPDP Act and its 2025 Rules make most of this mandatory; for European users, the GDPR already does. Health, finance and children's apps sit at the top of the range. The [DPDP and GDPR checklist](/blog/dpdp-act-gdpr-checklist-for-app-founders) lists what to build.

## Hourly rates by region

Rounded ranges from published freelance and agency rate surveys, in US dollars:

| Team | Rate per hour (clients abroad) |
|---|---|
| Freelancer in India | $15–$30 |
| Agency in India | $25–$50 |
| Agency in Eastern Europe | $40–$80 |
| Agency in the UK | $75–$140 |
| Agency in the US | $100–$200 |

### In rupees, for clients in India

Indian teams price Indian clients in rupees, at rates well below what they charge abroad. Published 2026 rate cards and agency pricing guides put experienced freelancers at roughly **₹600–₹1,500 an hour** and agencies at roughly **₹1,200–₹2,800 an hour** (very junior freelancers go lower, but their quotes rarely include testing, release and support). In project terms:

| What you're building | Typical range in India |
|---|---|
| Tightly scoped MVP, one platform, 3–5 core features | ₹2–6 lakh |
| Cross-platform app with sign-in, payments and push | ₹4–20 lakh |
| Marketplace, chat-heavy or AI-heavy app | ₹7–40 lakh |
| Regulated products (fintech, health) | ₹20 lakh and up |

The [calculator](/tools/app-cost-calculator) switches to these domestic rupee rates automatically when you pick ₹ with an Indian team, and shows a smaller phase-1 option alongside the full scope.

Two things matter more than the rate itself. First, how many productive hours per week you actually get: a solo freelancer delivers fewer hours than a team, so your calendar time stretches. Second, how much rework the team generates. A $45/hour engineer who gets it right first time is cheaper than a $20/hour one who needs three attempts.

## A worked example

Say you want an iOS and Android app for a fitness studio: sign-in, profiles, class booking, payments, push reminders and basic analytics, with a custom look, built in Flutter by an Indian agency.

1. Foundation plus features: 40–64 + 24–40 + 16–32 + 40–90 + 40–80 + 12–24 + 8–20 = **180–350 hours**
2. Cross-platform multiplier (1.2–1.35×): **216–473 hours**
3. Custom design: **+60–120 hours**, giving 276–593
4. Testing and management (+26–37%): roughly **348–812 hours**
5. Standard privacy work (+4–8%): roughly **362–877 hours**
6. At $25–$50 an hour: **about $9,000–$44,000**, or roughly 5–12 weeks with a small team

That's a wide range, and it should be. The way to narrow it is a short paid discovery that turns "class booking" into specific screens and rules. Discovery usually costs 5–10% of the build and saves far more.

## The costs after launch

Most first-time founders budget for the build and forget the next twelve months:

- **Maintenance:** plan for 15–20% of the build cost per year. Apple and Google ship major OS releases every year, libraries go out of date, and something will break.
- **Store fees:** the Apple Developer Program costs $99 a year; a Google Play developer account is a one-time $25.
- **Hosting and services:** usually small at launch, from free tiers to a few hundred dollars a month, but it scales with users. Model it per user, not per month.
- **AI usage:** if your app calls a language model, every message has a price. Without caching and limits it can exceed your subscription revenue. See [how to keep LLM costs under control](/blog/control-llm-costs-in-production-apps).
- **Store commission:** Apple and Google take a cut of in-app purchases and subscriptions. Check the current rates for your category and revenue level before you set prices.

## How to read a quote

When the proposals arrive, check each one for:

- **A feature list with hours or story points.** A single lump sum hides the assumptions you'll be arguing about later.
- **Testing, project management and compliance as separate lines.**
- **Milestones with acceptance criteria and payment attached.** Paying 50% up front for a large build puts all the risk on you. A [milestone-based contract](/blog/freelance-app-project-contract-milestones) fixes that.
- **Ownership.** The code repository, store accounts and cloud projects should be in your name from day one.
- **What happens after launch.** A bug-fix window, and a monthly rate for maintenance after it.

If a quote is far below the ranges above, find out what it leaves out. If it's far above, ask what risk they're pricing in. Sometimes they've spotted something you haven't.

## Bottom line

App costs are predictable once you stop treating the app as a single item. List the features, choose the platform deliberately, size the design to what matters, and add the testing, management and compliance that real products need. Then compare quotes line by line, not total by total.

Run your own numbers in the [calculator](/tools/app-cost-calculator), and if you want a scope you can sign, [tell me about your project](/work-with-me).
