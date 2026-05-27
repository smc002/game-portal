import type { GameState, TileKind } from '../types/game';
import { tryOccupyTile } from './actions';
import { canOccupy } from './rules';

const priority: Record<TileKind, number> = {
  base: -1,
  empty: 0,
  question: 2,
  tower: 1,
  campLow: 3,
  campMid: 5,
  campHigh: 6,
  mine: 7,
};

export function runEnemyAi(state: GameState) {
  const candidates = Object.values(state.tiles)
    .filter((tile) => canOccupy(state, 'enemy', tile.id))
    .sort((a, b) => {
      const pa = priority[a.kind] ?? 0;
      const pb = priority[b.kind] ?? 0;
      if (pa !== pb) return pb - pa;
      return (a.cost ?? 0) - (b.cost ?? 0);
    });

  const target = candidates[0];
  if (target) {
    tryOccupyTile(state, 'enemy', target.id);
  }
}
