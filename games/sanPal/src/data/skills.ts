import type { SkillDef } from './types';

// ===== Universal Charge Skill =====
export const SKILL_CHARGE: SkillDef = {
  id: 'xuli', name: '蓄力', type: 'support',
  power: 0, accuracy: 100, energyCost: 0, priority: 0,
  description: '恢复5点能量',
  effects: [{ type: 'special', target: 'self', chance: 100, value: { energyRestore: 5 } }],
};

// ===== Shared Defense Skills =====
const DEF_SHIELD: SkillDef = {
  id: 'def_shield', name: '坚守', type: 'support',
  power: 0, accuracy: 100, energyCost: 1, priority: 0,
  description: '进入防御姿态；若本回合被攻击，获得护盾（20%最大HP）',
  effects: [{ type: 'special', target: 'self', chance: 100, value: { type: 'stance', turnsLeft: 1, value: 1 } }],
};

const DEF_COUNTER: SkillDef = {
  id: 'def_counter', name: '反击架势', type: 'support',
  power: 0, accuracy: 100, energyCost: 1, priority: 0,
  description: '进入防御姿态；若本回合被攻击，DEF+1级',
  effects: [{ type: 'special', target: 'self', chance: 100, value: { type: 'stance', turnsLeft: 1, value: 2 } }],
};

const DEF_RESOLVE: SkillDef = {
  id: 'def_resolve', name: '破釜沉舟', type: 'support',
  power: 0, accuracy: 100, energyCost: 1, priority: 0,
  description: '进入防御姿态；若本回合被攻击，ATK+1级',
  effects: [{ type: 'special', target: 'self', chance: 100, value: { type: 'stance', turnsLeft: 1, value: 3 } }],
};

// ===== Attack Skills (shared by multiple generals) =====

// -- Low cost attacks (cost 1-2, power 40-60) --
const ATK_SLASH: SkillDef = {
  id: 'atk_slash', name: '劈砍', type: 'martial',
  power: 50, accuracy: 100, energyCost: 1, priority: 0,
  description: '基础物理攻击',
  effects: [],
};

const ATK_THRUST: SkillDef = {
  id: 'atk_thrust', name: '突刺', type: 'martial',
  power: 55, accuracy: 95, energyCost: 2, priority: 0,
  description: '锐利的一击',
  effects: [],
};

const ATK_ARROW: SkillDef = {
  id: 'atk_arrow', name: '射击', type: 'martial',
  power: 50, accuracy: 100, energyCost: 1, priority: 0,
  description: '基础远程攻击',
  effects: [],
};

const ATK_SCHEME: SkillDef = {
  id: 'atk_scheme', name: '计略', type: 'strategy',
  power: 50, accuracy: 100, energyCost: 1, priority: 0,
  description: '基础计策攻击',
  effects: [],
};

const ATK_CHARGE: SkillDef = {
  id: 'atk_charge', name: '冲锋', type: 'martial',
  power: 55, accuracy: 95, energyCost: 2, priority: 0,
  description: '骑兵冲锋',
  effects: [],
};

// -- High cost attacks (cost 3-5, power 80-120) --

