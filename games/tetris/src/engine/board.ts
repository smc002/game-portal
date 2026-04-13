import type { Board, ActivePiece, Rotation } from '../types';
import { BOARD_COLS, TOTAL_ROWS, BOARD_ROWS } from '../types';
import { getBlocks, getKicks, SHAPES } from './tetromino';

export function createEmptyBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => 0 as const),
  );
}

export function cloneBoard(b: Board): Board {
  return b.map((row) => [...row]);
}

// piece 是否与边界/已锁定棋盘冲突
export function collides(board: Board, piece: ActivePiece): boolean {
  for (const [r, c] of getBlocks(piece)) {
    if (c < 0 || c >= BOARD_COLS) return true;
    if (r >= TOTAL_ROWS) return true;
    if (r >= 0 && board[r][c] !== 0) return true;
  }
  return false;
}

export function tryMove(
  board: Board,
  piece: ActivePiece,
  dx: number,
  dy: number,
): ActivePiece | null {
  const next: ActivePiece = { ...piece, x: piece.x + dx, y: piece.y + dy };
  return collides(board, next) ? null : next;
}

export function tryRotate(
  board: Board,
  piece: ActivePiece,
  dir: 1 | -1,
): ActivePiece | null {
  if (piece.type === 'O') return piece;
  const nextRot = (((piece.rotation + dir) % 4) + 4) % 4 as Rotation;
  const kicks = getKicks(piece.type, piece.rotation, nextRot);
  for (const [dx, dy] of kicks) {
    // SRS 的 dy 以上为正；棋盘 y 以下为正 → 取负
    const candidate: ActivePiece = {
      ...piece,
      rotation: nextRot,
      x: piece.x + dx,
      y: piece.y - dy,
    };
    if (!collides(board, candidate)) return candidate;
  }
  return null;
}

export function hardDropDistance(board: Board, piece: ActivePiece): number {
  let d = 0;
  while (!collides(board, { ...piece, y: piece.y + d + 1 })) d++;
  return d;
}

export function mergePiece(board: Board, piece: ActivePiece): Board {
  const next = cloneBoard(board);
  for (const [r, c] of getBlocks(piece)) {
    if (r >= 0 && r < TOTAL_ROWS) next[r][c] = piece.type;
  }
  return next;
}

export function findFullRows(board: Board): number[] {
  const rows: number[] = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    if (board[r].every((cell) => cell !== 0)) rows.push(r);
  }
  return rows;
}

export function clearRows(board: Board, rows: number[]): Board {
  if (rows.length === 0) return board;
  const kept = board.filter((_, i) => !rows.includes(i));
  const empty: Board = Array.from({ length: rows.length }, () =>
    Array.from({ length: BOARD_COLS }, () => 0 as const),
  );
  return [...empty, ...kept];
}

// Top out：新生成的方块在其初始位置即冲突，视为游戏结束
export function isTopOut(board: Board, piece: ActivePiece): boolean {
  return collides(board, piece);
}

// 判断 piece 的任一方块是否全部位于缓冲区之上（即整个方块超出了可见棋盘上沿后锁定）
export function lockedAboveVisible(piece: ActivePiece): boolean {
  const rows = getBlocks(piece).map(([r]) => r);
  const bufferTop = TOTAL_ROWS - BOARD_ROWS;
  return rows.every((r) => r < bufferTop);
}
