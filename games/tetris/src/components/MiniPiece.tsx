import type { TetrominoType } from '../types';
import { SHAPES, COLORS } from '../engine/tetromino';

interface Props {
  type: TetrominoType | null;
  size?: number;
}

// 找出 4x4 矩阵中真正占据的 bounding box 并居中显示
export default function MiniPiece({ type, size = 18 }: Props) {
  if (!type) {
    return (
      <div
        className="flex items-center justify-center rounded border border-slate-800 bg-slate-900/40"
        style={{ width: size * 4 + 8, height: size * 3 + 8 }}
      />
    );
  }
  const shape = SHAPES[type][0];
  // 计算 bounding box
  let minR = 4, maxR = -1, minC = 4, maxC = -1;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (shape[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  const h = maxR - minR + 1;
  const w = maxC - minC + 1;
  const color = COLORS[type];

  const containerW = size * 4 + 8;
  const containerH = size * 3 + 8;

  return (
    <div
      className="flex items-center justify-center rounded border border-slate-800 bg-slate-900/40"
      style={{ width: containerW, height: containerH }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${w}, ${size}px)`,
          gridTemplateRows: `repeat(${h}, ${size}px)`,
        }}
      >
        {Array.from({ length: h }).map((_, r) =>
          Array.from({ length: w }).map((__, c) => {
            const filled = shape[r + minR][c + minC];
            return (
              <div
                key={`${r}-${c}`}
                style={
                  filled
                    ? {
                        backgroundColor: color,
                        boxShadow:
                          'inset 2px 2px 0 rgba(255,255,255,0.4), inset -2px -2px 0 rgba(0,0,0,0.35)',
                      }
                    : undefined
                }
                className={filled ? 'border border-black/30' : ''}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
