// Pure chess rules shared between the API engine (api/src/games/chess.ts)
// and the app (app/src/lib/chess.ts). No server or UI dependencies.
//
// The board is the absolute, server-side orientation (standard FEN layout):
// row 0 is rank 8 (Black's back rank) and row 7 is rank 1 (White's back
// rank). Player 0 ("White") occupies the bottom two rows and moves first;
// player 1 ("Black") occupies the top two rows. The board is a 64-cell
// row-major array.

export type ChessOwner = 0 | 1;

export type ChessPieceType =
  | "pawn"
  | "knight"
  | "bishop"
  | "rook"
  | "queen"
  | "king";

export interface ChessPiece {
  owner: ChessOwner;
  type: ChessPieceType;
}

export type ChessCell = ChessPiece | null;
export type ChessBoard = ChessCell[];

export const CELL_COUNT = 64;

export interface CastlingRights {
  wk: boolean;
  wq: boolean;
  bk: boolean;
  bq: boolean;
}

export interface ChessMove {
  from: number;
  to: number;
  promotion?: ChessPieceType;
}

export interface ChessState {
  board: ChessBoard;
  currentPlayerIndex: ChessOwner;
  castlingRights: CastlingRights;
  enPassantTarget: number | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  lastMove: ChessMove | null;
}

export const PROMOTION_TYPES: ChessPieceType[] = [
  "queen",
  "rook",
  "bishop",
  "knight",
];

export const INITIAL_COUNTS: Record<ChessPieceType, number> = {
  pawn: 8,
  knight: 2,
  bishop: 2,
  rook: 2,
  queen: 1,
  king: 1,
};

const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
] as const;

const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
] as const;

const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS] as const;

export function rowOf(index: number): number {
  return Math.floor(index / 8);
}

export function colOf(index: number): number {
  return index % 8;
}

export function indexOf(row: number, col: number): number {
  return row * 8 + col;
}

