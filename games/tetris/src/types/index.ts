export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type CellValue = 0 | TetrominoType;
export type Board = CellValue[][];

export type Rotation = 0 | 1 | 2 | 3;

export interface ActivePiece {
  type: TetrominoType;
  rotation: Rotation;
  x: number;
  y: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  board: Board;
  active: ActivePiece | null;
  hold: TetrominoType | null;
  canHold: boolean;
  queue: TetrominoType[];
  bag: TetrominoType[];
  score: number;
  best: number;
  level: number;
  lines: number;
  status: GameStatus;
  dropAccumMs: number;
  lockDelayMs: number;
  lockResets: number;
  isOnGround: boolean;
}

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
export const BUFFER_ROWS = 2;
export const TOTAL_ROWS = BOARD_ROWS + BUFFER_ROWS;

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
