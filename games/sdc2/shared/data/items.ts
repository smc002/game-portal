import { ItemType } from '../types/items.js';
import type { Item, ItemRarity, LootEntry } from '../types/items.js';

let itemIdCounter = 0;

/** 生成唯一物品ID */
export function generateItemId(): string {
  return `item_${Date.now()}_${++itemIdCounter}`;
}

/** 背包最大容量 */
export const MAX_INVENTORY_SIZE = 20;

// ═══════════════════════════════════════════════
//  物资变体定义（按品质分层）
// ═══════════════════════════════════════════════

interface ResourceVariant {
  name: string;
  description: string;
  goldValueRange: [number, number];
}

/** 灰色物资 — 基础物资 */
const GRAY_RESOURCES: ResourceVariant[] = [
  { name: '粮草', description: '军中常备的口粮干饼', goldValueRange: [5, 15] },
  { name: '布匹', description: '粗织的棉麻布料', goldValueRange: [8, 18] },
  { name: '木材', description: '普通的建筑用材', goldValueRange: [10, 20] },
];

/** 绿色物资 — 精良物资 */
const GREEN_RESOURCES: ResourceVariant[] = [
  { name: '铁矿石', description: '可冶炼兵器的矿石', goldValueRange: [20, 40] },
  { name: '药材', description: '珍贵的草药材料', goldValueRange: [18, 35] },
  { name: '皮革', description: '上等的兽皮革料', goldValueRange: [15, 30] },
];

/** 蓝色物资 — 珍稀物资 */
const BLUE_RESOURCES: ResourceVariant[] = [
  { name: '金锭', description: '成色上佳的金块', goldValueRange: [50, 90] },
  { name: '玉石', description: '温润通透的美玉', goldValueRange: [60, 100] },
  { name: '丝绸', description: '蜀中上品锦缎', goldValueRange: [45, 80] },
];

/** 橙色物资 — 传世物资 */
const ORANGE_RESOURCES: ResourceVariant[] = [
  { name: '夜明珠', description: '暗中自放光华的奇珍', goldValueRange: [120, 200] },
  { name: '玉玺碎片', description: '传国玉玺的残片，价值连城', goldValueRange: [150, 250] },
];

const RESOURCE_BY_RARITY: Record<ItemRarity, ResourceVariant[]> = {
  gray: GRAY_RESOURCES,
  green: GREEN_RESOURCES,
  blue: BLUE_RESOURCES,
  orange: ORANGE_RESOURCES,
};

// ═══════════════════════════════════════════════
//  按危险度的物资品质权重（决定搜到哪个品质的物资）
// ═══════════════════════════════════════════════

interface RarityWeight { rarity: ItemRarity; weight: number; }

const RESOURCE_RARITY_WEIGHTS: Record<number, RarityWeight[]> = {
  1: [
    { rarity: 'gray', weight: 80 },
    { rarity: 'green', weight: 18 },
    { rarity: 'blue', weight: 2 },
  ],
  2: [
    { rarity: 'gray', weight: 60 },
    { rarity: 'green', weight: 30 },
    { rarity: 'blue', weight: 8 },
    { rarity: 'orange', weight: 2 },
  ],
  3: [
    { rarity: 'gray', weight: 40 },
    { rarity: 'green', weight: 35 },
    { rarity: 'blue', weight: 18 },
    { rarity: 'orange', weight: 7 },
  ],
  4: [
    { rarity: 'gray', weight: 20 },
    { rarity: 'green', weight: 35 },
    { rarity: 'blue', weight: 28 },
    { rarity: 'orange', weight: 17 },
  ],
  5: [
    { rarity: 'gray', weight: 10 },
    { rarity: 'green', weight: 25 },
    { rarity: 'blue', weight: 35 },
    { rarity: 'orange', weight: 30 },
  ],
};

// ═══════════════════════════════════════════════
//  可使用物品（非物资）权重表（占总搜索的20%）
// ═══════════════════════════════════════════════

interface UsableEntry {
  itemType: ItemType;
  weight: number;
}

const USABLE_ITEM_WEIGHTS: Record<number, UsableEntry[]> = {
  1: [
    { itemType: ItemType.Potion, weight: 50 },
    { itemType: ItemType.SpeedBoost, weight: 30 },
    { itemType: ItemType.Scout, weight: 10 },
    { itemType: ItemType.Bluff, weight: 5 },
    { itemType: ItemType.Star, weight: 5 },
  ],
  2: [
    { itemType: ItemType.Potion, weight: 30 },
    { itemType: ItemType.SpeedBoost, weight: 25 },
    { itemType: ItemType.Scout, weight: 15 },
    { itemType: ItemType.Bluff, weight: 15 },
    { itemType: ItemType.Star, weight: 15 },
  ],
  3: [
    { itemType: ItemType.Potion, weight: 25 },
    { itemType: ItemType.SpeedBoost, weight: 15 },
    { itemType: ItemType.Scout, weight: 15 },
    { itemType: ItemType.Bluff, weight: 20 },
    { itemType: ItemType.Star, weight: 25 },
  ],
  4: [
    { itemType: ItemType.Potion, weight: 20 },
    { itemType: ItemType.SpeedBoost, weight: 15 },
    { itemType: ItemType.Scout, weight: 15 },
    { itemType: ItemType.Bluff, weight: 20 },
    { itemType: ItemType.Star, weight: 30 },
  ],
  5: [
    { itemType: ItemType.Potion, weight: 15 },
    { itemType: ItemType.SpeedBoost, weight: 15 },
    { itemType: ItemType.Scout, weight: 15 },
    { itemType: ItemType.Bluff, weight: 15 },
    { itemType: ItemType.Star, weight: 40 },
  ],
};

