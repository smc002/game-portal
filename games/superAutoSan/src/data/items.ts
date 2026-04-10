import type { ItemDef } from './types';

export const items: ItemDef[] = [
  // Tier 1
  { id: 'mantou', name: '馒头', originalName: 'Apple', tier: 1, cost: 3, type: 'stat', description: '+1/+1（永久）' },
  { id: 'jinnang', name: '传令符', originalName: 'Honey', tier: 1, cost: 3, type: 'perk', description: '阵亡时召唤1/1信兵' },

  // Tier 2
  { id: 'jiu', name: '酒', originalName: 'Cupcake', tier: 2, cost: 3, type: 'stat', description: '+3/+3（临时）' },
  { id: 'tiegu', name: '铁骨', originalName: 'Meat Bone', tier: 2, cost: 3, type: 'perk', description: '每次攻击 +3 伤害' },
  { id: 'anmianyao', name: '安眠药', originalName: 'Sleeping Pill', tier: 2, cost: 1, type: 'special', description: '使1个己方武将阵亡' },

  // Tier 3
  { id: 'tiejia', name: '铁甲', originalName: 'Garlic', tier: 3, cost: 3, type: 'perk', description: '受到攻击 -2 伤害' },
  { id: 'junliang', name: '军粮', originalName: 'Salad Bowl', tier: 3, cost: 3, type: 'stat', description: '2个随机武将 +1/+1' },

  // Tier 4
  { id: 'bingshu', name: '兵书', originalName: 'Canned Food', tier: 4, cost: 3, type: 'special', description: '所有未来商店武将 +1/+1（永久叠加）' },
  { id: 'xiantao', name: '仙桃', originalName: 'Pear', tier: 4, cost: 3, type: 'stat', description: '+2/+2' },

  // Tier 5
  { id: 'lieyan', name: '烈焰', originalName: 'Chili', tier: 5, cost: 3, type: 'perk', description: '攻击后对目标后方造成5伤害' },
  { id: 'bingfa', name: '兵法', originalName: 'Chocolate', tier: 5, cost: 3, type: 'special', description: '+1经验值' },
  { id: 'yushan', name: '御膳', originalName: 'Sushi', tier: 5, cost: 3, type: 'stat', description: '3个随机武将 +1/+1' },

  // Tier 6
  { id: 'tiebi', name: '铁壁', originalName: 'Melon', tier: 6, cost: 3, type: 'perk', description: '吸收20伤害（一次性）' },
  { id: 'huanhundan', name: '还魂丹', originalName: 'Mushroom', tier: 6, cost: 3, type: 'perk', description: '阵亡后以1/1复活（保留等级）' },
  { id: 'yuyan', name: '御宴', originalName: 'Pizza', tier: 6, cost: 3, type: 'stat', description: '2个随机武将 +2/+2' },
  { id: 'qinglongyanyuedao', name: '青龙偃月刀', originalName: 'Steak', tier: 6, cost: 3, type: 'perk', description: '第一次攻击 +20 伤害（一次性）' },
];
