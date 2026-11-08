# Shop and payments: setup, money flow and review rules

ONE MORE sells **optional, cosmetic-only** items. Nothing paid changes scores, rules, hitboxes or leaderboard
eligibility, which keeps the game fair and passes store review.

| Product id | What it is | Website price | Why players buy |
|---|---|---|---|
| `founder_pack` | All skins and trails, Replay Studio, permanent ★ Founder badge, name on the Founders Wall. **Sold until 31 Oct 2027.** | ₹299 (₹581 value) | Belonging, being early, backing an indie developer, status on leaderboards |
| `replay_studio` | Save any verified run as a 30 s vertical video (name, score, onemoregame.me) | ₹99 | Pride. It's offered right after a personal best, beaten challenge or 3-star clear. Each clip shared also advertises the game. |
| `skin_ember`, `skin_glacier`, `skin_neon` | Orb skins | ₹49 | Self-expression |
| `skin_gold`, `skin_glitch` | Premium orb skins | ₹79 | Status. The skin colour shows next to your name on the leaderboard. |
| `trail_comet`, `trail_pixel` / `trail_lightning` | Trails | ₹49 / ₹79 | Look good in replays and Shorts |

**When offers appear:** players see an offer only at a proud moment, at most once per visit. Watching the replay is
free; saving it is paid. There are no offers after a loss, no timers, no random boxes and no subscriptions.

## How it works

```
Apps (Android/iOS) ── RevenueCat plugin ── Google Play Billing / Apple StoreKit
        │                    │ webhook → /api/billing/revenuecat → re-reads RevenueCat API
        └── /api/shop/sync ──┘                                       ↓
Website ── Razorpay Checkout → /api/shop/verify (signature) ──→ Firestore players.{webOwned, storeOwned, owned, equipped, badge}
                     └──── webhook → /api/billing/razorpay (backup + refunds)
```

- The server is the source of truth, so a modified app can't unlock anything for the account or the leaderboard.
- In the apps, guests can buy without an account (Apple requires this). Signing in moves the purchases onto the
  account (RevenueCat `logIn`), and then they work on the website too.
- **Restore purchases** is on the Shop page (Apple requires it).
- Inside the apps, only Google Play or Apple payments are offered. Razorpay is never shown in the apps.
- Ledger: `purchases/ord_<razorpay order id>` keeps website orders (`created` → `paid` → `refunded`). The account ID
  comes from the email, so a re-created account can restore website purchases.

## 1. Google Play Console (Android)
1. **Setup → Payments profile**: legal name, address, **PAN**, GST (if registered), and an Indian **bank account**.
   Google pays out monthly (around the 15th) once the balance clears the threshold.
2. **Monetize → Products → In-app products → Create product** for each id above. Use the exact id, a title and a
   description. Set the price in INR; Play converts it for other countries. Then **Activate** each one.
3. Join the **15% service fee tier**: Play Console → Settings → *Developer account → Service fee*. It's the default
   on your first $1M a year; check it's active.
4. **Policy → App content**: Ads *No*; in the content rating, digital purchases *Yes*; Data safety: add **Purchase
   history** (see MOBILE-STORES §5).
5. Testing: **Setup → License testing**, add your Gmail, then buy in the closed-test build. Test purchases are free.

## 2. App Store Connect (iOS)
1. **Business → Agreements**: sign the **Paid Apps Agreement**, add bank and tax details (W-8BEN for India). Apple
   pays monthly.
2. Apply for the **App Store Small Business Program** (developer.apple.com/app-store/small-business-program). It
   gives a 15% commission.
3. **Your app → Monetization → In-App Purchases → +**: type **Non-Consumable**, product ID exactly as above, price
   tier (₹49 / ₹79 / ₹99 / ₹299), display name, description, review screenshot (Shop page) and review note
   *"Cosmetic item; Shop in the menu"*.
4. On the app version page, under **In-App Purchases and Subscriptions**, add all products so they're reviewed with
   the build. This matters on the first submission.
