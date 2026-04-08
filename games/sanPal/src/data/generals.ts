import type { GeneralDef } from './types';
import { SKILLS, SKILL_CHARGE } from './skills';

function s(id: string) {
  const skill = SKILLS[id];
  if (!skill) throw new Error(`Skill not found: ${id}`);
  return skill;
}

const C = SKILL_CHARGE; // universal charge skill

export const GENERALS: Record<string, GeneralDef> = {
  // ==================== ★★★★★ Legendary (Bosses) ====================
  zhang_jiao: {
    id: 'zhang_jiao', name: '张角', weapon: 'cavalry', faction: 'qun', star: 5,
    baseStats: { hp: 100, atk: 30, int: 85, def: 45, res: 75, spd: 55 },
    passive: { id: 'p_tianbian', name: '天变', description: '每3回合随机给对方施加异常状态' },
    skills: [s('atk_scheme'), s('bazhen_tu'), s('def_shield'), C],
  },
  dong_zhuo: {
    id: 'dong_zhuo', name: '董卓', weapon: 'cavalry', faction: 'qun', star: 5,
    baseStats: { hp: 110, atk: 75, int: 35, def: 80, res: 60, spd: 35 },
    passive: { id: 'p_baonue', name: '暴虐', description: 'HP<50%时ATK+50%' },
    skills: [s('atk_charge'), s('tieqi_chong'), s('def_shield'), C],
  },
  lv_bu: {
    id: 'lv_bu', name: '吕布', weapon: 'cavalry', faction: 'qun', star: 5,
    baseStats: { hp: 105, atk: 95, int: 25, def: 65, res: 45, spd: 70 },
    passive: { id: 'p_wushuang', name: '无双', description: '暴击率+20%，暴击伤害×2.0' },
    skills: [s('atk_charge'), s('fangtianhualv'), s('def_resolve'), C],
  },

  // ==================== ★★★★ Epic ====================
  cao_cao: {
    id: 'cao_cao', name: '曹操', weapon: 'cavalry', faction: 'wei', star: 4,
    baseStats: { hp: 90, atk: 40, int: 90, def: 60, res: 80, spd: 60 },
    passive: { id: 'p_jianxiong', name: '奸雄', description: '切换上场时随机降低对方一项属性1级' },
    skills: [s('atk_scheme'), s('xie_tianzi'), s('def_counter'), C],
  },
  liu_bei: {
    id: 'liu_bei', name: '刘备', weapon: 'cavalry', faction: 'shu', star: 4,
    baseStats: { hp: 95, atk: 35, int: 70, def: 60, res: 75, spd: 55 },
    passive: { id: 'p_rende', name: '仁德', description: '每回合恢复自身5%最大HP' },
    skills: [s('atk_charge'), s('renyi'), s('def_shield'), C],
  },
  sun_ce: {
    id: 'sun_ce', name: '孙策', weapon: 'cavalry', faction: 'wu', star: 4,
    baseStats: { hp: 90, atk: 90, int: 40, def: 60, res: 55, spd: 75 },
    passive: { id: 'p_bawang', name: '霸王', description: '暴击率+15%' },
    skills: [s('atk_charge'), s('bawang_ji'), s('def_resolve'), C],
  },
  zhuge_liang: {
    id: 'zhuge_liang', name: '诸葛亮', weapon: 'bow', faction: 'shu', star: 4,
    baseStats: { hp: 85, atk: 30, int: 100, def: 45, res: 80, spd: 65 },
    passive: { id: 'p_guanxing', name: '观星', description: '计策命中率+15%' },
    skills: [s('atk_scheme'), s('huoshao_lianying'), s('def_shield'), C],
  },
  sima_yi: {
    id: 'sima_yi', name: '司马懿', weapon: 'bow', faction: 'wei', star: 4,
    baseStats: { hp: 90, atk: 35, int: 95, def: 55, res: 85, spd: 55 },
    passive: { id: 'p_yinren', name: '隐忍', description: '受到攻击后INT+1级（上限+3）' },
    skills: [s('atk_scheme'), s('bazhen_tu'), s('def_counter'), C],
  },
  zhou_yu: {
    id: 'zhou_yu', name: '周瑜', weapon: 'bow', faction: 'wu', star: 4,
    baseStats: { hp: 80, atk: 35, int: 95, def: 50, res: 75, spd: 70 },
    passive: { id: 'p_chibi', name: '赤壁之焰', description: '对灼烧状态的敌人计策伤害+25%' },
    skills: [s('atk_scheme'), s('lianhua_ji'), s('def_shield'), C],
  },

  // ==================== ★★★ Rare ====================
  guan_yu: {
    id: 'guan_yu', name: '关羽', weapon: 'spear', faction: 'shu', star: 3,
    baseStats: { hp: 95, atk: 95, int: 40, def: 70, res: 55, spd: 55 },
    passive: { id: 'p_wusheng', name: '武圣', description: '武技暴击伤害×2.0' },
    skills: [s('atk_slash'), s('qinglong_zhan'), s('def_counter'), C],
  },
  zhang_fei: {
    id: 'zhang_fei', name: '张飞', weapon: 'spear', faction: 'shu', star: 3,
    baseStats: { hp: 100, atk: 85, int: 25, def: 75, res: 45, spd: 50 },
    passive: { id: 'p_baohou', name: '暴吼', description: '上场时30%概率使对方眩晕' },
    skills: [s('atk_thrust'), s('zhang_ba_she'), s('def_shield'), C],
  },
  zhao_yun: {
    id: 'zhao_yun', name: '赵云', weapon: 'spear', faction: 'shu', star: 3,
    baseStats: { hp: 90, atk: 85, int: 35, def: 75, res: 60, spd: 75 },
    passive: { id: 'p_hunshenshidan', name: '浑身是胆', description: 'HP<30%时SPD+50%，先制+1' },
    skills: [s('atk_thrust'), s('longdan_qiang'), s('def_counter'), C],
  },
  huang_zhong: {
    id: 'huang_zhong', name: '黄忠', weapon: 'bow', faction: 'shu', star: 3,
    baseStats: { hp: 80, atk: 90, int: 30, def: 55, res: 50, spd: 60 },
    passive: { id: 'p_baifa', name: '百发百中', description: '暴击率+20%' },
    skills: [s('atk_arrow'), s('luoshen_jian'), s('def_resolve'), C],
  },
  zhang_liao: {
    id: 'zhang_liao', name: '张辽', weapon: 'cavalry', faction: 'wei', star: 3,
    baseStats: { hp: 85, atk: 80, int: 35, def: 65, res: 50, spd: 80 },
    passive: { id: 'p_weizhen', name: '威震逍遥津', description: '第1回合SPD×2' },
    skills: [s('atk_charge'), s('tuxi'), s('def_counter'), C],
  },
  gan_ning: {
    id: 'gan_ning', name: '甘宁', weapon: 'cavalry', faction: 'wu', star: 3,
    baseStats: { hp: 85, atk: 80, int: 30, def: 60, res: 50, spd: 70 },
    passive: { id: 'p_jinfan', name: '锦帆', description: '击败敌方武将后SPD+1级' },
    skills: [s('atk_charge'), s('tieqi_chong'), s('def_resolve'), C],
  },
  lu_xun: {
    id: 'lu_xun', name: '陆逊', weapon: 'bow', faction: 'wu', star: 3,
    baseStats: { hp: 75, atk: 30, int: 85, def: 50, res: 70, spd: 65 },
    passive: { id: 'p_huoji', name: '火计', description: '计策技能附加20%灼烧概率' },
    skills: [s('atk_scheme'), s('huoshao_lianying'), s('def_shield'), C],
  },
  pang_tong: {
    id: 'pang_tong', name: '庞统', weapon: 'bow', faction: 'shu', star: 3,
    baseStats: { hp: 80, atk: 30, int: 90, def: 50, res: 75, spd: 55 },
    passive: { id: 'p_fengchu', name: '凤雏', description: '计策命中后目标RES-1级' },
    skills: [s('atk_scheme'), s('bazhen_tu'), s('def_shield'), C],
  },

  // ==================== ★★ Uncommon ====================
  xu_chu: {
    id: 'xu_chu', name: '许褚', weapon: 'spear', faction: 'wei', star: 2,
    baseStats: { hp: 85, atk: 60, int: 20, def: 70, res: 45, spd: 40 },
    passive: { id: 'p_huguo', name: '虎痴', description: 'DEF+15%' },
    skills: [s('atk_slash'), s('pojia'), s('def_shield'), C],
  },
  dian_wei: {
    id: 'dian_wei', name: '典韦', weapon: 'spear', faction: 'wei', star: 2,
    baseStats: { hp: 80, atk: 65, int: 20, def: 65, res: 40, spd: 45 },
    passive: { id: 'p_ewei', name: '恶来', description: '被攻击时反弹10%伤害' },
    skills: [s('atk_thrust'), s('tuxi'), s('def_counter'), C],
  },
  huang_gai: {
    id: 'huang_gai', name: '黄盖', weapon: 'spear', faction: 'wu', star: 2,
    baseStats: { hp: 80, atk: 60, int: 30, def: 55, res: 50, spd: 45 },
    passive: { id: 'p_kusheng', name: '苦肉', description: '受到伤害后ATK+1级' },
    skills: [s('atk_slash'), s('kuyin_ji'), s('def_resolve'), C],
  },
  ma_chao: {
    id: 'ma_chao', name: '马超', weapon: 'cavalry', faction: 'shu', star: 2,
    baseStats: { hp: 75, atk: 65, int: 25, def: 50, res: 40, spd: 65 },
    passive: { id: 'p_xiliang', name: '西凉铁骑', description: '第1回合ATK+30%' },
    skills: [s('atk_charge'), s('tieqi_chong'), s('def_resolve'), C],
  },
  xu_huang: {
    id: 'xu_huang', name: '徐晃', weapon: 'spear', faction: 'wei', star: 2,
    baseStats: { hp: 80, atk: 60, int: 25, def: 60, res: 45, spd: 50 },
    passive: { id: 'p_duanl', name: '断粮', description: '攻击时20%概率降低对方DEF 1级' },
    skills: [s('atk_slash'), s('pojia'), s('def_shield'), C],
  },
  taishi_ci: {
    id: 'taishi_ci', name: '太史慈', weapon: 'bow', faction: 'wu', star: 2,
    baseStats: { hp: 75, atk: 60, int: 25, def: 50, res: 45, spd: 60 },
    passive: { id: 'p_shenjian', name: '神箭', description: '连续攻击技能命中率+15%' },
    skills: [s('atk_arrow'), s('lianzhu_jian'), s('def_counter'), C],
  },
  zhang_he: {
    id: 'zhang_he', name: '张郃', weapon: 'spear', faction: 'wei', star: 2,
    baseStats: { hp: 80, atk: 55, int: 30, def: 65, res: 50, spd: 50 },
    passive: { id: 'p_qiaob', name: '巧变', description: '切换上场时DEF+1级' },
    skills: [s('atk_thrust'), s('pojia'), s('def_shield'), C],
  },
  wei_yan: {
    id: 'wei_yan', name: '魏延', weapon: 'spear', faction: 'shu', star: 2,
    baseStats: { hp: 80, atk: 65, int: 20, def: 50, res: 40, spd: 55 },
    passive: { id: 'p_fangu', name: '反骨', description: 'HP<40%时ATK+40%' },
    skills: [s('atk_thrust'), s('kuangbao_ji'), s('def_resolve'), C],
  },

  // ==================== ★ Common ====================
  liao_hua: {
    id: 'liao_hua', name: '廖化', weapon: 'cavalry', faction: 'shu', star: 1,
    baseStats: { hp: 70, atk: 50, int: 25, def: 45, res: 35, spd: 45 },
    passive: { id: 'p_xianfeng', name: '先锋', description: '无特殊效果' },
    skills: [s('atk_charge'), s('tieqi_chong'), s('def_shield'), C],
  },
  jiang_qin: {
    id: 'jiang_qin', name: '蒋钦', weapon: 'bow', faction: 'wu', star: 1,
    baseStats: { hp: 65, atk: 45, int: 25, def: 40, res: 35, spd: 55 },
    passive: { id: 'p_shuijun', name: '水军', description: 'SPD+10%' },
    skills: [s('atk_arrow'), s('luoshen_jian'), s('def_counter'), C],
  },
  yu_jin: {
    id: 'yu_jin', name: '于禁', weapon: 'spear', faction: 'wei', star: 1,
    baseStats: { hp: 75, atk: 40, int: 20, def: 55, res: 40, spd: 35 },
    passive: { id: 'p_yanzheng', name: '严整', description: 'DEF+10%' },
    skills: [s('atk_slash'), s('pojia'), s('def_shield'), C],
  },
  hua_tuo: {
    id: 'hua_tuo', name: '华佗', weapon: 'bow', faction: 'qun', star: 1,
    baseStats: { hp: 70, atk: 25, int: 55, def: 40, res: 50, spd: 45 },
    passive: { id: 'p_shenyi', name: '神医', description: '治疗效果+20%' },
    skills: [s('atk_scheme'), s('huifu_shu'), s('def_shield'), C],
  },
  zhu_rong: {
    id: 'zhu_rong', name: '祝融', weapon: 'bow', faction: 'shu', star: 1,
    baseStats: { hp: 70, atk: 50, int: 30, def: 40, res: 40, spd: 50 },
    passive: { id: 'p_huoshen', name: '火神', description: '免疫灼烧' },
    skills: [s('atk_arrow'), s('kuyin_ji'), s('def_resolve'), C],
  },
};

// Helpers
export function getGeneralDef(id: string): GeneralDef {
  const g = GENERALS[id];
  if (!g) throw new Error(`General not found: ${id}`);
  return g;
}

export function getGeneralsByStars(star: number): GeneralDef[] {
  return Object.values(GENERALS).filter(g => g.star === star);
}

// Starters: one per weapon type (bow/spear/cavalry)
export const STARTER_IDS = ['taishi_ci', 'dian_wei', 'ma_chao'] as const;
