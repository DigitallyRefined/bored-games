#!/usr/bin/env node
// Regenerates the app asset PNGs that build the launcher/splash artwork.
// Mirrors the art drawn by src/components/CheckersPreview.tsx: a wooden frame
// around an 8x8 checkers board with the starting pieces (owner 0 / dark at the
// bottom, owner 1 / light at the top). Colors match BOARD_COLORS in
// src/lib/checkers.ts; output files are the ones referenced by app.config.ts.

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const C = {
  light: [0xf0, 0xd9, 0xb5],
  dark: [0xb5, 0x88, 0x63],
  frame: [0x8a, 0x5a, 0x2b],
  darkPiece: [0x3e, 0x2e, 0x22],
  lightPiece: [0xf2, 0xe7, 0xcf],
  black: [0x00, 0x00, 0x00],
};

const ASSETS = path.join(__dirname, "..", "assets", "images");

// Which cells carry a visible piece in the preview: one row of pieces beyond
// those whose color fills in, but only the raw `createInitialBoard` pieces are
// drawn in a non-transparent color (rows 0, 1 for light; 6, 7 for dark).
function pieceOwner(row, col) {
  if ((row + col) % 2 !== 1) return null;
  if (row <= 1) return 1;
  if (row >= 6) return 0;
  return null;
}

function makeCanvas(size) {
  return new PNG({ width: size, height: size });
}

function blendPixel(data, idx, [r, g, b], a) {
  const inv = 1 - a;
  data[idx] = Math.round(r * a + data[idx] * inv);
  data[idx + 1] = Math.round(g * a + data[idx + 1] * inv);
  data[idx + 2] = Math.round(b * a + data[idx + 2] * inv);
  data[idx + 3] = Math.round(255 * a + data[idx + 3] * inv);
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function roundedBoxDist(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function fillRoundedRect(png, rect, radius, color) {
  const { data } = png;
  const cx = rect.x + rect.size / 2;
  const cy = rect.y + rect.size / 2;
  const hw = rect.size / 2;
  const hh = rect.size / 2;
  const x0 = Math.floor(rect.x);
  const x1 = Math.ceil(rect.x + rect.size);
  const y0 = Math.floor(rect.y);
  const y1 = Math.ceil(rect.y + rect.size);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = roundedBoxDist(x + 0.5, y + 0.5, cx, cy, hw, hh, radius);
      const a = clamp01(0.5 - d);
      if (a > 0) blendPixel(data, (y * png.width + x) * 4, color, a);
    }
  }
}

function fillRect(png, x, y, w, h, color) {
  const { data } = png;
  for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy++) {
    for (let xx = Math.floor(x); xx < Math.ceil(x + w); xx++) {
      const i = (yy * png.width + xx) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
    }
  }
}

function fillCircle(png, cx, cy, r, color) {
  const { data } = png;
  const x0 = Math.floor(cx - r - 1);
  const x1 = Math.ceil(cx + r + 1);
  const y0 = Math.floor(cy - r - 1);
  const y1 = Math.ceil(cy + r + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r;
      const a = clamp01(0.5 - d);
      if (a > 0) blendPixel(data, (y * png.width + x) * 4, color, a);
    }
  }
}

function drawBoard(png, board, { light, dark, silhouette, drawFrame = true }) {
  const { data } = png;
  if (drawFrame) {
    const t = board.size * (3 / 74);
    const radius = board.size * (6 / 74);
    fillRoundedRect(
      png,
      { x: board.x - t, y: board.y - t, size: board.size + t * 2 },
      radius,
      C.frame
    );
  }

  const cell = board.size / 8;
  for (let y = Math.floor(board.y); y <= Math.ceil(board.y + board.size); y++) {
    for (let x = Math.floor(board.x); x <= Math.ceil(board.x + board.size); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const u = (px - board.x) / cell;
      const v = (py - board.y) / cell;
      if (u < 0 || u >= 8 || v < 0 || v >= 8) continue;
      const row = Math.floor(v);
      const col = Math.floor(u);
      const isDark = (row + col) % 2 === 1;
      if (silhouette && !isDark) continue;

      const dEdge = Math.min(px - board.x, board.y + board.size - px, py - board.y, board.y + board.size - py);
      const a = clamp01(0.5 + dEdge);
      blendPixel(data, (y * png.width + x) * 4, silhouette ? C.black : isDark ? dark : light, a);
    }
  }

  if (silhouette) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const owner = pieceOwner(row, col);
        if (owner === null) continue;
        fillCircle(
          png,
          board.x + (col + 0.5) * cell,
          board.y + (row + 0.5) * cell,
          cell * 0.275,
          C.black
        );
      }
    }
    return;
  }

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const owner = pieceOwner(row, col);
      if (owner === null) continue;
      fillCircle(
        png,
        board.x + (col + 0.5) * cell,
        board.y + (row + 0.5) * cell,
        cell * 0.275,
        owner === 0 ? C.darkPiece : C.lightPiece
      );
    }
  }
}

function centeredBoard(size, fraction) {
  const outer = size * fraction;
  return { x: (size - outer) / 2 + outer * (3 / 80), y: (size - outer) / 2 + outer * (3 / 80), size: outer * (74 / 80) };
}

function writePng(name, png) {
  const out = path.join(ASSETS, name);
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log(`wrote ${out} (${png.width}x${png.height})`);
}

// Legacy launcher icon: full preview art, frame edge to edge, rounded corners.
{
  const size = 1024;
  const png = makeCanvas(size);
  fillRoundedRect(png, { x: 0, y: 0, size }, size * (6 / 80), C.frame);
  drawBoard(png, centeredBoard(size, 1), { light: C.light, dark: C.dark });
  writePng("icon.png", png);
}

// Android adaptive icon background: flat cream, matches the light squares.
{
  const size = 512;
  const png = makeCanvas(size);
  fillRect(png, 0, 0, size, size, C.light);
  writePng("android-icon-background.png", png);
}

// Android adaptive icon foreground: board + frame, centered in the safe zone.
{
  const size = 512;
  const png = makeCanvas(size);
  const board = centeredBoard(size, 0.62);
  board.x -= board.size * (3 / 74);
  board.y -= board.size * (3 / 74);
  drawBoard(png, board, { light: C.light, dark: C.dark });
  writePng("android-icon-foreground.png", png);
}

// Android adaptive icon monochrome (themed icons): checkerboard silhouette.
{
  const size = 432;
  const png = makeCanvas(size);
  const board = centeredBoard(size, 0.62);
  drawBoard(png, board, { light: C.light, dark: C.dark, silhouette: true, drawFrame: false });
  writePng("android-icon-monochrome.png", png);
}

// Splash image: transparent art (board on the wood frame color it sits against).
{
  const size = 228;
  const png = makeCanvas(size);
  const board = centeredBoard(size, 0.92);
  drawBoard(png, board, { light: C.light, dark: C.dark });
  writePng("splash-icon.png", png);
}