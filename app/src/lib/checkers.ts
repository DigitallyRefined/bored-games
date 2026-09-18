// Checkers helpers for the app. The pure game rules live in
// `shared/games/checkers.ts` (also used by the API engine); this module
// re-exports them and adds app-specific UI constants and shims.

export * from "@shared/games/checkers";
export { checkOutcome as gameResult } from "@shared/games/checkers";

export const BOARD_COLORS = {
  light: "#F0D9B5",
  dark: "#B58863",
  frame: "#8A5A2B",
  frameLight: "#A9743B",
  frameShadow: "#5D3A1A",
  accent: "#F4B63E",
  darkPiece: {
    rim: "#5B4230",
    base: "#3E2E22",
    innerBorder: "#241A12",
    crown: "#F2E6C9",
  },
  lightPiece: {
    rim: "#C9AE7E",
    base: "#F2E7CF",
    innerBorder: "#9C7E52",
    crown: "#3A2C1D",
  },
} as const;