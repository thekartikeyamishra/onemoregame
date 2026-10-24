export const T = {
  bg: "#060912",
  ink: "#0a0f1f",
  text: "#eef1fa",
  muted: "#a9b2cf",
  cyan: "#3ee6f0",
  violet: "#8b7bff",
  amber: "#ffbf47",
  font: "SpaceGrotesk, system-ui, sans-serif",
};
export const FPS = 30;
export const DURATION = 35 * FPS;
/** Scene boundaries in frames. */
export const S = { intro: 0, arena: 120, play: 270, social: 480, campus: 660, outro: 870 } as const;
