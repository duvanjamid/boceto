/**
 * WireScript Themes
 * Token map consumed by all renderers (React, HTML, Canvas).
 *
 * Add your own:
 *   import { THEMES } from "./src/themes.js";
 *   THEMES.myTheme = { bg: "...", ... };
 */

export const THEMES = {
  /** Warm cream — default */
  paper: {
    bg: "#f8f7f4", surface: "#ffffff", border: "#d6d3cc", borderD: "#b0aca4",
    ink: "#1a1916", inkMid: "#6b6760", inkFaint: "#a8a49e",
    fill: "#eceae5", blue: "#3b5bdb", accent: "#1a1916", accentFg: "#f8f7f4",
  },
  /** Technical, engineering */
  blueprint: {
    bg: "#0d1f3c", surface: "#112348", border: "#1e4080", borderD: "#2a5aaa",
    ink: "#a8cfff", inkMid: "#5a8fd4", inkFaint: "#2a5090",
    fill: "#0a1830", blue: "#60a5fa", accent: "#a8cfff", accentFg: "#0d1f3c",
  },
  /** Clean, hand-drawn feel */
  sketch: {
    bg: "#ffffff", surface: "#fafafa", border: "#222222", borderD: "#111111",
    ink: "#111111", inkMid: "#444444", inkFaint: "#999999",
    fill: "#f0f0f0", blue: "#1a56db", accent: "#111111", accentFg: "#ffffff",
  },
  /** Dark minimal */
  noir: {
    bg: "#141414", surface: "#1e1e1e", border: "#2e2e2e", borderD: "#444444",
    ink: "#f0f0f0", inkMid: "#aaaaaa", inkFaint: "#555555",
    fill: "#252525", blue: "#60a5fa", accent: "#f0f0f0", accentFg: "#141414",
  },
};
