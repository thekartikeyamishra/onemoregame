import { Composition } from "remotion";
import { Film, type FilmProps } from "./Film";
import { DURATION, FPS } from "./theme";

const defaults: FilmProps = { domain: "onemoregame.me", withVoiceover: false };

export const Root = () => (
  <>
    <Composition id="LaunchLandscape" component={Film} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={defaults} />
    <Composition id="LaunchVertical" component={Film} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={defaults} />
    <Composition id="LaunchSquare" component={Film} durationInFrames={DURATION} fps={FPS} width={1080} height={1080} defaultProps={defaults} />
  </>
);
