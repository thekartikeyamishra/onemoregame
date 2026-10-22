# Deployment (Windows + Firebase App Hosting)

## 1. One-time setup
```powershell
npm install -g firebase-tools
firebase login
gcloud auth application-default login     # for operator scripts against Firestore
```
1. Create a Firebase project (Blaze plan is required by App Hosting). Create **two** projects or backends if you want separate staging and production.
2. Firestore → create database (Native mode, region `asia-south1` for India-first latency).
3. Deploy rules, indexes and TTL policies:
   ```powershell
   firebase use --add            # select the project
   firebase deploy --only firestore
   ```
   `firestore.indexes.json` declares the composite indexes and TTL fields (`rateLimits`, `mailOutbox`, `sessions`, `loginTokens`, `runStarts` `.expireAt`; `waitlistSignups.purgeAt`). Confirm they show as **Serving** under Firestore → TTL.
4. Email: create a Resend account, verify your sending domain (SPF/DKIM DNS records), create an API key.
5. Secrets (stored in Cloud Secret Manager, never in Git):
   ```powershell
   # 48 random bytes for APP_SECRET:
   [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
   firebase apphosting:secrets:set APP_SECRET
   firebase apphosting:secrets:set RESEND_API_KEY
   ```
   Keep a secure copy of APP_SECRET: emails are stored under keyed hashes, so changing it orphans existing records.
6. Edit `apphosting.yaml`: `NEXT_PUBLIC_SITE_URL`, `MAIL_FROM`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_OPERATOR_NAME`.

## 2. Create the backend
```powershell
firebase apphosting:backends:create --project YOUR_PROJECT_ID
```
Connect the GitHub repo and `main` branch. Each push builds and rolls out. Grant the backend access to the secrets when prompted (or `firebase apphosting:secrets:grantaccess APP_SECRET --backend BACKEND_ID`).

## 3. Custom domain & HTTPS
App Hosting → your backend → Settings → Domains → add domain, create the DNS records shown. HTTPS certificates are provisioned automatically. Only after HTTPS works, set `NEXT_PUBLIC_SITE_URL=https://yourdomain` (this also enables HSTS and `upgrade-insecure-requests`).

## 4. Verify on staging before production
- Submit the form → email arrives from your domain → confirm link works → share link redirects.
- `npm run metrics` (with the deployed APP_SECRET in your shell) shows the counts.
- Firestore console: documents have hashed IDs; no raw IP addresses.
- Run Lighthouse against the staging URL; `curl -I https://staging/verify` shows `no-store`.

## 5. Operating
```powershell
$env:APP_SECRET="<same as deployed>"; $env:NEXT_PUBLIC_SITE_URL="https://yourdomain"
$env:RESEND_API_KEY="..."; $env:MAIL_FROM="ONE MORE <hello@yourdomain>"
npm run invites:issue -- --count 25 --dry-run
npm run invites:issue -- --count 25
# Test the game yourself: request access with your own email, confirm it, then issue invites (oldest confirmed first).
npm run outbox:retry
npm run signup:delete -- --email person@example.com
npm run metrics
```
Clear these variables from the shell afterwards. Budget alerts: Cloud Billing → Budgets & alerts (alerts notify, they don't cap spend).

## Cost notes
At waitlist scale the design stays inside or near free tiers: each signup ≈ 3–5 Firestore writes, each confirmation ≈ 3–6 reads/writes, rate limiting adds one transaction per submission. App Hosting bills Cloud Run time (scales to zero with `minInstances: 0`; first request after idle is a cold start of a few seconds). Resend's free tier covers early volumes; check current pricing pages before launch.
