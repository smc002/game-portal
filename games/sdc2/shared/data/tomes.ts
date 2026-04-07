import type { Tome } from '../types/player.js';

/** 兵书列表 */
export const TOMES: Tome[] = [
  {
    id: 'tome_iron_wall',
    name: '铁壁兵法',
    description: '开局获得100点护盾',
    effectId: 'tome_effect_iron_wall',
  },
  {
    id: 'tome_swift_wind',
    name: '疾风兵法',
    description: '所有武将初始ATB+20',
    effectId: 'tome_effect_swift_wind',
  },
  {
    id: 'tome_burning_sky',
    name: '火攻兵法',
    description: '战斗开始时对敌方附加5层灼烧',
    effectId: 'tome_effect_burning_sky',
  },
  {
    id: 'tome_blood_pact',
    name: '血盟兵法',
    description: '最大生命值+200，但开局扣除50生命',
    effectId: 'tome_effect_blood_pact',
  },
];

/** 按ID快速查找 */
export const TOME_MAP = new Map(TOMES.map(t => [t.id, t]));

/**
 * 携带兵书入场费（按携带个数递增）
 * 第1个: 100金币, 第2个: 300金币, 第3个: 800金币
 */
export const TOME_ENTRY_COSTS = [100, 300, 800];

/** 最大携带兵书数量 */
export const MAX_TOMES_PER_GAME = 3;
