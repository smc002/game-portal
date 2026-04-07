/** 物品类型 */
export enum ItemType {
  Resource = 'resource',        // 普通物资（经济物）
  Star = 'star',                // 将星
  Potion = 'potion',            // 血瓶
  Bluff = 'bluff',              // 虚张声势
  Scout = 'scout',              // 侦察兵
  SpeedBoost = 'speed_boost',   // 加速药水
}

/** 物品品质 */
export type ItemRarity = 'gray' | 'green' | 'blue' | 'orange';

/** 物品实例 */
export interface Item {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  goldValue: number;            // 折算金币价值（仅普通物资有意义）
  rarity: ItemRarity;           // 物品品质
}

/** 城池物资池 */
export interface ResourcePool {
  totalCapacity: number;
  remaining: number;
  lootTable: LootEntry[];
}

/** 掉落表条目 */
export interface LootEntry {
  itemType: ItemType;
  weight: number;               // 掉落权重
  goldValueRange: [number, number];  // 金币价值范围（仅Resource类型）
}
