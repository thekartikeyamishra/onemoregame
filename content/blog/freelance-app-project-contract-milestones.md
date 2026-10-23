---
title: "Hiring a freelance app developer: milestone payments and a contract that prevents ghosting"
description: "Structure a freelance app project so neither side carries all the risk: milestones, acceptance criteria, payment terms, code ownership and exit plans."
seoTitle: "Milestone contracts for freelance app projects"
date: 2026-10-21
tags: ["hiring", "contracts", "planning", "MVP"]
faq:
  - q: "How much should I pay a freelance developer up front?"
    a: "Enough to secure their time, not enough to fund the whole project. Paying for a short discovery phase up front, then paying per delivered milestone, keeps the amount at risk on either side to one milestone at a time."
  - q: "Who should own the code and accounts?"
    a: "You should. Create the code repository, app store accounts, cloud projects and domain in your organisation's name from day one, and give the developer access. Intellectual property should transfer to you as each milestone is paid."
---

Almost everyone who has hired a developer has a story: the project that was "90% done" for four months, the freelancer who stopped replying after the second payment, the agency that delivered something that technically matched the brief and was completely unusable.

These stories rarely start with a bad person. They start with a structure where one side carries most of the risk. Fix the structure and most of the problems go away, for both sides. This guide is written for founders, but it's the structure I'd want as the developer too.

## Why projects go wrong

Three patterns cause most failed engagements:

1. **Large payments for vague deliverables.** "50% up front, 50% on completion" for a three-month build means the client funds months of work with no way to check progress, and the developer has no income until a distant, disputed finish line.
2. **No shared definition of done.** "Build the booking feature" means something different to everyone in the room.
3. **No visibility.** Without regular working builds, problems surface late, when they're expensive and emotional.

## Step 1: Pay for discovery first

Before agreeing a full price, pay for a short discovery phase, usually one to two weeks. The output should be:

- a written scope: every screen and feature, and what's explicitly out of scope;
- low-fidelity wireframes or a clickable prototype;
- a technical plan: platform, stack, third-party services and their running costs;
- a milestone plan with a price and timeline for each.

Discovery typically costs a small fraction of the build. If the relationship doesn't work, you've lost little and you keep a scope document any other team can quote against. Before discovery, sanity-check your budget with the [app cost calculator](/tools/app-cost-calculator).

## Step 2: Split the build into milestones of 1–3 weeks

Each milestone should deliver something you can use on a real phone, not "backend 50% done". For example:

| Milestone | Delivers | Share of price |
|---|---|---|
| 1. Foundation | Sign-in, navigation, design system, builds on your phone | 15% |
| 2. Core flow | The main outcome works end to end with test data | 25% |
| 3. Payments and notifications | Real payments in test mode; push working | 20% |
| 4. Polish and admin | Empty states, errors, analytics, basic admin | 20% |
| 5. Launch | Store listings, privacy pages, production release | 20% |

With short milestones, the most either side can lose is one milestone's worth of work or money.

## Step 3: Write acceptance criteria for each milestone

For every milestone, list testable statements:

- "A new user can sign up with email or Google and lands on the home screen."
- "Booking a class reduces available spots by one and sends a confirmation push notification."
- "The app works on Android 10+ and iOS 16+, on screens from 360 to 430 points wide."

Agree on an acceptance window, for example five working days to test and report issues against the criteria. If no issues are reported in that time, the milestone is accepted. This protects the developer from endless review and gives you a clear moment to check.

Changes outside the criteria are change requests: quoted separately and added as new milestones. That isn't bureaucracy; it's how both sides keep the scope honest.

## Step 4: Payment terms that are fair to both sides

- **A modest deposit** to secure the developer's time, often the first milestone's price or 10–20%.
- **Payment on acceptance** of each milestone, within a fixed number of days.
- **Escrow** through a platform or a third party if trust hasn't been established yet.
- **No large final balloon payment.** It creates the strongest incentive for disputes at the end.

## Step 5: Own everything from day one

Most "hostage" situations happen because the developer controls the accounts. Avoid them:

- The **code repository** lives in your GitHub (or similar) organisation. The developer is invited as a collaborator.
- **App store, cloud and domain accounts** are registered by you, with the developer added as a team member.
- **Intellectual property** transfers to you as each milestone is paid, written into the contract.
- **Secrets** (API keys, passwords) are stored in a shared password manager or the cloud provider's secret store, never only on the developer's laptop.

## Step 6: Build in visibility

- A **weekly demo build** installed on your phone (TestFlight for iOS, internal testing for Android).
- A **shared task board** showing what's in progress, done and blocked.
- **Commits pushed to your repository** at least daily.
- A **regular short call** at a fixed time, so silence is noticeable quickly.

Visibility is the antidote to ghosting. When progress is shown every week, a week of silence is an early signal, not a three-month surprise.

## Step 7: Plan for the exit

Write down what happens if the engagement ends early, on either side:

- **Notice period:** for example, ten working days.
- **Handover:** latest code pushed, documentation of setup and deployment, credentials transferred.
- **Payment for work in progress:** pro rata for the current milestone, against what's actually in the repository.
- **Dispute process:** a conversation first, then mediation, and the governing law and courts.

Because you own the repository and accounts, another developer can pick up the work. That's the real protection against a developer disappearing.

## Red flags when choosing someone

- Refuses milestone payments for a large build.
- Wants to create the store or cloud accounts under their own name.
- Can't show working apps they've built, or references you can speak to.
- Quotes a fixed price without asking detailed questions.
- Promises dates for features nobody has scoped.

And a few green flags: asks about your users before your features, pushes back on scope, explains trade-offs in plain language, and sends things in writing.

## A contract outline

A good engagement contract covers, at minimum: parties; scope reference (the discovery document); milestones, deliverables and acceptance criteria; payment schedule; change requests; intellectual property and licences for third-party components; confidentiality; data protection responsibilities (see the [DPDP and GDPR checklist](/blog/dpdp-act-gdpr-checklist-for-app-founders)); warranty and bug-fix period; termination and handover; liability limits; governing law and dispute resolution. Have a lawyer review it for your jurisdiction.

## Summary

Small milestones, written acceptance criteria, payment on delivery, client-owned accounts and weekly working builds. None of it is complicated, and together they make a failed project rare and recoverable when it happens.

If you're looking for a developer who works this way by default, [tell me about your project](/work-with-me). And if you haven't scoped it yet, start by [deciding what to cut from version one](/blog/mvp-scope-what-to-cut-from-version-one).
