import { create } from 'zustand';
import type { GameState, ActivePiece, TetrominoType } from '../types';
import { LOCK_DELAY_MS, MAX_LOCK_RESETS } from '../types';
import {
  createEmptyBoard,
  collides,
  tryMove,
  tryRotate,
  mergePiece,
  findFullRows,
  clearRows,
  hardDropDistance,
  isTopOut,
} from '../engine/board';
import { ensureQueue, refillBag } from '../engine/bag';
import { spawnPiece } from '../engine/tetromino';
import { getDropInterval } from '../engine/gravity';
import {
  scoreForLines,
  scoreForSoftDrop,
  scoreForHardDrop,
  levelForLines,
} from '../engine/score';

interface GameStore extends GameState {
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;

  moveLeft: () => void;
  moveRight: () => void;
  softDrop: () => void;
  hardDrop: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  holdPiece: () => void;

  tick: (dt: number) => void;
}

const BEST_KEY = 'tetris.best';
function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* ignore */
  }
}

function freshState(): GameState {
  return {
    board: createEmptyBoard(),
    active: null,
    hold: null,
    canHold: true,
    queue: [],
    bag: [],
    score: 0,
    best: loadBest(),
    level: 1,
    lines: 0,
    status: 'idle',
    dropAccumMs: 0,
    lockDelayMs: 0,
    lockResets: 0,
    isOnGround: false,
  };
}

function recomputeGround(state: GameState): boolean {
  if (!state.active) return false;
  return collides(state.board, { ...state.active, y: state.active.y + 1 });
}

