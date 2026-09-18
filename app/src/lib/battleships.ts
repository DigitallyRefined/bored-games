// Battleships helpers for the app. The pure game rules live in
// `shared/games/battleships.ts` (also used by the API engine); this module
// re-exports them and adds app-specific UI constants and shims.
//
// The palette is styled after a foldable travel Battleships case: a navy
// clamshell frame around ocean-blue grids, with one red fleet and one blue
// fleet like the original plastic sets.

export * from "@shared/games/battleships";

export const BATTLE_COLORS = {
  oceanLight: "#9AD0E8",
  oceanDark: "#82BFDA",
  oceanLine: "#5C9CC0",
  frame: "#24435A",
  frameLight: "#35698A",
  frameShadow: "#163042",
  spine: "#102A3C",
  accent: "#FF6B6B",
  hit: "#F33A44",
  hitPale: "#F33A4422",
  miss: "#FFFFFF",
  missRim: "#C7D3DA",
  shipRed: {
    base: "#E74C3C",
    light: "#FF8A75",
    dark: "#B03A2E",
    rim: "#7E2A20",
  },
  shipBlue: {
    base: "#3498DB",
    light: "#7FB8E6",
    dark: "#1F6390",
    rim: "#134260",
  },
} as const;

export function fleetPalette(accent: "red" | "blue") {
  return accent === "blue" ? BATTLE_COLORS.shipBlue : BATTLE_COLORS.shipRed;
}