function isInside(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Flips an absolute board index into the mirror orientation used when viewing
// the board from the opposite side (the involution maps back to itself).
export function flipIndex(index: number): number {
  return CELL_COUNT - 1 - index;
}

export function createInitialBoard(): ChessBoard {
  const board: ChessBoard = Array.from({ length: CELL_COUNT }, () => null);
  const back: ChessPieceType[] = [
    "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
  ];
  for (let c = 0; c < 8; c++) {
    board[indexOf(0, c)] = { owner: 1, type: back[c] };
    board[indexOf(1, c)] = { owner: 1, type: "pawn" };
    board[indexOf(6, c)] = { owner: 0, type: "pawn" };
    board[indexOf(7, c)] = { owner: 0, type: back[c] };
  }
  return board;
}

export function createInitialCastlingRights(): CastlingRights {
  return { wk: true, wq: true, bk: true, bq: true };
}

export function createInitialState(): ChessState {
  return {
    board: createInitialBoard(),
    currentPlayerIndex: 0,
    castlingRights: createInitialCastlingRights(),
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    lastMove: null,
  };
}

function otherOwner(owner: ChessOwner): ChessOwner {
  return owner === 0 ? 1 : 0;
}

export function findKing(board: ChessBoard, owner: ChessOwner): number {
  for (let i = 0; i < CELL_COUNT; i++) {
    const piece = board[i];
    if (piece && piece.owner === owner && piece.type === "king") return i;
  }
  return -1;
}

export function isSquareAttacked(
  board: ChessBoard,
  square: number,
  byOwner: ChessOwner
): boolean {
  const r = rowOf(square);
  const c = colOf(square);

  // Enemy pawns attacking the square. A pawn at (pr, pc) attacks the square
  // (pr - 1, pc ± 1) for White and (pr + 1, pc ± 1) for Black.
  const pawnRow = byOwner === 0 ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const pc = c + dc;
    if (!isInside(pawnRow, pc)) continue;
    const piece = board[indexOf(pawnRow, pc)];
    if (piece && piece.owner === byOwner && piece.type === "pawn") return true;
  }

  for (const [dr, dc] of KNIGHT_DELTAS) {
    const nr = r + dr;
    const nc = c + dc;
    if (!isInside(nr, nc)) continue;
    const piece = board[indexOf(nr, nc)];
    if (piece && piece.owner === byOwner && piece.type === "knight") return true;
  }

  for (const [dr, dc] of KING_DELTAS) {
    const nr = r + dr;
    const nc = c + dc;
    if (!isInside(nr, nc)) continue;
    const piece = board[indexOf(nr, nc)];
    if (piece && piece.owner === byOwner && piece.type === "king") return true;
  }

  for (const [dr, dc] of QUEEN_DIRS) {
    let nr = r + dr;
    let nc = c + dc;
    while (isInside(nr, nc)) {
      const piece = board[indexOf(nr, nc)];
      if (piece) {
        if (piece.owner === byOwner) {
          const rookRay = dr === 0 || dc === 0;
          const requires = rookRay ? "rook" : "bishop";
          if (piece.type === "queen" || piece.type === requires) return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

export function isInCheck(board: ChessBoard, owner: ChessOwner): boolean {
  return isSquareAttacked(board, findKing(board, owner), otherOwner(owner));
}

function pushPawnMoves(
  board: ChessBoard,
  from: number,
  enPassantTarget: number | null,
  results: ChessMove[]
): void {
  const piece = board[from];
  if (!piece) return;

  const owner = piece.owner;
  const dir = owner === 0 ? -1 : 1;
  const r = rowOf(from);
  const c = colOf(from);
  const startRow = owner === 0 ? 6 : 1;
  const promoRow = owner === 0 ? 0 : 7;

  const one = r + dir;
  if (isInside(one, c) && board[indexOf(one, c)] === null) {
    if (one === promoRow) {
      for (const t of PROMOTION_TYPES) {
        results.push({ from, to: indexOf(one, c), promotion: t });
      }
    } else {
      results.push({ from, to: indexOf(one, c) });
      if (r === startRow && board[indexOf(one + dir, c)] === null) {
        results.push({ from, to: indexOf(one + dir, c) });
      }
    }
  }

  for (const dc of [-1, 1]) {
    const cr = one;
    const cc = c + dc;
    if (!isInside(cr, cc)) continue;
    const to = indexOf(cr, cc);
    const target = board[to];
    if (target && target.owner !== owner) {
      if (cr === promoRow) {
        for (const t of PROMOTION_TYPES) {
          results.push({ from, to, promotion: t });
        }
      } else {
        results.push({ from, to });
      }
    }
  }

  // En passant: the capturing pawn steps diagonally onto the empty en passant
  // square; the captured pawn sits beside it on the starting row.
  if (enPassantTarget !== null) {
    const er = rowOf(enPassantTarget);
    const ec = colOf(enPassantTarget);
    if (er === r + dir && Math.abs(ec - c) === 1) {
      const capturedSquare = indexOf(r, ec);
      const captured = board[capturedSquare];
      if (captured && captured.owner !== owner && captured.type === "pawn") {
        results.push({ from, to: enPassantTarget });
      }
    }
  }
}

function pushSlidingMoves(
  board: ChessBoard,
  from: number,
  type: ChessPieceType,
  results: ChessMove[]
): void {
  const piece = board[from];
  const dirs =
    type === "bishop" ? BISHOP_DIRS : type === "rook" ? ROOK_DIRS : QUEEN_DIRS;
  for (const [dr, dc] of dirs) {
    let r = rowOf(from) + dr;
    let c = colOf(from) + dc;
    while (isInside(r, c)) {
      const to = indexOf(r, c);
      const target = board[to];
      if (!target) {
        results.push({ from, to });
      } else {
        if (target.owner !== piece!.owner) results.push({ from, to });
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function pushKnightMoves(
  board: ChessBoard,
  from: number,
  results: ChessMove[]
): void {
  const piece = board[from];
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const r = rowOf(from) + dr;
    const c = colOf(from) + dc;
    if (!isInside(r, c)) continue;
    const to = indexOf(r, c);
    const target = board[to];
    if (!target || target.owner !== piece!.owner) results.push({ from, to });
  }
}

function pushKingMoves(
  board: ChessBoard,
  from: number,
  castlingRights: CastlingRights,
  results: ChessMove[]
): void {
  const piece = board[from];
  for (const [dr, dc] of KING_DELTAS) {
    const r = rowOf(from) + dr;
    const c = colOf(from) + dc;
    if (!isInside(r, c)) continue;
    const to = indexOf(r, c);
    const target = board[to];
    if (!target || target.owner !== piece!.owner) results.push({ from, to });
  }

  const owner = piece!.owner;
  const row = owner === 0 ? 7 : 0;
  if (from !== indexOf(row, 4)) return;
  if (isInCheck(board, owner)) return;

  const enemy = otherOwner(owner);
  const kingside = owner === 0 ? castlingRights.wk : castlingRights.bk;
  const queenside = owner === 0 ? castlingRights.wq : castlingRights.bq;

  if (kingside) {
    const rook = board[indexOf(row, 7)];
    const f = indexOf(row, 5);
    const g = indexOf(row, 6);
    if (
      rook &&
      rook.owner === owner &&
      rook.type === "rook" &&
      board[f] === null &&
      board[g] === null &&
      !isSquareAttacked(board, f, enemy) &&
      !isSquareAttacked(board, g, enemy)
    ) {
      results.push({ from, to: g });
    }
  }

  if (queenside) {
    const rook = board[indexOf(row, 0)];
    const b = indexOf(row, 1);
    const c = indexOf(row, 2);
    const d = indexOf(row, 3);
    if (
      rook &&
      rook.owner === owner &&
      rook.type === "rook" &&
      board[b] === null &&
      board[c] === null &&
      board[d] === null &&
      !isSquareAttacked(board, d, enemy) &&
      !isSquareAttacked(board, c, enemy)
    ) {
      results.push({ from, to: c });
    }
  }
}

export function pseudoLegalMoves(
  board: ChessBoard,
  from: number,
  castlingRights: CastlingRights,
  enPassantTarget: number | null
): ChessMove[] {
  const piece = board[from];
  if (!piece) return [];

  const results: ChessMove[] = [];
  switch (piece.type) {
    case "pawn":
      pushPawnMoves(board, from, enPassantTarget, results);
      break;
    case "knight":
      pushKnightMoves(board, from, results);
      break;
    case "bishop":
    case "rook":
    case "queen":
      pushSlidingMoves(board, from, piece.type, results);
      break;
    case "king":
      pushKingMoves(board, from, castlingRights, results);
      break;
  }
  return results;
}

// Applies `move` to a board copy, handling promotions, castling rook moves and
// en passant captures. Does not filter for king safety.
export function simulateMove(board: ChessBoard, move: ChessMove): ChessBoard {
  const sim = board.slice();
  const piece = sim[move.from];
  if (!piece) return sim;

  sim[move.from] = null;
  sim[move.to] = move.promotion
    ? { owner: piece.owner, type: move.promotion }
    : piece;

  // En passant: diagonal pawn step onto an empty square removes the pawn on
  // the mover's original row.
  if (
    piece.type === "pawn" &&
    colOf(move.to) !== colOf(move.from) &&
    board[move.to] === null
  ) {
    sim[indexOf(rowOf(move.from), colOf(move.to))] = null;
  }

  // Castling: shift the matching rook onto the square beside the king.
  if (piece.type === "king") {
    const fromCol = colOf(move.from);
    const toCol = colOf(move.to);
    const row = rowOf(move.from);
    if (toCol - fromCol === 2) {
      sim[indexOf(row, 5)] = sim[indexOf(row, 7)];
      sim[indexOf(row, 7)] = null;
    } else if (toCol - fromCol === -2) {
      sim[indexOf(row, 3)] = sim[indexOf(row, 0)];
      sim[indexOf(row, 0)] = null;
    }
  }

  return sim;
}

function moveLeavesKingInCheck(
  board: ChessBoard,
  move: ChessMove,
  owner: ChessOwner
): boolean {
  const sim = simulateMove(board, move);
  const king = findKing(sim, owner);
  if (king < 0) return true;
  return isSquareAttacked(sim, king, otherOwner(owner));
}

export function legalMovesFrom(
  board: ChessBoard,
  from: number,
  castlingRights: CastlingRights,
  enPassantTarget: number | null
): ChessMove[] {
  const piece = board[from];
  if (!piece) return [];

  const pseudo = pseudoLegalMoves(board, from, castlingRights, enPassantTarget);
  const results: ChessMove[] = [];
  for (const move of pseudo) {
    if (!moveLeavesKingInCheck(board, move, piece.owner)) {
      results.push(move);
    }
  }
  return results;
}

export function playableSources(
  board: ChessBoard,
  owner: ChessOwner,
  castlingRights: CastlingRights,
  enPassantTarget: number | null
): number[] {
  const sources: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const piece = board[i];
    if (!piece || piece.owner !== owner) continue;
    if (legalMovesFrom(board, i, castlingRights, enPassantTarget).length > 0) {
      sources.push(i);
    }
  }
  return sources;
}

export function generateLegalMoves(
  board: ChessBoard,
  owner: ChessOwner,
  castlingRights: CastlingRights,
  enPassantTarget: number | null
): ChessMove[] {
  const moves: ChessMove[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const piece = board[i];
    if (!piece || piece.owner !== owner) continue;
    moves.push(...legalMovesFrom(board, i, castlingRights, enPassantTarget));
  }
  return moves;
}

export function hasLegalMove(
  board: ChessBoard,
  owner: ChessOwner,
  castlingRights: CastlingRights,
  enPassantTarget: number | null
): boolean {
  return generateLegalMoves(board, owner, castlingRights, enPassantTarget).length > 0;
}

// Validates an inbound move against the pure board rules. A promotion move must
// carry an explicit promotion piece; non-promotion moves must not.
export function isLegalMove(
  board: ChessBoard,
  from: number,
  to: number,
  promotion: ChessPieceType | undefined,
  owner: ChessOwner,
  castlingRights: CastlingRights,
  enPassantTarget: number | null
): boolean {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
  if (from < 0 || from >= CELL_COUNT || to < 0 || to >= CELL_COUNT) return false;
  if (from === to) return false;
  if (promotion !== undefined && !PROMOTION_TYPES.includes(promotion)) {
    return false;
  }

  const legal = legalMovesFrom(board, from, castlingRights, enPassantTarget);
  for (const move of legal) {
    if (move.from !== from || move.to !== to) continue;
    if (move.promotion) {
      if (move.promotion === promotion) return true;
    } else if (promotion === undefined) {
      return true;
    }
  }
  return false;
}

export function validateMove(
  state: ChessState,
  move: ChessMove,
  playerIndex: number
): boolean {
  if (state.currentPlayerIndex !== playerIndex) return false;
  return isLegalMove(
    state.board,
    move.from,
    move.to,
    move.promotion,
    playerIndex as ChessOwner,
    state.castlingRights,
    state.enPassantTarget
  );
}

function updatedCastlingRights(
  state: ChessState,
  move: ChessMove
): CastlingRights {
  const next: CastlingRights = { ...state.castlingRights };
  const mover = state.board[move.from];
  if (!mover) return next;

  if (mover.type === "king") {
    if (mover.owner === 0) {
      next.wk = false;
      next.wq = false;
    } else {
      next.bk = false;
      next.bq = false;
    }
  } else if (mover.type === "rook") {
    if (mover.owner === 0) {
      if (move.from === indexOf(7, 7)) next.wk = false;
      if (move.from === indexOf(7, 0)) next.wq = false;
    } else {
      if (move.from === indexOf(0, 7)) next.bk = false;
      if (move.from === indexOf(0, 0)) next.bq = false;
    }
  }

  // A rook captured on its home square also removes that side's right.
  const capRow = rowOf(move.to);
  if (capRow === 7 || capRow === 0) {
    if (move.to === indexOf(capRow, 7)) {
      if (capRow === 7) next.wk = false;
      else next.bk = false;
    }
    if (move.to === indexOf(capRow, 0)) {
      if (capRow === 7) next.wq = false;
      else next.bq = false;
    }
  }

  return next;
}

function nextEnPassantTarget(state: ChessState, move: ChessMove): number | null {
  const mover = state.board[move.from];
  if (mover && mover.type === "pawn" && Math.abs(move.to - move.from) === 16) {
    return (move.from + move.to) / 2;
  }
  return null;
}

function moveCaptures(state: ChessState, move: ChessMove): boolean {
  if (state.board[move.to]) return true;
  const mover = state.board[move.from];
  if (
    mover &&
    mover.type === "pawn" &&
    colOf(move.to) !== colOf(move.from) &&
    state.board[move.to] === null
  ) {
    return true;
  }
  return false;
}

// Applies a validated chess move to a state copy, returning the new state.
export function applyMove(state: ChessState, move: ChessMove): ChessState {
  const mover = state.board[move.from];
  if (!mover) return state;

  const board = simulateMove(state.board, move);
  const moving = mover.type === "pawn";
  const capture = moveCaptures(state, move);
  const halfmoveClock = moving || capture ? 0 : state.halfmoveClock + 1;

  return {
    board,
    currentPlayerIndex: otherOwner(state.currentPlayerIndex),
    castlingRights: updatedCastlingRights(state, move),
    enPassantTarget: nextEnPassantTarget(state, move),
    halfmoveClock,
    fullmoveNumber:
      state.currentPlayerIndex === 1 ? state.fullmoveNumber + 1 : state.fullmoveNumber,
    lastMove: move,
  };
}

export interface GameOverResult {
  winnerIndex: ChessOwner | null;
  isDraw: boolean;
}

function isInsufficientMaterial(board: ChessBoard): boolean {
  const pieces: { piece: ChessPiece; index: number }[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const piece = board[i];
    if (piece) pieces.push({ piece, index: i });
  }

  if (pieces.length <= 2) return true; // King vs king (or lone king).

  const minors = pieces.filter(
    ({ piece }) => piece.type === "knight" || piece.type === "bishop"
  );

  if (pieces.length === 3 && minors.length === 1) {
    // King + bishop/knight vs king.
    return true;
  }

  if (
    pieces.length === 4 &&
    minors.length === 2 &&
    minors.every(({ piece }) => piece.type === "bishop")
  ) {
    // King + bishop vs king + bishop, both bishops on the same square color.
    const squareColors = minors.map(
      ({ index }) => (rowOf(index) + colOf(index)) % 2
    );
    return squareColors[0] === squareColors[1];
  }

  return false;
}

// Outcome of a state with `currentPlayerIndex` to move. Returns null while the
// game is live: checkmate and stalemate (no legal move), the fifty-move rule,
// and insufficient material all end the game.
export function checkOutcome(state: ChessState): GameOverResult | null {
  const owner = state.currentPlayerIndex;

  if (!hasLegalMove(state.board, owner, state.castlingRights, state.enPassantTarget)) {
    if (isInCheck(state.board, owner)) {
      return { winnerIndex: otherOwner(owner), isDraw: false };
    }
    return { winnerIndex: null, isDraw: true };
  }

  if (state.halfmoveClock >= 100) {
    return { winnerIndex: null, isDraw: true };
  }

  if (isInsufficientMaterial(state.board)) {
    return { winnerIndex: null, isDraw: true };
  }

  return null;
}

// Pieces that `owner` has captured from the opponent, most valuable first.
export function capturedBy(board: ChessBoard, owner: ChessOwner): ChessPieceType[] {
  const other = otherOwner(owner);
  const captured: ChessPieceType[] = [];
  for (const type of ["queen", "rook", "bishop", "knight", "pawn"] as const) {
    let remaining = 0;
    for (const cell of board) {
      if (cell && cell.owner === other && cell.type === type) remaining += 1;
    }
    const missing = INITIAL_COUNTS[type] - remaining;
    for (let i = 0; i < missing; i++) captured.push(type);
  }
  return captured;
}