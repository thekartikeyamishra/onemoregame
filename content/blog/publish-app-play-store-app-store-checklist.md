---
title: "Publishing your first app on Google Play and the App Store: the checklist nobody gives you"
seoTitle: "Publish an app on Google Play and the App Store: checklist"
description: "Accounts, fees, testing rules, privacy forms, store listings and review pitfalls for first-time app founders publishing to Google Play and Apple's App Store."
date: 2026-10-21
tags: ["launch", "Android", "iOS", "planning"]
faq:
  - q: "How much does it cost to publish an app?"
    a: "Google Play charges a one-time $25 registration fee. The Apple Developer Program costs $99 per year. Both stores also take a commission on in-app sales of digital goods and subscriptions; check the current rates for your situation."
  - q: "Why can't I publish my app to production on Google Play right away?"
    a: "Personal developer accounts created after 13 November 2023 must first run a closed test with at least 12 testers who stay opted in for 14 consecutive days, then apply for production access from the Play Console dashboard."
---

The last 10% of an app project often takes a surprising share of the calendar. Store accounts need verification, testing rules gate production access, privacy forms ask questions you haven't thought about, and a single rejection can cost a week. Plan for it from the start and launch day stops being a scramble.

> Store policies change frequently. Treat this as a planning checklist and confirm current requirements in the Play Console and App Store Connect help pages before you submit.

## 1. Accounts: start early, in the right name

- **Google Play Console:** one-time $25 fee. Choose a **personal** or **organisation** account. Organisation accounts need a D-U-N-S number and business verification, which can take days or weeks. Personal accounts are faster to open but have extra testing requirements (below).
- **Apple Developer Program:** $99 a year. Enrol as an individual or as an organisation (again, a D-U-N-S number is needed).
- **Open both in your own or your company's name**, never your developer's. If your developer controls the accounts, they control your app. See [milestone contracts that prevent ghosting](/blog/freelance-app-project-contract-milestones).
- Use a shared company email (for example, apps@yourdomain) so access doesn't depend on one person's inbox.

## 2. Google Play's testing requirement for new personal accounts

For personal developer accounts created after 13 November 2023, Google requires a **closed test with at least 12 testers who stay opted in continuously for at least 14 days** before you can apply for production access.

How to make it painless:

- Recruit testers early: your waitlist, friends who match the target user, and interviewees from your [validation work](/blog/validate-app-idea-before-building).
- Ask more than 12, because some will opt out.
- Use the two weeks productively: collect feedback, fix crashes, refine onboarding.
- Answer the production-access questions honestly and specifically: what you tested, what you learned, what you changed.

Organisation accounts aren't subject to this specific requirement, which is one reason businesses register as organisations.

## 3. Builds and technical requirements

- **Android:** publish an Android App Bundle (AAB), sign with Play App Signing, and target the API level Google currently requires (it rises every year, so check before each release).
- **iOS:** build with a recent Xcode and SDK, as Apple requires for new submissions, and test on real devices, not just simulators.
- **Versioning:** a clear version scheme and release notes for every build.
- **Crash reporting and analytics** set up before testing starts, so the test phase produces data.
- **Store-ready configuration:** production API keys, real payment configuration, push certificates and keys, deep links verified.

## 4. Privacy declarations

Both stores ask detailed questions about the data your app collects. Answer from your data map, not from memory:

- **Google Play Data safety form:** what data is collected and shared, why, whether it's encrypted in transit, and whether users can request deletion.
- **Apple App Privacy details ("nutrition labels"):** data types, whether they're linked to the user, and whether they're used for tracking.
- **App Tracking Transparency (iOS):** if you track users across other companies' apps or sites, you must ask permission with Apple's prompt.
- **Privacy policy URL:** required by both stores, publicly accessible, and accurate.
- **Third-party SDKs count.** Analytics, ads and crash reporting libraries collect data too; include them.

Mismatches between your forms, your policy and what the app actually does are a common reason for rejections and, worse, later enforcement. The [DPDP and GDPR checklist](/blog/dpdp-act-gdpr-checklist-for-app-founders) helps you build the data map.

## 5. Account deletion

If users can create an account in your app:

- **Apple** requires that they can also start deleting it from within the app.
- **Google Play** requires an in-app path and a web link where users can request deletion of their account and data, declared in the Data safety section.

Build this into version one; retrofitting it the week before submission is stressful.

## 6. Payments and commissions

- Digital goods and subscriptions sold inside the app generally must use the store's billing system, and the store takes a commission. Physical goods and real-world services (food delivery, rides, bookings) can usually use your own payment provider.
- Rules and rates vary by region, programme and business size, and have changed several times in recent years. Check the current policy for each store and market before choosing a pricing model.
- Model the commission in your unit economics from the start.

## 7. Store listing that converts

- **Name and subtitle/short description:** clear outcome, natural keywords, no keyword stuffing.
- **Screenshots** that tell a story: the outcome first, then the two or three key features, readable on a phone.
- **Icon** that's recognisable at small sizes.
- **Description:** what it does, who it's for, what's free and what's paid. No claims you can't support.
- **Content rating questionnaires** answered accurately.
- **Localised listings** for your main markets, even if the app is in one language.

## 8. App review: avoid the common rejections

- **Broken or incomplete features**, placeholder text, or "coming soon" screens.
- **Login walls with no demo account.** Give reviewers working credentials and notes.
- **Crashes on the reviewer's device**, often on older OS versions or iPads if you declared iPad support.
- **Metadata that doesn't match the app** (screenshots of features that don't exist).
- **Missing privacy policy or account deletion.**
- **Minimal functionality:** an app that's just a wrapped website with nothing app-like is likely to be rejected by Apple. If that's where you are, a [PWA](/blog/pwa-vs-native-app-2026) may be the better first step.

Reply to rejections calmly and specifically in the resolution centre; most are resolved in one round when you address exactly what the reviewer cited.

## 9. Launch day and the week after

- Release with a **staged rollout** on Google Play (for example 10%, then 50%, then 100%) and phased release on iOS, watching crash-free rates.
- Turn your store buttons live on your website and tell your waitlist first. (On this site, setting the store URLs switches the "Coming soon" badges to real links automatically.)
- Reply to early reviews, especially negative ones, with fixes.
- Track activation and retention, not just downloads.

## A timeline that works

| When | What |
|---|---|
| Project start | Open store accounts; start organisation verification if needed |
| Mid-build | Privacy data map, policy draft, account deletion designed |
| 3–4 weeks before launch | Closed testing starts (12+ testers for 14 days on new personal Play accounts); TestFlight beta |
| 2 weeks before | Store listings, screenshots, Data safety and App Privacy forms |
| 1 week before | Submit for review with demo credentials and notes |
| Launch | Staged rollout; email waitlist; store buttons live |

Budget for store fees and the testing period when you plan; the [app cost calculator](/tools/app-cost-calculator) includes store fees in its estimate. If you'd like help getting through review the first time, [let's talk](/work-with-me).
