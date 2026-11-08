# ONE MORE on Android and iOS — build, store listing and review checklist

The apps live in `mobile/` (Capacitor 8). They open the live game at `https://onemoregame.me/play?source=app`,
so every web update reaches app players instantly and scores stay server-verified. Native extras:

- Haptics (hits, power-ups, big combos, attacks, level-ups, wins), the native share sheet, Android back button,
  dark system bars, splash screen.
- **Offline Practice**: with no connection the app shows a playable, unranked practice arena built from the
  real engine (`mobile/www/offline.html`), not an error page.
- Full-screen play on phones, safe areas (notch, home indicator), portrait and landscape, tablets and foldables.
- **No web ads inside the apps** (AdSense isn't allowed in app WebViews). The website keeps its ads.
- In-app **account deletion** (Account → Delete my account) and a public deletion page
  (`https://onemoregame.me/account/delete`).
- Battle **Report / hide player** on every player chip and on the results board (user-generated names).

Versions (October 2026): Android minSdk 24, **targetSdk 36** (Google Play requires API 36 for new apps and
updates from 31 Aug 2026), iOS 15+, built with **Xcode 26 / iOS 26 SDK** (required for App Store uploads
since 28 Apr 2026).

---

## 1. One-time setup on your PC

```powershell
cd E:\one-more\mobile
npm install
npm run sync          # builds offline.js, copies config into android/ and ios/, applies store settings
```

`android/` and `ios/` are already generated, with icons and splash screens. To regenerate them, delete the
folder and run `npm run add:android` or `npm run add:ios`.

## 2. Android (Windows is fine)

1. Install **Android Studio** (Otter 2025.2.1 or newer). Open it once and let it install the SDK.
2. `npm run open:android` (or File → Open → `E:\one-more\mobile\android`). Wait for Gradle sync.
3. Test: plug in a phone (Developer options → USB debugging) or start an emulator → ▶ Run.
   Check: game plays full screen, vibration on hits, Share opens the share sheet, back button goes back,
   airplane mode shows Offline Practice.
4. Release build: **Build → Generate Signed App Bundle → Android App Bundle** → *Create new* key store.
   Save the `.jks` file and both passwords somewhere safe **outside the project** (password manager).
   Losing it means you can't update the app. Output: `android/app/release/app-release.aab`.
5. Next version: Build → Generate Signed Bundle again, after raising `versionCode` (Gradle property
   `-PversionCode=2`, or edit `android/app/build.gradle`).

### Google Play Console
1. Create a developer account at play.google.com/console ($25 once). Choose **Personal** or
   **Organization** (SEEVE Tech; needs a D-U-N-S number). Complete identity verification.
2. **Create app**: name *ONE MORE*, default language English (India), **Game**, **Free**.
3. **Personal accounts created after Nov 2023 must run a closed test with at least 12 testers for 14 days**
   before production. Testing → Closed testing → create track → upload the `.aab` → add testers (Google
   Group or emails; Discord community is perfect) → share the opt-in link. Keep them opted in for 14 days.
4. App content (left menu → Policy → App content), answer exactly:
   - **Privacy policy**: `https://onemoregame.me/privacy`
   - **App access**: All functionality is available without special access (guests can play; email sign-in
     is optional).
   - **Ads**: *No, my app does not contain ads*.
   - **Content rating** (IARC questionnaire): Category *Game*. No violence beyond abstract shapes, no sexual
     content, no gambling, no profanity. *Users can interact*: **Yes** (visible gamer tags in Battle, no chat).
     *Shares location*: No. *Digital purchases*: **Yes** (optional cosmetic in-app purchases).
   - **Target audience**: **18 and over** (sign-up requires confirming 18+; avoids the Families policy).
     Store presence appeals to children: No.
   - **Data safety** — see the table in §5.
   - **Account deletion URL**: `https://onemoregame.me/account/delete`
   - **Government apps / Financial features / Health**: No.
5. Store listing (Grow → Store presence → Main store listing):
   - Short description (80): *60-second skill arcade. Daily arena, 30 levels, 5v5 Battle. Free, no pay-to-win.*
   - Full description: use §6.
   - App icon 512×512: `https://onemoregame.me/brand/icon-512.png`.
   - Feature graphic 1024×500 and phone screenshots: `mobile/store/` (see §7).
   - Category *Arcade*; contact email support@onemoregame.me; website https://onemoregame.me.
6. After the 14-day closed test: Production → Create release → upload `.aab` → *Send for review*.

## 3. iOS

You need a Mac with **Xcode 26** — or no Mac at all with **Codemagic** (cloud Macs, free tier).

### Apple Developer account
1. developer.apple.com/programs → enroll ($99/year). Individual, or Organization for SEEVE Tech (D-U-N-S).
2. App Store Connect → Apps → **+ New App**: iOS, name *ONE MORE* (if taken: *ONE MORE: 60s Arcade*),
   language English (U.S. or U.K.), bundle ID `com.kartikeyamishra.onemore` (register it under
   Certificates, IDs & Profiles → Identifiers first), SKU `onemore-ios`.

### Build on a Mac
`npm install && npm run sync && npm run open:ios` → select the *App* target → Signing & Capabilities → your
Team → choose a device or simulator → ▶. Release: Product → Archive → Distribute App → App Store Connect.

### Build without a Mac (Codemagic)
1. codemagic.io → sign in with GitHub → add the `onemoregame` repo (it reads `codemagic.yaml`).
2. App Store Connect → Users and Access → Integrations → **App Store Connect API** → generate a key
   (App Manager). In Codemagic: Team settings → Integrations → App Store Connect → add it, name `onemore_asc`.
3. Start the **iOS → TestFlight** workflow. Codemagic creates the signing certificate and profile, builds, and
   uploads to TestFlight. Install **TestFlight** on your iPhone to test.
4. (Optional) Android too: upload your `.jks` under Code signing → Android keystores, reference
   `onemore_upload`, run **Android → AAB**.

### App Store Connect answers
- **App Privacy** (§5): Data used to track you: **None**. Data linked to you: Contact Info (email), User
  Content (gamer name, feedback), Gameplay Content (scores), Identifiers (account ID), Purchases (purchase history). Purpose: App
  Functionality. Not used for tracking, no third-party advertising.
- **Age rating** questionnaire: all *None*, except user-generated content: gamer tags only, with filtering,
  reporting and blocking. Unrestricted web access: **No** (external links open in Safari).
- **Export compliance**: already answered in the build (`ITSAppUsesNonExemptEncryption = NO`, HTTPS only).
- **Sign in with Apple**: not required (no third-party/social sign-in; email links only).
- **Privacy policy URL**: `https://onemoregame.me/privacy` · **Support URL**: `https://onemoregame.me/contact`
- Screenshots: 6.9" iPhone (1290×2796) and 13" iPad (2064×2752) in `mobile/store/`.
- **App Review notes** (paste):
  > ONE MORE is a skill-based arcade game. No login is needed: tap Play to start today's Daily Arena, or
  > Battle → Create room → Start battle (empty seats are filled by AI players, so you can review multiplayer
  > alone). Native features: haptic feedback, native share sheet, offline Practice mode (turn on Airplane Mode
  > and relaunch), full-screen play in portrait and landscape. Optional account: Play → "Already confirmed?
  > Sign in"; account deletion: Account → Delete my account. Players can report or hide other players in
  > Battle (⚑ next to a name); reports are reviewed within 24 hours. Optional cosmetic in-app purchases (Shop, in the
  > site menu, or after a run: Watch replay → Unlock Replay Studio). They don't affect gameplay; Restore purchases is
  > on the Shop page; no account is needed to buy. No ads, no tracking.

## 4. Why these choices pass review (common rejection reasons)

| Rejection risk | How ONE MORE handles it |
|---|---|
| Apple 4.2 *Minimum functionality* ("just a website") | Native haptics, share sheet, offline Practice mode built from the real engine, full-screen game UI, no browser chrome or web navigation menus needed to play |
| Apple 5.1.1(v) / Play *Account deletion* | In-app deletion (Account page) + public URL `/account/delete` |
| Apple 1.2 / Play UGC policy | Name filter, Report and Hide on every player, host can remove players, 24 h review commitment in Terms |
| Play target API | targetSdk 36 (Capacitor 8) |
| Apple SDK minimum | Xcode 26 builds (Codemagic `xcode: latest`) |
| Ads policy (AdSense in WebView) | No ads load inside the apps |
| Broken links / placeholder content | Every page is live; Coming-soon sections are labelled |
| Crashes on launch / blank screen offline | Offline page instead of an error; splash hides after load |
| Privacy policy mismatch | Policy lists exactly what's collected (§5) and how to delete it |

## 5. Data declarations (same answers for Play *Data safety* and Apple *App Privacy*)

| Data | Collected | Why | Optional | Shared |
|---|---|---|---|---|
| Email address | Yes (only if you sign up) | Account, sign-in links, service emails | Yes | No (processed by Resend/Google as service providers) |
| Name (gamer tag / leaderboard name) | Yes | Shown in leaderboards and Battle | Yes | No |
| Game progress, scores, inputs | Yes | Verify scores, leaderboards, levels | No (needed to play ranked) | No |
| User feedback (ratings, comments, reports) | Yes | Improve the game, moderation | Yes | No |
| Purchase history | Yes (only if you buy) | Unlock items on every device | Yes | No (Google Play / Apple / RevenueCat process payments as service providers) |
| Device or other IDs / IP address | Only a keyed hash, briefly, for rate limiting | Security, fraud prevention | No | No |
| Location, contacts, photos, health, payment card/bank details | No (the stores handle payment details) | — | — | — |

Encrypted in transit: **Yes**. Users can request deletion: **Yes** (in app and at `/account/delete`).
Advertising ID: **not used** (no ads in the apps). Tracking: **No**.

## 6. Store description (copy)

> **One minute. One challenge. One more.**
> ONE MORE is a fast, skill-based arcade game. Steer your orb, chain shards into combos up to ×9, dash through
> danger and beat your best — in 60 seconds.
>
> • **Daily Arena** — one shared arena for everyone each day, with a new twist every weekday and a live leaderboard.
> • **Levels** — 30 hand-tuned stages, boss arenas and three stars to chase.
> • **Battle** — 1v1 up to 5v5 with friends: one team collects, the other sabotages with Strikes, Mirrors and
>   Eclipses, then you swap. Fill empty seats with easy, medium or hard AI.
> • **Friend challenges** — send a link; your friend races your ghost on the exact same arena.
> • **Offline Practice** — keep playing without a connection.
>
> Fair by design: every ranked score is verified by replaying your moves on the server. No pay-to-win. No ads
> in the app. Made in India by Kartikeya Mishra (SEEVE Tech).

Keywords (iOS, 100 chars): `arcade,reflex,daily challenge,leaderboard,multiplayer,battle,casual,skill,combo,offline`

## 7. Screenshots

`mobile/store/` contains ready-made images:
- `android-phone-*.png` (1080×1920) and `feature-graphic.png` (1024×500) for Google Play.
- `iphone-69-*.png` (1290×2796) and `ipad-13-*.png` (2064×2752) for the App Store.

They were captured from the real game. Re-capture after big visual changes.

## 8. In-app purchases
The Shop, products, RevenueCat, payouts and review rules are in [MONETIZATION.md](MONETIZATION.md). Create the
products **before** submitting: on iOS, attach the in-app purchases to the app version in App Store Connect so they
are reviewed together.

## 9. Updating the apps
- Web changes (game, pages, fixes): just deploy the website. The apps load it live; no store review needed.
- Native changes (icons, plugins, config): raise the version (Android `versionCode`, iOS build number),
  `npm run sync`, rebuild and upload.
- After launch, set `NEXT_PUBLIC_GOOGLE_PLAY_URL` / `NEXT_PUBLIC_APP_STORE_URL` in Vercel so the website shows
  the store badges.
