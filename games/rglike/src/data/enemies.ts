import { EnemyDefinition } from '../types';

export const ENEMY_TEMPLATES: EnemyDefinition[] = [
  {
    id: 'melee',
    name: '步兵',
    type: 'melee',
    baseStats: { hp: 500, atk: 70, def: 50, spd: 60 },
    skill: { name: '劈砍', description: '单体物理攻击', multiplier: 1.2, isAoE: false },
  },
  {
    id: 'archer',
    name: '弓手',
    type: 'archer',
    baseStats: { hp: 350, atk: 85, def: 30, spd: 80 },
    skill: { name: '箭雨', description: '单体远程攻击', multiplier: 1.3, isAoE: false },
  },
  {
    id: 'mage',
    name: '术士',
    type: 'mage',
    baseStats: { hp: 300, atk: 95, def: 25, spd: 70 },
    skill: { name: '火球术', description: '范围魔法伤害', multiplier: 0.8, isAoE: true },
  },
  {
    id: 'elite',
    name: '精锐',
    type: 'elite',
    baseStats: { hp: 700, atk: 90, def: 60, spd: 65 },
    skill: { name: '重击', description: '高伤单体攻击', multiplier: 1.6, isAoE: false },
  },
];

export const BOSS_DEFINITIONS: EnemyDefinition[] = [
  {
    id: 'boss_1',
    name: '黄巾力士',
    type: 'boss',
    baseStats: { hp: 2500, atk: 100, def: 70, spd: 55 },
    skill: { name: '蛮力横扫', description: '范围物理攻击', multiplier: 1.0, isAoE: true },
    isBoss: true,
    bossPhaseThreshold: 0.5,
    bossPhase2Skill: { name: '狂暴冲锋', description: '强力单体攻击', multiplier: 2.2, isAoE: false },
    bossSpecial: '血量低于50%时进入狂暴状态，攻击力和速度提升20%',
  },
  {
    id: 'boss_2',
    name: '董卓',
    type: 'boss',
    baseStats: { hp: 3500, atk: 120, def: 90, spd: 50 },
    skill: { name: '暴政', description: '全体攻击并降低防御', multiplier: 0.9, isAoE: true },
    isBoss: true,
    bossPhaseThreshold: 0.5,
    bossPhase2Skill: { name: '焚城', description: '超强范围攻击', multiplier: 1.4, isAoE: true },
    bossSpecial: '血量低于50%时召唤2个步兵',
  },
  {
    id: 'boss_3',
    name: '吕布',
    type: 'boss',
    baseStats: { hp: 4000, atk: 160, def: 80, spd: 75 },
    skill: { name: '无双乱舞', description: '全体高伤攻击', multiplier: 1.2, isAoE: true },
    isBoss: true,
    bossPhaseThreshold: 0.5,
    bossPhase2Skill: { name: '天下无双', description: '毁灭性单体攻击', multiplier: 3.0, isAoE: false },
    bossSpecial: '血量低于50%后每次行动恢复5%最大生命值',
  },
  {
    id: 'boss_4',
    name: '曹操',
    type: 'boss',
    baseStats: { hp: 4500, atk: 140, def: 100, spd: 70 },
    skill: { name: '挟天子', description: '降低全队攻击力15%并攻击', multiplier: 1.0, isAoE: true },
    isBoss: true,
    bossPhaseThreshold: 0.5,
    bossPhase2Skill: { name: '奸雄之怒', description: '3次随机单体攻击', multiplier: 1.5, isAoE: false },
    bossSpecial: '血量低于50%时召唤1个精锐和1个弓手',
  },
  {
    id: 'boss_5',
    name: '孙权',
    type: 'boss',
    baseStats: { hp: 5000, atk: 150, def: 110, spd: 65 },
    skill: { name: '江东之虎', description: '全体攻击并为自身加护盾', multiplier: 1.1, isAoE: true },
    isBoss: true,
    bossPhaseThreshold: 0.5,
    bossPhase2Skill: { name: '决死一战', description: '牺牲防御换取极高攻击', multiplier: 2.5, isAoE: true },
    bossSpecial: '血量低于50%时防御力归零但攻击力翻倍',
  },
  {
    id: 'boss_6',
    name: '司马昭',
    type: 'boss',
    baseStats: { hp: 6000, atk: 170, def: 120, spd: 80 },
    skill: { name: '篡位之心', description: '全体攻击并沉默一人', multiplier: 1.3, isAoE: true },
    isBoss: true,
    bossPhaseThreshold: 0.5,
    bossPhase2Skill: { name: '天命所归', description: '对血量最低的单位造成致命伤害', multiplier: 4.0, isAoE: false },
    bossSpecial: '血量低于50%后每3次行动召唤1个术士',
  },
];

export function getBossForRound(round: number): EnemyDefinition {
  const bossIndex = Math.floor(round / 5) - 1;
  return BOSS_DEFINITIONS[Math.min(bossIndex, BOSS_DEFINITIONS.length - 1)];
}
