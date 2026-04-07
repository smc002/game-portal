import type { HeroInstance } from './hero.js';
import type { Item } from './items.js';

/** 兵书 */
export interface Tome {
  id: string;
  name: string;
  description: string;
  effectId: string;           // 关联兵书效果函数
}

/** 持续性Buff */
export interface ActiveBuff {
  type: 'bluff' | 'speed_boost';
  expiresAt: number;          // 到期时间戳（毫秒），-1表示永久（整局有效）
}

/** 玩家状态 */
export interface PlayerState {
  // 身份
  playerId: string;
  username: string;

  // 局外资产
  gold: number;
  ownedTomes: Tome[];

  // 局内状态
  inGame: boolean;
  currentCityId: string;
  isMoving: boolean;
  moveTarget: string | null;
  moveProgress: number;       // 0-1 移动读条进度

  // 战斗属性
  hp: number;
  maxHp: number;
  shield: number;

  // 编队
  formation: (HeroInstance | null)[];   // 长度5，索引即站位
  bench: HeroInstance[];                // 备战席

  // 背包
  inventory: Item[];
  activeTomes: Tome[];                  // 本局携带的兵书
  activeBuffs: ActiveBuff[];            // 当前激活的Buff

  // 局内计数器
  fleeCount: number;                    // 剩余逃跑次数
  starPurchaseCount: number;            // 将星购买次数
  status: PlayerStatus;
}

export type PlayerStatus =
  | 'in_lobby'
  | 'exploring'
  | 'searching'
  | 'ambushing'
  | 'moving'
  | 'in_battle';

/** 客户端可见的其他玩家简要信息 */
export interface PlayerBrief {
  playerId: string;
  username: string;
  estimatedPower: number;     // 预估战力（可被虚张声势影响）
  currentCityId: string;
}