function onMoveSuccess(s: GameState): Partial<GameState> {
  const onGround = recomputeGround(s);
  if (s.isOnGround && onGround) {
    // 仍在地面，成功移动 → 重置锁定延迟（有限次数）
    if (s.lockResets < MAX_LOCK_RESETS) {
      return { isOnGround: true, lockDelayMs: 0, lockResets: s.lockResets + 1 };
    }
    return { isOnGround: true };
  }
  if (s.isOnGround && !onGround) {
    // 从地面滑出
    return { isOnGround: false, lockDelayMs: 0 };
  }
  if (!s.isOnGround && onGround) {
    // 新着地
    return { isOnGround: true, lockDelayMs: 0 };
  }
  return { isOnGround: false };
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...freshState(),

  startGame: () => {
    const base = freshState();
    const bag0 = refillBag();
    const { queue, bag } = ensureQueue([], bag0, 5);
    const first = queue[0];
    const rest = queue.slice(1);
    const piece = spawnPiece(first);
    set({
      ...base,
      queue: rest,
      bag,
      active: piece,
      status: 'playing',
    });
  },

  pauseGame: () => {
    if (get().status === 'playing') set({ status: 'paused' });
  },

  resumeGame: () => {
    if (get().status === 'paused') set({ status: 'playing' });
  },

  resetGame: () => {
    set({ ...freshState(), status: 'idle' });
  },

  tick: (dt) => {
    const s = get();
    if (s.status !== 'playing' || !s.active) return;

    let { dropAccumMs, lockDelayMs, active, isOnGround } = s;
    dropAccumMs += dt;
    const interval = getDropInterval(s.level);

    let changed = false;

    while (dropAccumMs >= interval) {
      dropAccumMs -= interval;
      const moved = tryMove(s.board, active, 0, 1);
      if (moved) {
        active = moved;
        changed = true;
        isOnGround = collides(s.board, { ...active, y: active.y + 1 });
        if (!isOnGround) lockDelayMs = 0;
      } else {
        isOnGround = true;
        break;
      }
    }

    if (isOnGround) {
      lockDelayMs += dt;
    }

    if (changed) set({ active, dropAccumMs, lockDelayMs, isOnGround });
    else set({ dropAccumMs, lockDelayMs, isOnGround });

    if (isOnGround && lockDelayMs >= LOCK_DELAY_MS) {
      lockPieceInternal(set, get);
    }
  },

  moveLeft: () => {
    const s = get();
    if (s.status !== 'playing' || !s.active) return;
    const next = tryMove(s.board, s.active, -1, 0);
    if (next) set({ active: next, ...onMoveSuccess({ ...s, active: next }) });
  },

  moveRight: () => {
    const s = get();
    if (s.status !== 'playing' || !s.active) return;
    const next = tryMove(s.board, s.active, 1, 0);
    if (next) set({ active: next, ...onMoveSuccess({ ...s, active: next }) });
  },

  softDrop: () => {
    const s = get();
    if (s.status !== 'playing' || !s.active) return;
    const next = tryMove(s.board, s.active, 0, 1);
    if (next) {
      set({
        active: next,
        score: s.score + scoreForSoftDrop(1),
        dropAccumMs: 0,
        ...onMoveSuccess({ ...s, active: next }),
      });
    } else {
      // 已着地，立刻进入锁定倒计时
      set({ isOnGround: true });
    }
  },

  hardDrop: () => {
    const s = get();
    if (s.status !== 'playing' || !s.active) return;
    const d = hardDropDistance(s.board, s.active);
    const dropped: ActivePiece = { ...s.active, y: s.active.y + d };
    set({
      active: dropped,
      score: s.score + scoreForHardDrop(d),
      isOnGround: true,
      lockDelayMs: LOCK_DELAY_MS,
    });
    lockPieceInternal(set, get);
  },

  rotateCW: () => {
    const s = get();
    if (s.status !== 'playing' || !s.active) return;
    const next = tryRotate(s.board, s.active, 1);
    if (next) set({ active: next, ...onMoveSuccess({ ...s, active: next }) });
  },

  rotateCCW: () => {
    const s = get();
    if (s.status !== 'playing' || !s.active) return;
    const next = tryRotate(s.board, s.active, -1);
    if (next) set({ active: next, ...onMoveSuccess({ ...s, active: next }) });
  },

  holdPiece: () => {
    const s = get();
    if (s.status !== 'playing' || !s.active || !s.canHold) return;

    const current: TetrominoType = s.active.type;
    let nextType: TetrominoType;
    let queue = s.queue;
    let bag = s.bag;
    let hold: TetrominoType;

    if (s.hold == null) {
      const ensured = ensureQueue(queue, bag, 5);
      queue = ensured.queue;
      bag = ensured.bag;
      nextType = queue[0];
      queue = queue.slice(1);
      hold = current;
    } else {
      nextType = s.hold;
      hold = current;
    }

    const piece = spawnPiece(nextType);
    if (isTopOut(s.board, piece)) {
      const best = Math.max(s.best, s.score);
      saveBest(best);
      set({ status: 'gameover', best });
      return;
    }

    set({
      hold,
      canHold: false,
      active: piece,
      queue,
      bag,
      lockDelayMs: 0,
      lockResets: 0,
      isOnGround: collides(s.board, { ...piece, y: piece.y + 1 }),
      dropAccumMs: 0,
    });
  },
}));

// ==== 内部：锁定 + 消行 + 出生 ====
function lockPieceInternal(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
) {
  const s = get();
  if (!s.active) return;

  const merged = mergePiece(s.board, s.active);
  const full = findFullRows(merged);
  const cleared = full.length;
  const board = clearRows(merged, full);

  const newLines = s.lines + cleared;
  const newLevel = Math.max(s.level, levelForLines(newLines));
  const addScore = scoreForLines(cleared, s.level);
  const newScore = s.score + addScore;

  // 下一块
  const ensured = ensureQueue(s.queue, s.bag, 5);
  const nextType = ensured.queue[0];
  const queue = ensured.queue.slice(1);
  const bag = ensured.bag;
  const piece = spawnPiece(nextType);

  if (isTopOut(board, piece)) {
    const best = Math.max(s.best, newScore);
    saveBest(best);
    set({
      board,
      active: null,
      score: newScore,
      lines: newLines,
      level: newLevel,
      queue,
      bag,
      status: 'gameover',
      best,
      dropAccumMs: 0,
      lockDelayMs: 0,
      lockResets: 0,
      isOnGround: false,
      canHold: true,
    });
    return;
  }

  set({
    board,
    active: piece,
    score: newScore,
    lines: newLines,
    level: newLevel,
    queue,
    bag,
    canHold: true,
    dropAccumMs: 0,
    lockDelayMs: 0,
    lockResets: 0,
    isOnGround: collides(board, { ...piece, y: piece.y + 1 }),
  });
}
