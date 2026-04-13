import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Board as BoardT, CellValue, ActivePiece } from '../types';
import { BOARD_COLS, BOARD_ROWS, BUFFER_ROWS } from '../types';
import { cloneBoard, hardDropDistance } from '../engine/board';
import { getBlocks } from '../engine/tetromino';
import Cell from './Cell';

const CELL = 28;

function paint(board: BoardT, piece: ActivePiece): BoardT {
  const next = cloneBoard(board);
  for (const [r, c] of getBlocks(piece)) {
    if (r >= 0 && r < next.length && c >= 0 && c < BOARD_COLS) {
      next[r][c] = piece.type;
    }
  }
  return next;
}

export default function Board() {
  const board = useGameStore((s) => s.board);
  const active = useGameStore((s) => s.active);
  const status = useGameStore((s) => s.status);

  const { render, ghostCells } = useMemo(() => {
    let b = board;
    const ghostSet = new Set<string>();
    if (active) {
      // Ghost
      const d = hardDropDistance(board, active);
      const ghost: ActivePiece = { ...active, y: active.y + d };
      for (const [r, c] of getBlocks(ghost)) {
        ghostSet.add(`${r},${c}`);
      }
      b = paint(board, active);
    }
    return { render: b, ghostCells: ghostSet };
  }, [board, active]);

  // 只渲染可见行
  const visible = render.slice(BUFFER_ROWS);
  const dimmed = status === 'gameover';

  return (
    <div
      className={`inline-block rounded-md border-2 border-slate-700 bg-slate-950/60 p-1 shadow-2xl ${
        dimmed ? 'grayscale brightness-50' : ''
      }`}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${BOARD_COLS}, ${CELL}px)`,
          gridTemplateRows: `repeat(${BOARD_ROWS}, ${CELL}px)`,
        }}
      >
        {visible.map((row, r) =>
          row.map((cell: CellValue, c) => {
            const realRow = r + BUFFER_ROWS;
            const isGhost = cell === 0 && ghostCells.has(`${realRow},${c}`);
            if (isGhost && active) {
              return (
                <Cell key={`${r}-${c}`} value={active.type} ghost size={CELL} />
              );
            }
            return <Cell key={`${r}-${c}`} value={cell} size={CELL} />;
          }),
        )}
      </div>
    </div>
  );
}
