// 领域类型 — 详细语义见 DESIGN.md §3 / §6

export type Rarity = 'white' | 'green' | 'blue' | 'purple' | 'gold' | 'red';

export type Category =
  | 'weapon'      // 兵器
  | 'book'        // 典籍
  | 'treasure'    // 异宝
  | 'horse'       // 战马
  | 'ritual'      // 礼器
  | 'stationery'; // 文房

export interface Shape {
  w: number; // 宽（列数）
  h: number; // 高（行数）
}

export interface Position {
  col: number; // 1-based 起始列
  row: number; // 1-based 起始行
}

export interface Item {
  id: string;
  name: string;
  icon: string;       // 单字图标，如 '剑' '玺'
  cat: Category;
  rarity: Rarity;
  value: number;      // 真实价值（筹码）
  shape: Shape;
  pos: Position;
}

export interface Warehouse {
  cols: number;
  rows: number;
  items: Item[];
  totalValue: number; // = sum(items.value)
}

// ===== 玩家与武将 =====

export type Personality = 'conservative' | 'aggressive' | 'bluffer';
export type Faction = 'wei' | 'shu' | 'wu' | 'qun';

export type SkillTrigger = 'after-bid' | 'round-start';
export type RevealKind = 'quality' | 'silhouette' | 'quality+silhouette';

export interface BidderSkill {
  id: string;
  name: string;
  trigger: SkillTrigger;
  triggerRound?: number; // 仅 trigger='round-start' 时使用
  revealCount: number;   // Infinity 表示揭全部
  revealKind: RevealKind;
}

export interface General {
  id: string;
  name: string;
  faction: Faction;
  skill: BidderSkill;
}

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  general: General;
  personality?: Personality; // AI 才有
  chips: number;
}

// ===== 拍卖状态 =====

export type Bid =
  | { kind: 'bid'; amount: number }
  | { kind: 'pass' };

export interface Stake {
  amount: number;
  basisBid: number; // 押的是仓库总值落在 [basisBid * 0.9, basisBid * 1.1]
}

export interface RoundState {
  round: number;                    // 1..5
  bids: Map<string, Bid>;            // playerId -> bid
  stakes: Map<string, Stake | null>; // playerId -> 本轮押注（可空）
}

export interface RevealedSet {
  quality: Set<string>;     // 已知品质的 itemId
  silhouette: Set<string>;  // 已知轮廓的 itemId
}

/** 每轮的"公共信息"——所有玩家可见
 *  设计取舍：避免泄露过多确定性信息（如全档分布或红色数量），
 *  把 4 类信息控制在"局部 / 模糊"程度：
 *   - reveal-item   完全揭露 1 件随机藏品
 *   - rarity-avg    单档稀有度（不含红）的数量 + 平均价值
 *   - rarity-count  单档稀有度（不含红）的数量
 *   - total-area    所有藏品总占地（最弱信息）
 */
export type PublicInfoKind =
  | 'reveal-item'
  | 'rarity-avg'
  | 'rarity-count'
  | 'total-area';

export interface PublicInfo {
  round: number;
  kind: PublicInfoKind;
  text: string;       // 渲染用
  itemId?: string;    // 仅 'reveal-item' 时有（用于公共揭示集 + 去重）
  rarity?: Rarity;    // 仅 'rarity-avg' / 'rarity-count' 时有（用于去重）
}

export interface AuctionState {
  warehouse: Warehouse;
  players: Player[];
  rounds: RoundState[];
  // 信息隔离：每个玩家自己看到的揭示集（playerId -> 已揭示集）
  reveals: Map<string, RevealedSet>;
  // 公共揭示：被公共信息揭露过完整信息的 itemId（所有玩家可见）
  publicReveals: Set<string>;
  // 公共信息历史（按轮次）
  publicInfo: PublicInfo[];
  // 本仓入场费（大盲注），AI 押注以此 × 5 计算
  entryFee: number;
  closed?: {
    winnerId: string | null; // null = 流拍
    price: number;
    closingRound: number;
  };
}
