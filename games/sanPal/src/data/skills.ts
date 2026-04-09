import type { SkillDef } from './types';

// ===== Universal Charge Skill =====
export const SKILL_CHARGE: SkillDef = {
  id: 'xuli', name: '蓄力', type: 'support',
  power: 0, accuracy: 100, energyCost: 0, priority: 0,
  description: '恢复5点能量',
  effects: [{ type: 'special', target: 'self', chance: 100, value: { energyRestore: 5 } }],
};

// ===== Shared Defense Skills (priority +2 = absolute first) =====
const DEF_SHIELD: SkillDef = {
  id: 'def_shield', name: '坚守', type: 'support',
  power: 0, accuracy: 100, energyCost: 1, priority: 2,
  description: '先制防御；受攻击伤害减免80%，并获得护盾（20%最大HP）',
  effects: [{ type: 'special', target: 'self', chance: 100, value: { type: 'stance', turnsLeft: 1, value: 1 } }],
};

const DEF_COUNTER: SkillDef = {
  id: 'def_counter', name: '反击架势', type: 'support',
  power: 0, accuracy: 100, energyCost: 1, priority: 2,
  description: '先制防御；受攻击伤害减免80%，DEF+1级',
  effects: [{ type: 'special', target: 'self', chance: 100, value: { type: 'stance', turnsLeft: 1, value: 2 } }],
};

const DEF_RESOLVE: SkillDef = {
  id: 'def_resolve', name: '破釜沉舟', type: 'support',
  power: 0, accuracy: 100, energyCost: 1, priority: 2,
  description: '先制防御；受攻击伤害减免80%，ATK+1级',
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

// ===== Debuff Skills (cheap slot-0 replacements for combo generals) =====

const SKILL_HUOGONG: SkillDef = {
  id: 'huogong', name: '火攻', type: 'strategy',
  power: 45, accuracy: 95, energyCost: 1, priority: 0,
  description: '火系计策，60%概率灼烧',
  effects: [{ type: 'status', target: 'enemy', chance: 60, value: { type: 'burn', turnsLeft: 3 } }],
};

const SKILL_ZONGHUO: SkillDef = {
  id: 'zonghuo', name: '纵火', type: 'strategy',
  power: 40, accuracy: 100, energyCost: 1, priority: 0,
  description: '纵火骚扰，50%概率灼烧',
  effects: [{ type: 'status', target: 'enemy', chance: 50, value: { type: 'burn', turnsLeft: 3 } }],
};

const SKILL_QIMEN: SkillDef = {
  id: 'qimen_shu', name: '奇门术', type: 'strategy',
  power: 50, accuracy: 95, energyCost: 1, priority: 0,
  description: '奇门遁甲之术，40%概率混乱',
  effects: [{ type: 'status', target: 'enemy', chance: 40, value: { type: 'confusion', turnsLeft: 3 } }],
};

const SKILL_ANSUAN: SkillDef = {
  id: 'ansuan', name: '暗算', type: 'strategy',
  power: 45, accuracy: 95, energyCost: 1, priority: 0,
  description: '暗中下毒，50%概率中毒',
  effects: [{ type: 'status', target: 'enemy', chance: 50, value: { type: 'poison', turnsLeft: -1 } }],
};

const SKILL_WEIYA: SkillDef = {
  id: 'weiya', name: '威压', type: 'martial',
  power: 40, accuracy: 100, energyCost: 1, priority: 0,
  description: '气势压制，降低目标DEF 1级',
  effects: [{ type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'def', stages: -1 } }],
};

const SKILL_HANQIANG: SkillDef = {
  id: 'hanqiang_ci', name: '寒枪刺', type: 'martial',
  power: 45, accuracy: 95, energyCost: 1, priority: 0,
  description: '寒气枪刺，25%概率冰冻',
  effects: [{ type: 'status', target: 'enemy', chance: 25, value: { type: 'freeze', turnsLeft: -1 } }],
};

const SKILL_NUHE: SkillDef = {
  id: 'nuhe', name: '怒喝', type: 'martial',
  power: 35, accuracy: 100, energyCost: 1, priority: 0,
  description: '怒吼震慑，降低DEF 1级，20%眩晕',
  effects: [
    { type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'def', stages: -1 } },
    { type: 'status', target: 'enemy', chance: 20, value: { type: 'stun', turnsLeft: 1 } },
  ],
};

const SKILL_LUOFENG: SkillDef = {
  id: 'luofeng', name: '落凤', type: 'strategy',
  power: 40, accuracy: 100, energyCost: 1, priority: 0,
  description: '落凤之计，降低目标RES 1级',
  effects: [{ type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'res', stages: -1 } }],
};

const SKILL_LIJIAN: SkillDef = {
  id: 'lijian', name: '离间', type: 'strategy',
  power: 40, accuracy: 100, energyCost: 1, priority: 0,
  description: '离间之计，降低目标ATK 1级',
  effects: [{ type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'atk', stages: -1 } }],
};

