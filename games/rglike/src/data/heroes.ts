import { HeroDefinition } from '../types';

export const HERO_DEFINITIONS: HeroDefinition[] = [
  {
    id: 'zhaoYun',
    name: '赵云',
    title: '常山赵子龙',
    role: 'singleDPS',
    baseStats: { hp: 800, atk: 150, def: 60, spd: 110 },
    growth: { hp: 200, atk: 40, def: 15, spd: 5 },
    passive: {
      name: '龙胆',
      description: '攻击生命值低于30%的目标时，伤害提升50%',
    },
    skill: {
      name: '七进七出',
      description: '对单体敌人造成高额伤害，击杀后获得50%行动条',
      multiplier: 1.8,
      isAoE: false,
    },
    boundItemId: 'liangYinQiang',
  },
  {
    id: 'guanYu',
    name: '关羽',
    title: '美髯公',
    role: 'singleDPS',
    baseStats: { hp: 1100, atk: 140, def: 80, spd: 90 },
    growth: { hp: 280, atk: 35, def: 20, spd: 4 },
    passive: {
      name: '武圣',
      description: '每次攻击后叠加15%攻击力加成，最多5层，被攻击时清零',
    },
    skill: {
      name: '青龙偃月',
      description: '对单体敌人造成高额伤害，无视20%防御',
      multiplier: 2.0,
      isAoE: false,
    },
  },
  {
    id: 'zhangFei',
    name: '张飞',
    title: '燕人张翼德',
    role: 'tank',
    baseStats: { hp: 1800, atk: 80, def: 120, spd: 70 },
    growth: { hp: 450, atk: 15, def: 30, spd: 3 },
    passive: {
      name: '燕人之勇',
      description: '生命值低于40%时，防御力提升30%',
    },
    skill: {
      name: '当阳桥喝',
      description: '嘲讽所有敌人2次行动，造成范围伤害并降速10%',
      multiplier: 0.8,
      isAoE: true,
    },
    boundItemId: 'zhangBaSheMao',
  },
  {
    id: 'zhuGeLiang',
    name: '诸葛亮',
    title: '卧龙',
    role: 'aoeDPS',
    baseStats: { hp: 700, atk: 160, def: 40, spd: 95 },
    growth: { hp: 160, atk: 45, def: 10, spd: 5 },
    passive: {
      name: '八阵图',
      description: '范围技能每额外命中1个目标，伤害提升5%',
    },
    skill: {
      name: '火烧连营',
      description: '对所有敌人造成范围伤害，敌人>=3时附加灼烧',
      multiplier: 1.2,
      isAoE: true,
    },
    boundItemId: 'yuShan',
  },
  {
    id: 'zhouYu',
    name: '周瑜',
    title: '美周郎',
    role: 'aoeDPS',
    baseStats: { hp: 750, atk: 145, def: 45, spd: 100 },
    growth: { hp: 170, atk: 40, def: 12, spd: 5 },
    passive: {
      name: '火攻',
      description: '攻击附带灼烧效果，持续2次目标行动',
    },
    skill: {
      name: '赤壁之焰',
      description: '对所有敌人造成范围伤害，刷新并叠加灼烧',
      multiplier: 1.0,
      isAoE: true,
    },
  },
  {
    id: 'huaTuo',
    name: '华佗',
    title: '神医',
    role: 'healer',
    baseStats: { hp: 900, atk: 120, def: 55, spd: 105 },
    growth: { hp: 220, atk: 30, def: 15, spd: 5 },
    passive: {
      name: '妙手回春',
      description: '治疗附带持续回复效果，恢复20%攻击力的生命值',
    },
    skill: {
      name: '青囊术',
      description: '治疗血量最低的队友，目标低于30%时治疗量提升50%',
      multiplier: 1.8,
      isAoE: false,
    },
    boundItemId: 'qingNangJing',
  },
  {
    id: 'diaoChan',
    name: '貂蝉',
    title: '闭月',
    role: 'controller',
    baseStats: { hp: 750, atk: 130, def: 45, spd: 115 },
    growth: { hp: 180, atk: 30, def: 12, spd: 6 },
    passive: {
      name: '闭月',
      description: '被控制的敌人受到的伤害增加15%',
    },
    skill: {
      name: '倾国倾城',
      description: '魅惑1个敌人，清零行动条并跳过下次行动，附带伤害',
      multiplier: 1.0,
      isAoE: false,
    },
    boundItemId: 'meiRenJi',
  },
  {
    id: 'siMaYi',
    name: '司马懿',
    title: '鹰视狼顾',
    role: 'controller',
    baseStats: { hp: 850, atk: 125, def: 60, spd: 100 },
    growth: { hp: 200, atk: 30, def: 15, spd: 5 },
    passive: {
      name: '隐忍',
      description: '战斗开始时获得15%最大生命值的护盾',
    },
    skill: {
      name: '鹰视狼顾',
      description: '降低所有敌人20%速度2次行动，附带范围伤害',
      multiplier: 0.9,
      isAoE: true,
    },
  },
  {
    id: 'liuBei',
    name: '刘备',
    title: '仁德之主',
    role: 'buffer',
    baseStats: { hp: 1000, atk: 100, def: 70, spd: 85 },
    growth: { hp: 250, atk: 25, def: 18, spd: 4 },
    passive: {
      name: '仁德',
      description: '队友被击倒时，剩余存活队友攻击力提升10%',
    },
    skill: {
      name: '桃园结义',
      description: '为攻击力最高的队友提升25%攻击力和15%速度，持续3次行动',
      multiplier: 1.0,
      isAoE: false,
    },
    boundItemId: 'longFengChengXiang',
  },
  {
    id: 'sunShangXiang',
    name: '孙尚香',
    title: '弓腰姬',
    role: 'buffer',
    baseStats: { hp: 850, atk: 120, def: 50, spd: 120 },
    growth: { hp: 200, atk: 30, def: 13, spd: 6 },
    passive: {
      name: '弓腰姬',
      description: '速度超过100时，每多10点速度，普攻伤害提升5%',
    },
    skill: {
      name: '巾帼之舞',
      description: '为所有队友提升20%速度2次行动，附带单体伤害',
      multiplier: 1.3,
      isAoE: false,
    },
  },
];

export function getHeroDefinition(id: string): HeroDefinition {
  const hero = HERO_DEFINITIONS.find((h) => h.id === id);
  if (!hero) throw new Error(`Hero not found: ${id}`);
  return hero;
}
