# Deploying on Vercel (onemoregame.me)

## 1. Domains — fixes ERR_TOO_MANY_REDIRECTS
The app no longer redirects hosts itself; Vercel does it. In **Vercel → Project → Settings → Domains**:
1. Add `onemoregame.me` if it isn't listed. Edit it: **Connect to an environment: Production**, **no redirect**.
2. Edit `www.onemoregame.me`: choose **Redirect to `onemoregame.me`** (308 Permanent).
3. Follow Vercel's DNS instructions at your registrar (typically an `A` record for the apex and a `CNAME` for `www`).
Vercel enforces HTTPS automatically. Canonical URLs, the sitemap and emails all use `https://onemoregame.me`.

## 2. Environment variables (Settings → Environment Variables → Production)
| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://onemoregame.me` |
| `APP_SECRET` | 48+ random characters (PowerShell: `[Convert]::ToBase64String((1..48 \| % { Get-Random -Max 256 }))`). Keep a copy; changing it orphans existing signups |
| `DATA_BACKEND` | `firestore` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Contents of the service-account JSON key (see 3), pasted as-is |
| `MAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | From resend.com after verifying the `onemoregame.me` domain (SPF/DKIM DNS records) |
| `MAIL_FROM` | `ONE MORE <support@onemoregame.me>` |
| `TRUSTED_PROXY_HOPS` | `0` (Vercel sets `x-forwarded-for` to the real client IP) |
| `NEXT_PUBLIC_ADS_ENABLED` | `false` until AdSense approves the site |

Don't set `ALLOW_INSECURE_DEV_BACKENDS` on Vercel. Without `APP_SECRET`, Firestore credentials or a Resend key, the game APIs return 503 by design; `https://onemoregame.me/api/health` shows whether the data store is reachable.

After changing variables, **redeploy** (Deployments → ⋯ → Redeploy) — `NEXT_PUBLIC_*` values are baked in at build time.

## 3. Firestore credentials for Vercel
1. Firebase console → project **onemoregameme** → upgrade to **Blaze** (required for TTL clean-up policies; add a budget alert).
2. `firebase deploy --only firestore:rules,firestore:indexes` from your machine.
3. Google Cloud console → IAM & Admin → **Service accounts** → Create: name `vercel-onemore`, role **Cloud Datastore User** (least privilege for Firestore reads/writes).
4. Open it → Keys → Add key → JSON. Paste the whole file into `FIREBASE_SERVICE_ACCOUNT_KEY` on Vercel, then **delete the downloaded file**. Never commit it.
   If key creation is blocked by an organisation policy (`iam.disableServiceAccountKeyCreation`), allow it for this project or host on Firebase App Hosting instead (no key needed).

## 4. Check after deploy
- `https://www.onemoregame.me` → one redirect → `https://onemoregame.me`
- `https://onemoregame.me/api/health` → `{"ok":true,"backend":"firestore",...}`
- `https://onemoregame.me/ads.txt` and `/sitemap.xml` load
- Play today's arena, enter your email, confirm from the inbox
