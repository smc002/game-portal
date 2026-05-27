import type { BarrackCard, Owner } from '../types/game';

export const PLAYER_DECK: BarrackCard[] = [
  { id: 'green-militia', name: '青州步卒', quality: 'green', unitId: 'militia', spawnMs: 9800 },
  { id: 'blue-archer', name: '连弩营', quality: 'blue', unitId: 'archer', spawnMs: 10500 },
  { id: 'purple-cavalry', name: '虎豹骑营', quality: 'purple', unitId: 'cavalry', spawnMs: 11200 },
  { id: 'orange-mage', name: '太平术坛', quality: 'orange', unitId: 'mage', spawnMs: 12500 },
  { id: 'green-guard', name: '藤甲盾营', quality: 'green', unitId: 'guard', spawnMs: 10200 },
  { id: 'orange-lancer', name: '陷阵铁骑', quality: 'orange', unitId: 'lancer', spawnMs: 13000 },
];

export const ENEMY_DECK: BarrackCard[] = [
  { id: 'enemy-green-militia', name: '黄巾步卒', quality: 'green', unitId: 'militia', spawnMs: 9800 },
  { id: 'enemy-blue-archer', name: '强弓营', quality: 'blue', unitId: 'archer', spawnMs: 10500 },
  { id: 'enemy-purple-cavalry', name: '西凉骑营', quality: 'purple', unitId: 'cavalry', spawnMs: 11200 },
  { id: 'enemy-orange-mage', name: '妖术祭坛', quality: 'orange', unitId: 'mage', spawnMs: 12500 },
  { id: 'enemy-green-guard', name: '重盾营', quality: 'green', unitId: 'guard', spawnMs: 10200 },
  { id: 'enemy-orange-lancer', name: '飞熊铁骑', quality: 'orange', unitId: 'lancer', spawnMs: 13000 },
];

export const DEMO_DECKS: Record<Owner, BarrackCard[]> = {
  player: PLAYER_DECK,
  enemy: ENEMY_DECK,
};
