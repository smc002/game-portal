import type { PlayerState } from '../../../shared/types/player.js';
import type { HeroInstance } from '../../../shared/types/hero.js';
import { SPAWN_CITY_ID } from '../../../shared/data/maps.js';

/** 默认初始金币 */
const INITIAL_GOLD = 500;

/** 默认最大生命值 */
const DEFAULT_MAX_HP = 500;

/** 默认逃跑次数 */
const DEFAULT_FLEE_COUNT = 2;

/** 创建新玩家的初始状态 */
export function createPlayerState(playerId: string, username: string): PlayerState {
  return {
    playerId,
    username,
    gold: INITIAL_GOLD,
    ownedTomes: [],
    inGame: false,
    currentCityId: SPAWN_CITY_ID,
    isMoving: false,
    moveTarget: null,
    moveProgress: 0,
    hp: DEFAULT_MAX_HP,
    maxHp: DEFAULT_MAX_HP,
    shield: 0,
    formation: [null, null, null, null, null],
    bench: [],
    inventory: [],
    activeTomes: [],
    activeBuffs: [],
    fleeCount: DEFAULT_FLEE_COUNT,
    starPurchaseCount: 0,
    status: 'in_lobby',
  };
}

/** GM指令：增加金币 */
export function gmAddGold(player: PlayerState, amount: number = 10000): void {
  player.gold += amount;
}
