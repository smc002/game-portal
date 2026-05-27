import type { HexCoord, Owner } from '../types/game';

export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function tileId(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseTileId(id: string): HexCoord {
  const [q, r] = id.split(',').map(Number);
  return { q, r };
}

export function addHex(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function getNeighborIds(coord: HexCoord): string[] {
  return HEX_DIRECTIONS.map((dir) => tileId(addHex(coord, dir)));
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const aq = a.q;
  const ar = a.r;
  const as = -aq - ar;
  const bq = b.q;
  const br = b.r;
  const bs = -bq - br;
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as - bs));
}

export function hexToPixel(coord: HexCoord, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (coord.q + coord.r / 2),
    y: size * 1.5 * coord.r,
  };
}

export function ownerDirection(owner: Owner): number {
  return owner === 'player' ? 1 : -1;
}

export function mirrorCoord(coord: HexCoord): HexCoord {
  return { q: -coord.q, r: -coord.r };
}
