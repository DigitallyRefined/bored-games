// Pure checkers rules shared between the API engine (api/src/games/checkers.ts)
// and the app (app/src/lib/checkers.ts). No server or UI dependencies.
//
// The board is the absolute, server-side orientation: player 0 ("Dark") occupies
// the bottom three rows and moves upward; player 1 ("Light") occupies the top
// three rows and moves downward. Only dark squares are playable — diagonal
// moves always keep a checker on the same colored squares.

export type CheckersOwner = 0 | 1;

export interface CheckersPiece {
  owner: CheckersOwner;
  king: boolean;
}

export type CheckersCell = CheckersPiece | null;
export type CheckersBoard = CheckersCell[];

export const CELL_COUNT = 64;
export const DRAW_MOVES_LIMIT = 60;

export function rowOf(index: number): number {
  return Math.floor(index / 8);
}

export function colOf(index: number): number {
  return index % 8;
}

export function isPlayableSquare(index: number): boolean {
  return index >= 0 && index < CELL_COUNT && (rowOf(index) + colOf(index)) % 2 === 1;
}

function forwardDirection(owner: CheckersOwner): number {
  return owner === 0 ? -1 : 1;
}

function promotionRowFor(owner: CheckersOwner): number {
  return owner === 0 ? 0 : 7;
}

// Flips an absolute board index into the mirror orientation used when viewing
// the board from the opposite side (the involution maps back to itself).
export function flipIndex(index: number): number {
  return CELL_COUNT - 1 - index;
}

export interface MoveOption {
  to: number;
  jumped: number | null;
}

export function stepOptions(board: CheckersBoard, from: number): MoveOption[] {
  const piece = board[from];
  if (!piece) return [];

  const options: MoveOption[] = [];
  const rowDirs = piece.king ? [-1, 1] : [forwardDirection(piece.owner)];
  const colDirs = [-1, 1];

  for (const dr of rowDirs) {
    for (const dc of colDirs) {
      const step = from + dr * 8 + dc;
      if (isPlayableSquare(step) && board[step] === null) {
        options.push({ to: step, jumped: null });
        continue;
      }

      const mid = from + dr * 8 + dc;
      const to = from + dr * 16 + dc * 2;
      const jumped = board[mid];
      if (
        isPlayableSquare(to) &&
        board[to] === null &&
        jumped &&
        jumped.owner !== piece.owner
      ) {
        options.push({ to, jumped: mid });
      }
    }
  }

  return options;
}

export function captureOptions(board: CheckersBoard, from: number): MoveOption[] {
  return stepOptions(board, from).filter((option) => option.jumped !== null);
}

export function ownerHasCapture(board: CheckersBoard, owner: CheckersOwner): boolean {
  for (let i = 0; i < CELL_COUNT; i++) {
    const piece = board[i];
    if (!piece || piece.owner !== owner) continue;
    if (captureOptions(board, i).length > 0) return true;
  }
  return false;
}

// Legal destinations for the piece at `from`, honoring the mandatory-capture rule.
export function legalOptions(board: CheckersBoard, from: number): MoveOption[] {
  const piece = board[from];
  if (!piece) return [];
  const options = stepOptions(board, from);
  if (ownerHasCapture(board, piece.owner)) {
    return options.filter((option) => option.jumped !== null);
  }
  return options;
}

// Piece indices that may legally move for `owner` (respects mandatory captures).
export function playableSources(board: CheckersBoard, owner: CheckersOwner): number[] {
  const sources: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const piece = board[i];
    if (!piece || piece.owner !== owner) continue;
    if (legalOptions(board, i).length > 0) sources.push(i);
  }
  return sources;
}

export function createInitialBoard(): CheckersBoard {
  const board: CheckersBoard = Array.from({ length: CELL_COUNT }, () => null);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const index = r * 8 + c;
      if ((r + c) % 2 !== 1) continue;
      if (r <= 2) board[index] = { owner: 1, king: false };
      else if (r >= 5) board[index] = { owner: 0, king: false };
    }
  }
  return board;
}

export interface ApplyResult {
  board: CheckersBoard;
  capturedCount: number;
  promoted: boolean;
}

// Applies a validated full path (single move or capture chain) to a board copy.
export function applyPath(board: CheckersBoard, path: number[]): ApplyResult {
  const sim = board.slice();
  const moving = sim[path[0]];

  if (!moving) return { board: sim, capturedCount: 0, promoted: false };

  let pos = path[0];
  let capturedCount = 0;
  let promoted = false;

  for (let i = 1; i < path.length; i++) {
    const prev = pos;
    const cur = path[i];
    const dr = rowOf(cur) - rowOf(prev);

    sim[prev] = null;
    let piece = moving;
    if (Math.abs(dr) === 2) {
      const mid =
        ((rowOf(prev) + rowOf(cur)) / 2) * 8 + (colOf(prev) + colOf(cur)) / 2;
      sim[mid] = null;
      capturedCount += 1;
    }
    if (!piece.king && rowOf(cur) === promotionRowFor(moving.owner)) {
      piece = { owner: moving.owner, king: true };
      promoted = true;
    }
    sim[cur] = piece;
    pos = cur;
  }

  return { board: sim, capturedCount, promoted };
}

