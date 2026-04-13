import type { TetrominoType } from '../types';
import { COLORS } from '../engine/tetromino';

interface CellProps {
  value: 0 | TetrominoType;
  ghost?: boolean;
  size?: number;
}

export default function Cell({ value, ghost, size = 28 }: CellProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
  };

  if (value === 0) {
    return (
      <div
        style={style}
        className="border border-slate-800/40 bg-slate-900/40"
      />
    );
  }

  const color = COLORS[value];
  if (ghost) {
    return (
      <div
        style={{ ...style, borderColor: color }}
        className="border-2 border-dashed bg-transparent opacity-50"
      />
    );
  }

  return (
    <div
      style={{
        ...style,
        backgroundColor: color,
        boxShadow: `inset 2px 2px 0 rgba(255,255,255,0.4), inset -2px -2px 0 rgba(0,0,0,0.35)`,
      }}
      className="border border-black/30"
    />
  );
}
