---
title: "MVP scope: a practical method for deciding what to cut from version one"
description: "A step-by-step way to shrink an app idea into a first version you can build in weeks, not months, without cutting the part that proves people want it."
date: 2026-10-21
seoTitle: "MVP scope: what to cut from version one"
tags: ["MVP", "planning", "product"]
faq:
  - q: "How many features should an MVP have?"
    a: "As few as it takes to deliver one complete outcome to one type of user. In practice that's often three to six features, including sign-in. If you can't describe the outcome in one sentence, the scope is still too wide."
  - q: "Should an MVP have an admin panel?"
    a: "Usually not a custom one. For the first few hundred users, a database console, a spreadsheet export or a no-code admin tool is enough. Build a proper admin panel when operations work starts costing real hours every week."
---

Most app budgets aren't blown during development. They're blown in the first meeting, when every idea anyone has ever had about the product goes onto the feature list and nobody takes anything off.

A minimum viable product is not a smaller version of the final app. It's the smallest thing that can answer the riskiest question about your idea, usually "will the right people use this, and keep using it?" Everything that doesn't help answer that question can wait.

Here's a method for getting from a long wish list to a buildable first version.

## Step 1: Write the one-sentence outcome

Finish this sentence: "A ______ can ______ in ______, without ______."

- "A salon owner can fill last-minute cancellations in under five minutes, without calling clients one by one."
- "A JEE aspirant can find which chapters cost them the most marks this week, without a coaching-centre report."

If you need two sentences, you have two products. Pick one. The other becomes version two, or a different app entirely.

## Step 2: List every feature, then sort into three columns

Put every feature from every conversation into a list. Don't argue about them yet. Then sort each one into one of three columns:

1. **Delivers the outcome.** Without this, the sentence from step 1 is false.
2. **Makes the outcome nicer.** Faster, prettier, more convenient, but the outcome still happens without it.
3. **Supports the business.** Admin, analytics, referrals, settings, notifications about other things.

Only column one goes into version one, plus the minimum from column three you need to operate legally and learn from users: basic analytics, a privacy policy, and a way for people to delete their account.

## Step 3: Replace, don't remove

Many column-one features don't need to be built; they need to *happen*. For each one, ask whether a cheaper mechanism delivers the same outcome for the first hundred users.

| Expensive to build | Cheaper substitute for v1 |
|---|---|
| In-app chat | WhatsApp deep link, or email |
| Custom admin dashboard | Database console, spreadsheet export or a no-code admin tool |
| Payments with subscriptions | Payment link, or store billing for a single plan |
| Recommendation engine | A hand-curated list you update weekly |
| Offline sync | Clear "you're offline" state and retry |
| Multi-language support | One language, with strings kept in a file so translation is easy later |

Each substitution can save tens of hours. In the [cost breakdown](/blog/how-much-does-it-cost-to-build-an-app), chat alone is 60–120 hours and offline sync 40–96.

## Step 4: Cut platforms before features

If you're torn between cutting a feature and cutting a platform, cut the platform. Launching on Android only, or as a progressive web app, often removes more effort than any single feature, and it doesn't damage the experience for the people who do get it.

Choose the platform your first users actually carry. In India, that's overwhelmingly Android. For a B2B tool used at a desk, a PWA may be all you need. For a premium consumer product in the US or UK, iOS often comes first.

## Step 5: Set a budget ceiling, then fit the scope to it

Most teams estimate the scope and then discover the price. Do it the other way round. Decide the maximum you can spend to learn whether the idea works (money and weeks), then cut until the estimate fits under it with a 20% buffer.

Use the [cost calculator](/tools/app-cost-calculator) to test combinations: toggle features off and on and watch the range move. It turns an abstract argument about "importance" into a concrete trade-off with a price.

## Step 6: Define what "working" means before you build

Write down the numbers that will tell you the MVP succeeded, before launch, while you're still objective:

- **Activation:** what share of sign-ups complete the outcome once? A reasonable early target is 30–50% for a focused app.
- **Retention:** what share come back in week two, and in week four?
- **Willingness to pay:** how many people accept a price, a pre-order or a paid pilot?

Then make sure analytics events exist for each one. Without them, you'll launch and have opinions instead of evidence.

## Common traps

**"Users expect it."** Users expect apps to work, not to have every feature. A small app that does one thing well beats a large app that does many things slowly.

**"It's only a small feature."** Small features have large edges: empty states, errors, permissions, edge cases, tests, support questions. Multiply your gut estimate by two.

**"We'll need it eventually, so build it now."** You'll build it better later, when real usage tells you what it should do.

**"The investor asked for it."** Investors fund traction. A smaller app with real retention numbers is a better pitch than a large app nobody uses.

## A worked example

Take a common brief: a home-tutor marketplace with parent and tutor profiles, search with filters, chat, booking, payments with escrow, reviews, an admin panel, referrals, and Hindi and English. Run through the [calculator](/tools/app-cost-calculator) as a cross-platform app, that is well over 1,000 hours of work.

The outcome sentence: "A parent in one city can book a verified maths tutor for a trial class within a day." Applying the method:

- **Keep:** parent sign-up, tutor profiles (verified manually by the founder), simple search by subject and area, trial booking
- **Replace:** chat with a WhatsApp link after booking; payments with a payment link for the trial; the admin panel with a spreadsheet export
- **Defer:** reviews, referrals, Hindi, escrow, and tutor self-signup
- **Cut a platform:** Android only, since that's what most parents in the target city use

The new scope is a few hundred hours, roughly a third of the original. More importantly, it reaches real parents months earlier, and the first few hundred bookings will tell you whether escrow, reviews or chat matter at all before you pay for them.

## The test before you commit

Read your final feature list aloud and ask of each item: "If this were missing, would the first hundred users fail to get the outcome?" If the answer is no, it isn't version one.

Want a second opinion on your scope? [Send it over](/work-with-me) and I'll tell you what I'd cut.
