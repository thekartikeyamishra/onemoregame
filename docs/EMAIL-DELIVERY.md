# Email delivery: fixing "I never got the link"

Confirmation, sign-in and invite links are sent through **Resend**. If players get no email, the cause is almost always one of the first three items below.

## 1. Verify the sending domain in Resend (most common cause)
1. Resend → **Domains** → Add `onemoregame.me` (or a subdomain such as `mail.onemoregame.me`).
2. Add the DNS records Resend shows (SPF `TXT`, DKIM `TXT`/`CNAME`, and the MX record for bounces) at your DNS provider.
3. Wait until every record shows **Verified**.
4. Add a DMARC record if you don't have one yet: `TXT _dmarc  v=DMARC1; p=none; rua=mailto:support@onemoregame.me`.

Until the domain is verified, Resend accepts mail only to your own account email, so everyone else gets nothing.

## 2. Check the environment variables in Vercel
- `RESEND_API_KEY`: a key with **Sending access**. Set it only in Vercel → Settings → Environment Variables. Never paste it in chat or commit it.
- `MAIL_FROM`: must use the **verified** domain, for example `ONE MORE <support@onemoregame.me>`.
- Redeploy after changing either one.
- `GET /api/health` reports `mail: configured` or `missing`.

## 3. Read the logs
- **Resend → Logs** (or Emails) shows every send attempt with its status: delivered, bounced or complained.
- **Vercel → Logs**: search for `[mail]`. A failed send logs `provider_status_<code>: <message>`. For example, 403 means the domain isn't verified and 422 means `MAIL_FROM` is invalid.
- The site now tells the player when sending failed ("We couldn't send the email right now…"). It no longer pretends the email went out.

## 4. Spam and Promotions
New domains often land in Spam or Gmail's Promotions tab for the first few days. Deliverability improves as people open the emails. Ask early testers to mark the email "Not spam".

## What each address gets (the app's behaviour)
| Situation | Email sent |
|---|---|
| New address on the waitlist | Confirmation link (`/verify`) |
| Same address again within the cooldown | Nothing new; the form says to check Spam and Promotions |
| Unconfirmed address on the sign-in page | A fresh confirmation link |
| Confirmed address (waitlist or sign-in) | A sign-in link (`/play/sign-in/confirm`, valid 15 minutes, single use) |
| Unknown address on the sign-in page | A "no account yet" note linking to early access (at most once every 10 minutes) |
