import { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Background } from "./Background";
import { Arena, Campus, Intro, Outro, Play, Social } from "./scenes";
import { DURATION, S } from "./theme";

export interface FilmProps extends Record<string, unknown> {
  /** Real public domain for the end card, e.g. "onemore.example". Leave empty until configured. */
  domain: string;
  /** Set true only after placing a recorded voiceover at public/voiceover.wav. */
  withVoiceover: boolean;
}

function useFont() {
  const [handle] = useState(() => delayRender("Loading font"));
  useEffect(() => {
    const font = new FontFace("SpaceGrotesk", `url(${staticFile("fonts/SpaceGrotesk.woff2")}) format("woff2")`, { weight: "300 700" });
    font.load().then((f) => { document.fonts.add(f); continueRender(handle); }).catch(() => continueRender(handle));
  }, [handle]);
}

const cue = (name: string, from: number, volume = 1) => (
  <Sequence from={from} key={`${name}-${from}`}><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>
);

export function Film({ domain, withVoiceover }: FilmProps) {
  useFont();
  const frame = useCurrentFrame();
  // Duck the music bed under the voiceover when present.
  const bedVolume = interpolate(frame, [0, 30, DURATION - 45, DURATION], [0, 1, 1, 0], { extrapolateRight: "clamp" }) * (withVoiceover ? 0.35 : 0.8);
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={S.intro} durationInFrames={S.arena - S.intro}><Intro /></Sequence>
      <Sequence from={S.arena} durationInFrames={S.play - S.arena}><Arena /></Sequence>
      <Sequence from={S.play} durationInFrames={S.social - S.play}><Play /></Sequence>
      <Sequence from={S.social} durationInFrames={S.campus - S.social}><Social /></Sequence>
      <Sequence from={S.campus} durationInFrames={S.outro - S.campus}><Campus /></Sequence>
      <Sequence from={S.outro}><Outro domain={domain} /></Sequence>

      <Audio src={staticFile("sfx/bed.wav")} volume={() => bedVolume} />
      {cue("pulse", 10)}
      {cue("whoosh", S.arena)}
      {[20, 34, 47, 60, 72, 96, 108, 121, 140, 152, 165, 178, 190].map((f) => cue("pickup", S.play + f, 0.6))}
      {cue("hit", S.play + 84, 0.7)}
      {cue("whoosh", S.social)}
      {cue("whoosh", S.campus)}
      {cue("pickup", S.campus + 120, 0.8)}{cue("pickup", S.campus + 140, 0.8)}{cue("pickup", S.campus + 160, 0.8)}
      {cue("riser", S.outro - 60, 0.7)}
      {cue("impact", S.outro)}
      {withVoiceover ? <Audio src={staticFile("voiceover.wav")} /> : null}
    </AbsoluteFill>
  );
}