5. Test with a **Sandbox tester** (Users and Access → Sandbox) on a TestFlight build.

## 3. RevenueCat (free until your revenue grows)
1. app.revenuecat.com → **Create project "ONE MORE"**.
2. **Apps → + → Play Store**: package `com.kartikeyamishra.onemore`. Upload a Google Cloud service-account JSON with
   Play access (RevenueCat shows the exact steps). Copy the public key that starts with `goog_`.
3. **Apps → + → App Store**: bundle `com.kartikeyamishra.onemore`, then add the App Store Connect *In-App Purchase
   key* (.p8). Copy the public key that starts with `appl_`.
4. **Products**: import all 10 products from both stores.
5. **Entitlements**: create **one entitlement per product with the same identifier** (for example, entitlement
   `skin_gold` → product `skin_gold` on Play and on the App Store). The server reads these.
6. **Project settings → API keys → Secret key (v1)**: copy the key that starts with `sk_`.
7. **Integrations → Webhooks → +**: URL `https://onemoregame.me/api/billing/revenuecat`. Authorization header: a
   long random string you generate, the same value as `REVENUECAT_WEBHOOK_AUTH`.

## 4. Razorpay (website checkout: UPI, cards, netbanking, wallets; about 2% fee)
1. dashboard.razorpay.com → sign up and complete **KYC** (PAN, bank account, website `https://onemoregame.me`).
   Business category: *Gaming → Digital goods*. Policy URLs: Terms `/terms#purchases`, Privacy `/privacy#purchases`,
   Contact `/contact`. Razorpay checks these pages during activation.
2. **Settings → Payment capture → Automatic** (immediate).
3. **Settings → API keys → Generate** (live mode). You'll get a Key ID and a Key Secret.
4. **Settings → Webhooks → + Add**: URL `https://onemoregame.me/api/billing/razorpay`, a secret you generate, and the
   events **order.paid**, **payment.captured** and **refund.processed**.
5. Settlements reach your bank on T+2 days by default.

## 5. Vercel environment variables (Production)
Never paste these into chat or commit them.

| Name | Value | Exposed to the browser? |
|---|---|---|
| `NEXT_PUBLIC_RC_ANDROID_KEY` | `goog_…` | yes (public SDK key) |
| `NEXT_PUBLIC_RC_IOS_KEY` | `appl_…` | yes (public SDK key) |
| `REVENUECAT_SECRET_KEY` | `sk_…` | **no** |
| `REVENUECAT_WEBHOOK_AUTH` | your random string | **no** |
| `RAZORPAY_KEY_ID` | `rzp_live_…` | no (sent to checkout per order) |
| `RAZORPAY_KEY_SECRET` | secret | **no** |
| `RAZORPAY_WEBHOOK_SECRET` | your webhook secret | **no** |

Redeploy after saving. Anything left empty switches off cleanly: the website shows "checkout opens soon" and the apps
show "Purchases open soon".

## 6. Checks before launch
- Test on the website with Razorpay **test mode** keys and test card `4111 1111 1111 1111`. Then switch to live keys.
- On Android, buy with a license tester. On iOS, use a sandbox account. In both: Restore purchases, sign in on another
  device and check the item is there, then refund once and check the item disappears.
- Confirm the Founder ★ shows on the leaderboard after your next Daily Arena score.

## 7. Money per buyer (approximate)
| | Website ₹299 | Play/App Store ₹299 |
|---|---|---|
| GST (18%, included in the price) | −₹46 | −₹46 (the store collects and remits it in India) |
| Fee | Razorpay ~2% −₹6 | Store 15% of the net −₹38 |
| **You receive** | **≈ ₹247** | **≈ ₹215** |

Delivery costs about ₹0: cosmetics are drawn in code, and owning an item is one database field. The video is rendered
on the player's device. Income tax applies to your net income; ask a CA about GST registration (it becomes mandatory
above the threshold, and Razorpay asks for it).
