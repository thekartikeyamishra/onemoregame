# ONE MORE — Launch film (Remotion)

Independent of the website. Three compositions share one timeline and design tokens but re-lay out per aspect ratio:

| Composition | Size | Use |
|---|---|---|
| `LaunchLandscape` | 1920×1080 | YouTube, homepage, campus screens |
| `LaunchVertical` | 1080×1920 | Reels, Shorts, Stories |
| `LaunchSquare` | 1080×1080 | Feed posts |

35 s at 30 fps. Scenes: intro pulse → arena assembles → concept gameplay → same-seed challenge → Campus Clash bracket + countdown → logo lockup and CTA. Every unfinished feature is labelled on screen ("concept animation", "planned", "example scores").

## Commands (PowerShell)

```powershell
cd film
npm install
npm run studio            # live preview in the browser
npm run render:all        # out/one-more-16x9.mp4, -9x16.mp4, -1x1.mp4
npm run render:web        # muted, smaller file + poster for the website
```

If Remotion can't download its headless Chrome, point it at an installed Chrome:
`$env:REMOTION_BROWSER_EXECUTABLE="C:\Program Files\Google\Chrome\Application\chrome.exe"`

End-card domain and voiceover are input props (set them once the domain exists / the VO is recorded):

```powershell
npx remotion render LaunchLandscape out/one-more-16x9-vo.mp4 --props='{\"domain\":\"yourdomain.com\",\"withVoiceover\":true}'
```

`withVoiceover: true` requires `public/voiceover.wav` and ducks the music bed to 35%.

## Files
- `src/Film.tsx` – timeline, audio cues, font loading
- `src/scenes.tsx` – the six scenes
- `scripts/generate-sfx.mjs` – synthesizes all SFX and the music bed (original, deterministic)
- `VOICEOVER.md`, `subtitles/*.srt`, `CUE-SHEET.md`, `ASSET-MANIFEST.md`

## Website use
Use `render:web` output with `poster` set, `muted playsInline`, no autoplay with sound, `preload="none"`, and link the transcript (VOICEOVER.md text). Respect reduced motion by not autoplaying.