// After an in-progress capture chain, the only legal continuations are further
// captures with the same piece (unless it was crowned and the move ends).
// A turn is either one simple step or a capture chain — never a mix — so a path
// that began with a non-capturing step can never continue.
export function continuationOptions(board: CheckersBoard, path: number[]): MoveOption[] {
  if (path.length === 0) return [];
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const cur = path[i];
    const dr = rowOf(cur) - rowOf(prev);
    const dc = colOf(cur) - colOf(prev);
    if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return [];
  }
  const { board: sim, promoted } = applyPath(board, path);
  if (promoted) return [];
  return captureOptions(sim, path[path.length - 1]);
}

export function validatePath(
  board: CheckersBoard,
  path: number[],
  owner: CheckersOwner
): boolean {
  if (!Array.isArray(path) || path.length < 2) return false;

  for (const square of path) {
    if (typeof square !== "number" || !Number.isInteger(square)) return false;
    if (!isPlayableSquare(square)) return false;
  }

  const first = board[path[0]];
  if (!first || first.owner !== owner) return false;
  if (path[0] === path[1]) return false;

  const sim = board.slice();
  let pos = path[0];
  let capturedAny = false;
  let promoted = false;

  for (let i = 1; i < path.length; i++) {
    const prev = pos;
    const cur = path[i];
    if (cur === prev || sim[cur] !== null) return false;

    const dr = rowOf(cur) - rowOf(prev);
    const dc = colOf(cur) - colOf(prev);

    if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
      // A turn is either one simple step into an open square or a capture
      // chain in which every leap captures a piece — never a mix of both.
      if (capturedAny || path.length > 2) return false;
      if (!first.king && dr !== forwardDirection(owner)) return false;
      sim[prev] = null;
      sim[cur] = first;
      pos = cur;
      if (!first.king && rowOf(cur) === promotionRowFor(owner)) promoted = true;
      continue;
    }

    if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
      // Capture leap over an opponent piece (forward-only for men)
      if (!first.king && dr !== forwardDirection(owner) * 2) return false;
      const mid =
        ((rowOf(prev) + rowOf(cur)) / 2) * 8 + (colOf(prev) + colOf(cur)) / 2;
      const jumped = sim[mid];
      if (!jumped || jumped.owner === owner) return false;
      sim[prev] = null;
      sim[mid] = null;
      sim[cur] = first;
      pos = cur;
      capturedAny = true;
      // A man that reaches the last row is crowned and the move ends.
      if (!first.king && rowOf(cur) === promotionRowFor(owner)) {
        promoted = true;
        if (i !== path.length - 1) return false;
      }
      continue;
    }

    return false;
  }

  if (!capturedAny) {
    // If any capture was available on the starting board, a capture was mandatory.
    if (ownerHasCapture(board, owner)) return false;
  } else if (!promoted) {
    // A capture chain must continue while the same piece can still jump.
    if (captureOptions(sim, pos).length > 0) return false;
  }

  return true;
}

export function hasLegalMove(board: CheckersBoard, owner: CheckersOwner): boolean {
  const mustCapture = ownerHasCapture(board, owner);
  for (let i = 0; i < CELL_COUNT; i++) {
    const piece = board[i];
    if (!piece || piece.owner !== owner) continue;
    for (const option of stepOptions(board, i)) {
      if (!mustCapture || option.jumped !== null) return true;
    }
  }
  return false;
}

export function isMutualSingularKings(board: CheckersBoard): boolean {
  const counts: [number, number] = [0, 0];
  for (const cell of board) {
    if (!cell) continue;
    counts[cell.owner] += 1;
    if (!cell.king) return false;
  }
  return counts[0] === 1 && counts[1] === 1;
}

export function pieceCounts(board: CheckersBoard): [number, number] {
  const counts: [number, number] = [0, 0];
  for (const cell of board) {
    if (!cell) continue;
    counts[cell.owner] += 1;
  }
  return counts;
}

export interface GameOverResult {
  winnerIndex: CheckersOwner | null;
  isDraw: boolean;
}

// Outcome of a board with `currentPlayer` to move. Returns null while the game
// is live. Mirrors the rules validated against tournament checkers:
// a player with no legal move loses; a stale position (no capture or promotion
// in DRAW_MOVES_LIMIT moves) is a draw; and a bare single king vs single king
// is a draw unless one side can still capture the other.
export function checkOutcome(
  board: CheckersBoard,
  currentPlayer: CheckersOwner,
  movesWithoutProgress: number
): GameOverResult | null {
  // Current player has no legal move (no pieces or completely blocked): they lose.
  if (!hasLegalMove(board, currentPlayer)) {
    return { winnerIndex: currentPlayer === 0 ? 1 : 0, isDraw: false };
  }

  // No capture or promotion in a long time: stale position, draw.
  if (movesWithoutProgress >= DRAW_MOVES_LIMIT) {
    return { winnerIndex: null, isDraw: true };
  }

  // One lone king vs one lone king cannot be forced: draw, so long as no
  // capture is available anywhere (a capture may still decide the game).
  if (isMutualSingularKings(board)) {
    if (!ownerHasCapture(board, 0) && !ownerHasCapture(board, 1)) {
      return { winnerIndex: null, isDraw: true };
    }
  }

  return null;
}