// ===== Unique Exploit Skills (combo finishers) =====

const SKILL_TIANLEI: SkillDef = {
  id: 'tianlei', name: '天雷', type: 'strategy',
  power: 100, accuracy: 85, energyCost: 5, priority: 0,
  description: '天降雷霆，30%混乱。对混乱目标伤害×1.5',
  effects: [{ type: 'status', target: 'enemy', chance: 30, value: { type: 'confusion', turnsLeft: 3 } }],
  bonusVsStatus: { status: 'confusion', multiplier: 1.5 },
};

const SKILL_QUANMOU: SkillDef = {
  id: 'quanmou', name: '权谋', type: 'strategy',
  power: 90, accuracy: 90, energyCost: 4, priority: 0,
  description: '隐忍权谋之计。对中毒目标伤害×1.5',
  effects: [],
  bonusVsStatus: { status: 'poison', multiplier: 1.5 },
};

const SKILL_LIANHUANZHEN: SkillDef = {
  id: 'lianhuanzhen', name: '连环阵', type: 'strategy',
  power: 85, accuracy: 90, energyCost: 3, priority: 0,
  description: '30%混乱。对属性降低目标伤害×1.5',
  effects: [{ type: 'status', target: 'enemy', chance: 30, value: { type: 'confusion', turnsLeft: 3 } }],
  bonusVsDebuffed: 1.5,
};

export const SKILLS: Record<string, SkillDef> = {
  // ===== Universal =====
  xuli: SKILL_CHARGE,

  // ===== Shared low-cost =====
  atk_slash: ATK_SLASH,
  atk_thrust: ATK_THRUST,
  atk_arrow: ATK_ARROW,
  atk_scheme: ATK_SCHEME,
  atk_charge: ATK_CHARGE,

  // ===== Debuff (combo starters) =====
  huogong: SKILL_HUOGONG,
  zonghuo: SKILL_ZONGHUO,
  qimen_shu: SKILL_QIMEN,
  ansuan: SKILL_ANSUAN,
  weiya: SKILL_WEIYA,
  hanqiang_ci: SKILL_HANQIANG,
  nuhe: SKILL_NUHE,
  luofeng: SKILL_LUOFENG,
  lijian: SKILL_LIJIAN,

  // ===== Exploit (combo finishers) =====
  tianlei: SKILL_TIANLEI,
  quanmou: SKILL_QUANMOU,
  lianhuanzhen: SKILL_LIANHUANZHEN,

  // ===== Shared defense =====
  def_shield: DEF_SHIELD,
  def_counter: DEF_COUNTER,
  def_resolve: DEF_RESOLVE,

  // ===== Unique high-cost attacks =====

  // -- Spear (枪) generals --
  qinglong_zhan: {
    id: 'qinglong_zhan', name: '青龙斩', type: 'martial',
    power: 100, accuracy: 90, energyCost: 4, priority: 0,
    description: '青龙偃月刀重击。对属性降低目标×1.5',
    effects: [],
    bonusVsDebuffed: 1.5,
  },
  longdan_qiang: {
    id: 'longdan_qiang', name: '龙胆枪', type: 'martial',
    power: 90, accuracy: 95, energyCost: 3, priority: 0,
    description: '迅猛枪击。对冰冻目标伤害×2.0',
    effects: [],
    bonusVsStatus: { status: 'freeze', multiplier: 2.0 },
  },
  zhang_ba_she: {
    id: 'zhang_ba_she', name: '丈八蛇矛', type: 'martial',
    power: 110, accuracy: 85, energyCost: 5, priority: 0,
    description: '蛇矛横扫，20%眩晕。对属性降低目标×1.5',
    effects: [{ type: 'status', target: 'enemy', chance: 20, value: { type: 'stun', turnsLeft: 1 } }],
    bonusVsDebuffed: 1.5,
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
    description: '30%灼烧。对灼烧目标伤害×1.5',
    effects: [{ type: 'status', target: 'enemy', chance: 30, value: { type: 'burn', turnsLeft: 3 } }],
    bonusVsStatus: { status: 'burn', multiplier: 1.5 },
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
    description: '锁定对方（2回合）。对灼烧目标×1.5',
    effects: [{ type: 'special', target: 'enemy', chance: 100, value: { type: 'locked', turnsLeft: 2, value: 0 } }],
    bonusVsStatus: { status: 'burn', multiplier: 1.5 },
  },
  xie_tianzi: {
    id: 'xie_tianzi', name: '挟天子', type: 'strategy',
    power: 70, accuracy: 95, energyCost: 3, priority: 0,
    description: 'ATK和INT各-1级。对属性降低目标×1.5',
    effects: [
      { type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'atk', stages: -1 } },
      { type: 'statChange', target: 'enemy', chance: 100, value: { stat: 'int', stages: -1 } },
    ],
    bonusVsDebuffed: 1.5,
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
