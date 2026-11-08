# Chrome extension (also Edge, Brave, Opera)

A toolbar button that opens a playable 60-second Practice run **instantly, even offline**, with links to the
Daily Arena and Battle, and an optional once-a-day "today's arena is live" reminder. It's a habit trigger for the
desk-bound player and a free distribution channel (the Chrome Web Store is searchable).

## Build
```powershell
cd E:\one-more\mobile
npm install
npm run build:ext      # → mobile\dist\one-more-chrome-extension.zip
```
Test locally: Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → choose `mobile\dist\extension`.

## Publish (Chrome Web Store)
1. chrome.google.com/webstore/devconsole → pay the one-time $5 registration fee → verify your email.
2. **New item** → upload the zip.
3. Store listing:
   - **Name:** ONE MORE: 60-Second Arcade
   - **Summary (132 chars):** A 60-second skill arcade in your toolbar. Practice offline in one click; take on the Daily Arena and Battle friends.
   - **Category:** Games / Entertainment · **Language:** English
   - **Description:** reuse §6 of MOBILE-STORES.md, plus "Works offline from the toolbar. Optional daily reminder."
   - **Screenshots (1280×800):** popup over a desktop page, a run in progress, the Daily Arena page.
   - **Icon:** `mobile/extension/icons/icon-128.png`
4. **Privacy practices tab** (answer exactly):
   - Single purpose: *"Play the ONE MORE arcade game from the toolbar and get an optional daily reminder."*
   - `alarms`: schedules the once-a-day reminder. `notifications`: shows that reminder. `storage`: remembers the
     reminder on/off switch.
   - Remote code: **No**. Data collection: **none of the categories** (the extension collects no user data).
   - Certify the three disclosures. Privacy policy URL: `https://onemoregame.me/privacy`.
5. Submit. Review usually takes a few days. Then add the store link to the website (footer or `/developers`).

## Update
Raise `"version"` in `mobile/extension/manifest.json`, run `npm run build:ext`, upload the new zip.