/** 物品名称与描述（可使用物品） */
const USABLE_ITEM_INFO: Record<string, { name: string; description: string; rarity: ItemRarity }> = {
  [ItemType.Star]: { name: '将星', description: '使用后可抽取一名武将', rarity: 'orange' },
  [ItemType.Potion]: { name: '血瓶', description: '非战斗状态恢复100生命值', rarity: 'green' },
  [ItemType.Bluff]: { name: '虚张声势', description: '使敌方视角中你的战力显示极高', rarity: 'blue' },
  [ItemType.Scout]: { name: '侦察兵', description: '看穿敌方虚张声势，显示真实阵容', rarity: 'blue' },
  [ItemType.SpeedBoost]: { name: '加速药水', description: '大幅缩短移动和搜索读条时间', rarity: 'green' },
};

/** 搜索中物资出现的概率（vs 可使用物品） */
const RESOURCE_CHANCE = 0.80;

// ═══════════════════════════════════════════════
//  掉落函数
// ═══════════════════════════════════════════════

/** 加权随机选择 */
function weightedPick<T extends { weight: number }>(entries: T[]): T {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

/** 随机生成一个物资类物品 */
function rollResource(dangerLevel: number): Item {
  const rarityTable = RESOURCE_RARITY_WEIGHTS[dangerLevel] || RESOURCE_RARITY_WEIGHTS[1];
  const picked = weightedPick(rarityTable);
  const variants = RESOURCE_BY_RARITY[picked.rarity];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  const [min, max] = variant.goldValueRange;
  const goldValue = Math.floor(min + Math.random() * (max - min + 1));

  return {
    id: generateItemId(),
    type: ItemType.Resource,
    name: variant.name,
    description: variant.description,
    goldValue,
    rarity: picked.rarity,
  };
}

/** 随机生成一个可使用物品 */
function rollUsableItem(dangerLevel: number): Item {
  const table = USABLE_ITEM_WEIGHTS[dangerLevel] || USABLE_ITEM_WEIGHTS[1];
  const picked = weightedPick(table);
  const info = USABLE_ITEM_INFO[picked.itemType];

  return {
    id: generateItemId(),
    type: picked.itemType,
    name: info.name,
    description: info.description,
    goldValue: 0,
    rarity: info.rarity,
  };
}

/** 根据危险度掉落随机物品（80%物资 / 20%可使用物品） */
export function rollLoot(dangerLevel: number): Item {
  if (Math.random() < RESOURCE_CHANCE) {
    return rollResource(dangerLevel);
  }
  return rollUsableItem(dangerLevel);
}

/** 获取物品信息（可使用物品） */
export function getItemInfo(type: ItemType): { name: string; description: string } {
  const info = USABLE_ITEM_INFO[type];
  if (info) return { name: info.name, description: info.description };
  return { name: '物资', description: '可在撤离时折算为金币' };
}

// ═══════════════════════════════════════════════
//  品质与搜索时长
// ═══════════════════════════════════════════════

/** 品质→搜索耗时（秒） */
const RARITY_SEARCH_DURATION: Record<ItemRarity, number> = {
  gray: 1,
  green: 2,
  blue: 3,
  orange: 5,
};

/** 获取物品品质（直接从Item.rarity取） */
export function getItemRarity(item: Item): ItemRarity {
  return item.rarity;
}

/** 获取品质对应的搜索耗时（秒） */
export function getSearchDuration(rarity: ItemRarity): number {
  return RARITY_SEARCH_DURATION[rarity];
}

/** 品质→颜色 */
export const RARITY_COLORS: Record<ItemRarity, string> = {
  gray: '#8a7560',
  green: '#4a9e5a',
  blue: '#5b8abf',
  orange: '#d4a017',
};

// ═══════════════════════════════════════════════
//  兼容旧掉落表（城池物资池初始化仍可引用）
// ═══════════════════════════════════════════════

/** 按危险度索引的掉落表（保留供城池物资池容量参考） */
export const LOOT_TABLES: Record<number, LootEntry[]> = {
  1: [{ itemType: ItemType.Resource, weight: 100, goldValueRange: [5, 20] }],
  2: [{ itemType: ItemType.Resource, weight: 100, goldValueRange: [10, 40] }],
  3: [{ itemType: ItemType.Resource, weight: 100, goldValueRange: [15, 80] }],
  4: [{ itemType: ItemType.Resource, weight: 100, goldValueRange: [30, 120] }],
  5: [{ itemType: ItemType.Resource, weight: 100, goldValueRange: [50, 250] }],
};
