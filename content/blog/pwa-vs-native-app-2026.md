---
title: "PWA vs native app in 2026: when a web app is all you need"
seoTitle: "PWA vs native app in 2026: which should you build?"
description: "What progressive web apps can and can't do in 2026, how they compare with native and cross-platform apps on cost, reach and features, and how to choose."
date: 2026-10-21
tags: ["PWA", "MVP", "app costs", "planning"]
faq:
  - q: "Can a PWA send push notifications on iPhone?"
    a: "Yes, since iOS 16.4, as long as the user has added the web app to their home screen and granted permission. In a normal Safari tab, web push is not available on iPhone."
  - q: "Can I publish a PWA on the Google Play Store?"
    a: "Yes. A PWA can be wrapped as a Trusted Web Activity and published on Google Play, with the same listing, reviews and update flow as other apps. Publishing a PWA on Apple's App Store requires a native wrapper and must meet Apple's guidelines for apps that offer more than a repackaged website."
---

"Do we need an app?" is one of the first questions in any product conversation, and in 2026 the honest answer is often "not yet". A progressive web app (PWA) is a website that installs like an app, works offline, sends notifications and opens full-screen without browser chrome. For many first versions, that's everything users need, at a lower cost and with no store review between you and your users.

But PWAs have real limits. Here's how to decide.

## What a PWA is

A PWA is a normal web app with three additions:

- a **web app manifest** (name, icons, colours), so it can be installed to the home screen or desktop;
- a **service worker**, a background script that caches files and data so the app loads instantly and works offline;
- **HTTPS**, which every modern site needs anyway.

Users open it from a link or a search result, and the browser offers to install it. There's no download from a store, no update to approve, and every user always runs the latest version.

## What PWAs can do in 2026

- **Install** on Android, iOS, Windows, macOS and ChromeOS.
- **Work offline** with cached screens and locally stored data.
- **Push notifications** on Android and desktop, and on iOS 16.4+ for web apps added to the home screen.
- **Camera, microphone, location, file uploads, sharing** via standard web APIs.
- **Payments** through Stripe, Razorpay and other web checkouts, without app-store commission on digital goods.
- **Be found by search engines and AI assistants**, because every screen can be a URL with real content. Native apps can't do this.

## Where native (or cross-platform) still wins

- **Deep device features.** Bluetooth Low Energy, NFC, background location, HealthKit and Health Connect, widgets, watch apps and advanced camera pipelines are either unavailable on the web or uneven across browsers, especially Safari on iOS.
- **Background work.** Native apps can sync, track or process in the background far more reliably.
- **Store presence.** Some audiences only look for apps in the App Store or Play Store, and store rankings are a discovery channel in their own right.
- **iOS polish.** PWAs on iPhone are good but still behind Android in some web capabilities, and storage for sites that aren't installed can be cleared after periods of inactivity.
- **Very heavy graphics or computation**, such as complex games or on-device ML at scale.

## Cost and speed

In the [app cost model](/tools/app-cost-calculator), a PWA takes roughly 0.8–0.9× the engineering effort of a single native platform, compared with 1.2–1.35× for iOS and Android through Flutter or React Native, and around 1.9× for two fully native apps. You also skip the $99-a-year Apple fee and the $25 Google Play fee, store review cycles, and the commission stores take on in-app purchases of digital goods.

The bigger saving is time. Releasing a fix is a deploy, not a review. During an MVP, when you change things weekly, that speed compounds.

See [how much it costs to build an app](/blog/how-much-does-it-cost-to-build-an-app) for full ranges.

## A side-by-side view

| | PWA | Cross-platform (Flutter/RN) | Fully native |
|---|---|---|---|
| Effort vs one platform | ~0.8–0.9× | ~1.2–1.35× | ~1.8–1.95× |
| Store listing | Play via TWA; iOS needs wrapper | Yes | Yes |
| Updates | Instant | Store review | Store review |
| Search engine visibility | Yes | No (needs separate site) | No |
| Push notifications | Yes (iOS when installed) | Yes | Yes |
| Offline | Yes | Yes | Yes |
| Deep device APIs | Limited | Most, via plugins | All |
| Background tasks | Limited | Good | Best |

## How to choose

Answer these in order:

1. **Does the core outcome depend on a device feature the web can't reach reliably** (Bluetooth, background location, health data, widgets)? Go cross-platform or native.
2. **Is the primary audience on iPhone and does the product need rich notifications from day one?** A PWA can work, but test the install flow with real users first; many don't know how to add a site to their home screen.
3. **Is discovery through search or links important** (content, tools, marketplaces, B2B)? A PWA's crawlable pages are a major advantage.
4. **Will you change the product weekly during the MVP?** PWA, for instant releases.
5. **Do your users expect to find you in the store?** Publish the PWA on Google Play through a Trusted Web Activity, or plan a cross-platform app for version two.

## A common path: PWA first, then native

Many products start as a PWA to validate demand and learn what users actually do, then build a Flutter or React Native app once the core flow is stable and the case for store presence or device features is clear. If you design the backend and APIs for both from day one, the move is mostly building a new client, not redoing the product.

This works especially well with an [invite-only launch](/blog/validate-app-idea-before-building): send early users a link, watch real usage, then decide where native earns its cost.

## Building a PWA well

- **Performance budget:** fast first load on a mid-range Android phone on 4G. Ship less JavaScript; render content on the server.
- **Offline states** designed on purpose: what works offline, what shows a clear message.
- **An install prompt at the right moment**, after the user has seen value, with simple instructions for iPhone.
- **Notification permission asked in context**, never on first load.
- **Privacy and consent** handled as carefully as in a native app; see the [DPDP and GDPR checklist](/blog/dpdp-act-gdpr-checklist-for-app-founders).

## Bottom line

If your first version doesn't depend on deep device features, a PWA is usually the fastest, cheapest and most discoverable way to put it in front of real users. Choose native or cross-platform when the product genuinely needs what only they can do, or when store presence is part of the strategy.

Not sure which side your idea falls on? [Describe it](/work-with-me) and I'll give you a straight answer.
