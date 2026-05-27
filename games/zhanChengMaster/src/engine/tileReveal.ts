import { BUILDING_STATS } from '../data/buildings';
import type { BarrackCard, Building, GameState, Owner, Quality, TileKind } from '../types/game';
import { pickOne, weightedPick } from '../utils/random';

type RevealResult =
  | { result: 'empty'; luckyText?: string }
  | { result: 'mine'; luckyText?: string }
  | { result: 'tower'; luckyText?: string }
  | { result: 'barrack'; card: BarrackCard; luckyText?: string };

const qualityRank: Record<Quality, number> = {
  green: 1,
  blue: 2,
  purple: 3,
  orange: 4,
};

export function createBuilding(
  id: string,
  tileId: string,
  owner: Owner,
  kind: Building['kind'],
  card?: BarrackCard,
): Building {
  const hp =
    kind === 'base'
      ? BUILDING_STATS.base.hp
      : kind === 'mine'
        ? BUILDING_STATS.mine.hp
        : kind === 'tower'
          ? BUILDING_STATS.tower.hp
          : BUILDING_STATS.barrack.hp;

  return {
    id,
    tileId,
    owner,
    kind,
    hp,
    maxHp: hp,
    cardId: card?.id,
    goldElapsedMs: 0,
    spawnElapsedMs: 0,
    spawnMs: card?.spawnMs,
    attackElapsedMs: 0,
  };
}

export function revealTile(kind: TileKind, owner: Owner, deck: BarrackCard[]): RevealResult {
  if (kind === 'mine') return { result: 'mine' };
  if (kind === 'tower') return { result: 'tower' };
  if (kind === 'empty') return { result: 'empty' };

  if (kind === 'campHigh') {
    return { result: 'barrack', card: pickCard(deck, ['orange']) };
  }

  if (kind === 'campMid') {
    return { result: 'barrack', card: pickCard(deck, ['purple', 'orange']) };
  }

  const roll = kind === 'campLow'
    ? weightedPick<Quality | 'empty'>([
        { item: 'empty', weight: 18 },
        { item: 'green', weight: 48 },
        { item: 'blue', weight: 24 },
        { item: 'purple', weight: 8 },
        { item: 'orange', weight: 2 },
      ])
    : weightedPick<Quality | 'empty'>([
        { item: 'empty', weight: 35 },
        { item: 'green', weight: 38 },
        { item: 'blue', weight: 18 },
        { item: 'purple', weight: 7 },
        { item: 'orange', weight: 2 },
      ]);

  if (roll === 'empty') {
    return { result: 'empty' };
  }

  const card = pickCard(deck, [roll]);
  const luckyText = qualityRank[card.quality] >= 3 ? `你很幸运！拿到了${card.name}卡` : undefined;
  return { result: 'barrack', card, luckyText };
}

export function pickCard(deck: BarrackCard[], qualities: Quality[]): BarrackCard {
  const candidates = deck.filter((card) => qualities.includes(card.quality));
  return pickOne(candidates.length > 0 ? candidates : deck);
}

export function addBuildingForReveal(state: GameState, tileId: string, owner: Owner, reveal: RevealResult): string | undefined {
  if (reveal.result === 'empty') return undefined;
  const id = nextEntityId(state, 'building');
  const kind = reveal.result === 'barrack' ? 'barrack' : reveal.result;
  state.buildings[id] = createBuilding(id, tileId, owner, kind, reveal.result === 'barrack' ? reveal.card : undefined);
  return id;
}

export function nextEntityId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextId}`;
  state.nextId += 1;
  return id;
}
