import type { HeroInstance } from '../types/hero.js';
import { HERO_TEMPLATES } from './heroes.js';

/** 从模板创建NPC武将实例 */
function createNpcHero(templateId: string, starLevel: number, instancePrefix: string, idx: number): HeroInstance | null {
  const tmpl = HERO_TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return null;

  const starMultiplier = 1 + (starLevel - 1) * 0.1;
  return {
    instanceId: `${instancePrefix}_${idx}`,
    templateId: tmpl.id,
    name: tmpl.name,
    faction: tmpl.faction,
    heroClass: tmpl.heroClass,
    starLevel,
    attack: Math.round(tmpl.baseAttack * starMultiplier),
    speed: Math.round(tmpl.baseSpeed * starMultiplier),
    specialPower: Math.round(tmpl.baseSpecialPower * starMultiplier),
    skillId: tmpl.skillId,
    atb: 0,
    buffs: [],
  };
}

/** 吕布巡逻NPC阵容（5星，不可战胜） */
export function getLubuFormation(): (HeroInstance | null)[] {
  const heroes: (HeroInstance | null)[] = [
    createNpcHero('lubu', 5, 'npc_lubu', 0),
    createNpcHero('diaochan', 5, 'npc_lubu', 1),
    createNpcHero('zhangfei', 5, 'npc_lubu', 2),
    createNpcHero('guanyu', 5, 'npc_lubu', 3),
    createNpcHero('zhaoyun', 5, 'npc_lubu', 4),
  ];
  return heroes;
}

/** 弱NPC阵容（1星3武将，可被初始阵容击败） */
export function getWeakNpcFormation(): (HeroInstance | null)[] {
  // 随机选3个不同模板
  const shuffled = [...HERO_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  const formation: (HeroInstance | null)[] = selected.map((tmpl, idx) =>
    createNpcHero(tmpl.id, 1, 'npc_weak', idx)
  );
  // 补齐到5个位置
  while (formation.length < 5) formation.push(null);
  return formation;
}

/** 中等NPC阵容（2星4武将，与玩家战力相当） */
export function getMediumNpcFormation(): (HeroInstance | null)[] {
  const shuffled = [...HERO_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);
  const formation: (HeroInstance | null)[] = selected.map((tmpl, idx) =>
    createNpcHero(tmpl.id, 2, 'npc_med', idx)
  );
  while (formation.length < 5) formation.push(null);
  return formation;
}

/** 计算NPC阵容预估战力 */
export function getNpcPower(formation: (HeroInstance | null)[]): number {
  let power = 0;
  for (const hero of formation) {
    if (hero) {
      power += (hero.attack + hero.speed + hero.specialPower) * hero.starLevel;
    }
  }
  return power;
}

/** 弱NPC名称池 */
const WEAK_NPC_NAMES = [
  '山贼头目', '黄巾残党', '流寇首领', '马匪当家', '叛军小将',
  '江洋大盗', '蛮族游骑', '逃兵队长',
];

/** 中等NPC名称池 */
const MEDIUM_NPC_NAMES = [
  '游击校尉', '边境守将', '义军统领', '巡防都尉', '镇关司马',
  '屯田校尉', '讨逆先锋', '护粮将军',
];

/** 获取随机弱NPC名称 */
export function getRandomWeakNpcName(): string {
  return WEAK_NPC_NAMES[Math.floor(Math.random() * WEAK_NPC_NAMES.length)];
}

/** 获取随机中等NPC名称 */
export function getRandomMediumNpcName(): string {
  return MEDIUM_NPC_NAMES[Math.floor(Math.random() * MEDIUM_NPC_NAMES.length)];
}
