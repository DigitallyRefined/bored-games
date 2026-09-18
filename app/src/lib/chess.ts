// Chess helpers for the app. The pure game rules live in
// `shared/games/chess.ts` (also used by the API engine); this module
// re-exports them and adds app-specific UI constants (wooden colours and
// piece glyphs).

import type { ChessPieceType } from "@shared/games/chess";

export * from "@shared/games/chess";
export { checkOutcome as gameResult } from "@shared/games/chess";

// Filled glyphs are used for both armies so the colours carry the side
// (matching the wooden checkers discs). Colours are set in ChessBoard.
export const PIECE_GLYPHS: Record<ChessPieceType, string> = {
  king: "\u265a",
  queen: "\u265b",
  rook: "\u265c",
  bishop: "\u265d",
  knight: "\u265e",
  pawn: "\u265f",
};

// A simple material score, useful for the captured-tally display.
export const PIECE_VALUES: Record<ChessPieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
};

export const BOARD_COLORS = {
  light: "#F0D9B5",
  dark: "#B58863",
  frame: "#8A5A2B",
  frameLight: "#A9743B",
  frameShadow: "#5D3A1A",
  accent: "#F4B63E",
  coordinate: "rgba(60, 40, 20, 0.4)",
  coordinateDark: "rgba(240, 217, 181, 0.4)",
  promotionBackdrop: "rgba(26, 17, 10, 0.72)",
  darkPiece: {
    base: "#3E2E22",
    rim: "#5B4230",
    outline: "rgba(0, 0, 0, 0.65)",
    glow: "rgba(240, 217, 181, 0.22)",
  },
  lightPiece: {
    base: "#F2E7CF",
    rim: "#FDF7E6",
    outline: "rgba(58, 40, 22, 0.6)",
    glow: "rgba(255, 255, 255, 0.28)",
  },
} as const;