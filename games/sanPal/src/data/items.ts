import type { ItemDef } from './types';

export const ITEMS: Record<string, ItemDef> = {
  // ===== Capture =====
  zhujian: {
    id: 'zhujian', name: '竹简', category: 'capture',
    description: '基础捕获道具，40%基础捕获率', price: 30,
    effect: { captureRate: 40 },
  },
  jinnang: {
    id: 'jinnang', name: '锦囊', category: 'capture',
    description: '高级捕获道具，65%基础捕获率', price: 80,
    effect: { captureRate: 65 },
  },
  yuxi: {
    id: 'yuxi', name: '玉玺', category: 'capture',
    description: '必定捕获', price: 999,
    effect: { captureRate: 100 },
  },

  // ===== Heal (out of battle) =====
  jinchuangyao: {
    id: 'jinchuangyao', name: '金创药', category: 'heal',
    description: '恢复单体40%HP', price: 25,
    effect: { healPercent: 40, target: 'single' },
  },
  huatuogao: {
    id: 'huatuogao', name: '华佗膏', category: 'heal',
    description: '恢复单体100%HP', price: 60,
    effect: { healPercent: 100, target: 'single' },
  },
  taipingyaoshu: {
    id: 'taipingyaoshu', name: '太平要术', category: 'heal',
    description: '全队恢复30%HP', price: 80,
    effect: { healPercent: 30, target: 'all' },
  },

  // ===== Upgrade =====
  bingfashu: {
    id: 'bingfashu', name: '兵法书', category: 'heal',
    description: '全队武将等级+1', price: 120,
    effect: { levelUp: 1, target: 'all' },
  },

  // ===== Battle (in battle, free action) =====
  gu: {
    id: 'gu', name: '战鼓', category: 'battle',
    description: '己方当前武将ATK+2级', price: 40,
    effect: { statChange: { stat: 'atk', stages: 2 }, target: 'self' },
  },
  qi: {
    id: 'qi', name: '战旗', category: 'battle',
    description: '己方当前武将DEF/RES+1级', price: 40,
    effect: { statChange: [{ stat: 'def', stages: 1 }, { stat: 'res', stages: 1 }], target: 'self' },
  },
  yanwudan: {
    id: 'yanwudan', name: '烟雾弹', category: 'battle',
    description: '降低对方SPD 2级', price: 50,
    effect: { statChange: { stat: 'spd', stages: -2 }, target: 'enemy' },
  },
  bingliangwan: {
    id: 'bingliangwan', name: '兵粮丸', category: 'battle',
    description: '恢复当前武将30%HP', price: 35,
    effect: { healPercent: 30, target: 'self' },
  },
};
