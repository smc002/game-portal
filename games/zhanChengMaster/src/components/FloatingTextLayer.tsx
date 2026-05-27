import type { FloatingText, Tile } from '../types/game';
import { hexToPixel } from '../utils/hex';

export function FloatingTextLayer({
  texts,
  tiles,
  size,
  centerX,
  centerY,
}: {
  texts: FloatingText[];
  tiles: Record<string, Tile>;
  size: number;
  centerX: number;
  centerY: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {texts.map((item) => {
        const tile = item.tileId ? tiles[item.tileId] : undefined;
        if (!tile) return null;
        const position = hexToPixel(tile.coord, size);
        const opacity = 1 - item.ageMs / 1700;
        const y = position.y + centerY - item.ageMs * 0.025;
        const color = item.owner === 'enemy' ? 'text-rose-100' : 'text-amber-100';
        return (
          <div
            key={item.id}
            className={`absolute -translate-x-1/2 rounded bg-stone-950/85 px-2 py-1 text-xs font-semibold ${color}`}
            style={{ left: position.x + centerX, top: y, opacity }}
          >
            {item.text}
          </div>
        );
      })}
    </div>
  );
}