export const SKILLS: Record<string, SkillDef> = {
  // ===== Universal =====
  xuli: SKILL_CHARGE,

  // ===== Shared low-cost =====
  atk_slash: ATK_SLASH,
  atk_thrust: ATK_THRUST,
  atk_arrow: ATK_ARROW,
  atk_scheme: ATK_SCHEME,
  atk_charge: ATK_CHARGE,

  // ===== Shared defense =====
  def_shield: DEF_SHIELD,
  def_counter: DEF_COUNTER,
  def_resolve: DEF_RESOLVE,

  // ===== Unique high-cost attacks =====

  // -- Spear (枪) generals --
  qinglong_zhan: {
    id: 'qinglong_zhan', name: '青龙斩', type: 'martial',
    power: 100, accuracy: 90, energyCost: 4, priority: 0,
    description: '青龙偃月刀的沉重一击',
    effects: [],
  },
  longdan_qiang: {
    id: 'longdan_qiang', name: '龙胆枪', type: 'martial',
    power: 90, accuracy: 95, energyCost: 3, priority: 0,
    description: '迅猛的枪击',
    effects: [],
  },
  zhang_ba_she: {
    id: 'zhang_ba_she', name: '丈八蛇矛', type: 'martial',
    power: 110, accuracy: 85, energyCost: 5, priority: 0,
    description: '狂暴的蛇矛横扫，20%概率眩晕',
    effects: [{ type: 'status', target: 'enemy', chance: 20, value: { type: 'stun', turnsLeft: 1 } }],
  },
  tuxi: {
    id: 'tuxi', name: '突袭', type: 'martial',
    power: 80, accuracy: 100, energyCost: 3, priority: 1,
    description: '先制攻击',
    effects: [],
  },
  pojia: {
    id: 'pojia', name: '破甲', type: 'martial',
    power: 70, accuracy: 100, energyCost: 3, priority: 0,
    description: '降低目标DEF 1级',
    effects: [{ type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'def', stages: -1 } }],
  },
  dilijie: {
    id: 'dilijie', name: '地裂击', type: 'martial',
    power: 100, accuracy: 85, energyCost: 4, priority: -1,
    description: '后制高威力攻击',
    effects: [],
  },
  kuangbao_ji: {
    id: 'kuangbao_ji', name: '狂暴击', type: 'martial',
    power: 120, accuracy: 80, energyCost: 5, priority: 0,
    description: 'ATK+1但DEF-1',
    effects: [
      { type: 'statChange', target: 'self', chance: 100, value: { stat: 'atk', stages: 1 } },
      { type: 'statChange', target: 'self', chance: 100, value: { stat: 'def', stages: -1 } },
    ],
  },

  // -- Bow (弓) generals --
  luoshen_jian: {
    id: 'luoshen_jian', name: '落神箭', type: 'martial',
    power: 95, accuracy: 90, energyCost: 4, priority: 0,
    description: '精准一箭',
    effects: [],
  },
  huoshao_lianying: {
    id: 'huoshao_lianying', name: '火烧连营', type: 'strategy',
    power: 110, accuracy: 85, energyCost: 5, priority: 0,
    description: '30%概率灼烧',
    effects: [{ type: 'status', target: 'enemy', chance: 30, value: { type: 'burn', turnsLeft: 3 } }],
  },
  bazhen_tu: {
    id: 'bazhen_tu', name: '八阵图', type: 'strategy',
    power: 80, accuracy: 95, energyCost: 3, priority: 0,
    description: '30%概率混乱',
    effects: [{ type: 'status', target: 'enemy', chance: 30, value: { type: 'confusion', turnsLeft: 3 } }],
  },
  lianhua_ji: {
    id: 'lianhua_ji', name: '连环计', type: 'strategy',
    power: 90, accuracy: 90, energyCost: 4, priority: 0,
    description: '锁定对方（2回合）',
    effects: [{ type: 'special', target: 'enemy', chance: 100, value: { type: 'locked', turnsLeft: 2, value: 0 } }],
  },
  xie_tianzi: {
    id: 'xie_tianzi', name: '挟天子', type: 'strategy',
    power: 70, accuracy: 95, energyCost: 3, priority: 0,
    description: '降低目标ATK和INT各1级',
    effects: [
      { type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'atk', stages: -1 } },
      { type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'int', stages: -1 } },
    ],
  },
  lianzhu_jian: {
    id: 'lianzhu_jian', name: '连珠箭', type: 'martial',
    power: 30, accuracy: 90, energyCost: 3, priority: 0,
    description: '连续攻击2~4次',
    effects: [{ type: 'special', target: 'enemy', chance: 100, value: { multiHit: [2, 4] } }],
  },
  shuiyan_qijun: {
    id: 'shuiyan_qijun', name: '水淹七军', type: 'strategy',
    power: 90, accuracy: 90, energyCost: 4, priority: 0,
    description: '20%降低SPD 1级',
    effects: [{ type: 'statChange', target: 'enemy', chance: 20, value: { stat: 'spd', stages: -1 } }],
  },
  huifu_shu: {
    id: 'huifu_shu', name: '回春术', type: 'support',
    power: 0, accuracy: 100, energyCost: 2, priority: 0,
    description: '恢复自身30%最大HP',
    effects: [{ type: 'heal', target: 'self', chance: 100, value: { percent: 30 } }],
  },

  // -- Cavalry (骑) generals --
  fangtianhualv: {
    id: 'fangtianhualv', name: '方天画戟', type: 'martial',
    power: 120, accuracy: 80, energyCost: 5, priority: 0,
    description: '吕布绝技，暴力一击',
    effects: [],
  },
  qiuxian_ling: {
    id: 'qiuxian_ling', name: '求贤令', type: 'support',
    power: 0, accuracy: 100, energyCost: 3, priority: 0,
    description: '全属性+1级',
    effects: [
      { type: 'statChange', target: 'self', chance: 100, value: { stat: 'atk', stages: 1 } },
      { type: 'statChange', target: 'self', chance: 100, value: { stat: 'def', stages: 1 } },
      { type: 'statChange', target: 'self', chance: 100, value: { stat: 'spd', stages: 1 } },
    ],
  },
  renyi: {
    id: 'renyi', name: '仁义', type: 'support',
    power: 0, accuracy: 100, energyCost: 3, priority: 0,
    description: '恢复全队15%HP（仅自身）',
    effects: [{ type: 'heal', target: 'self', chance: 100, value: { percent: 40 } }],
  },
  tieqi_chong: {
    id: 'tieqi_chong', name: '铁骑冲锋', type: 'martial',
    power: 95, accuracy: 90, energyCost: 4, priority: 0,
    description: '骑兵重击',
    effects: [],
  },
  bawang_ji: {
    id: 'bawang_ji', name: '霸王击', type: 'martial',
    power: 100, accuracy: 90, energyCost: 4, priority: 0,
    description: '霸气一击，15%暴击加成',
    effects: [],
  },
  kuyin_ji: {
    id: 'kuyin_ji', name: '苦肉计', type: 'martial',
    power: 85, accuracy: 100, energyCost: 3, priority: 0,
    description: '自损10%HP，敌方灼烧',
    effects: [
      { type: 'status', target: 'enemy', chance: 100, value: { type: 'burn', turnsLeft: 3 } },
      { type: 'special', target: 'self', chance: 100, value: { selfDamagePercent: 10 } },
    ],
  },
};
