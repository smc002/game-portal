// 藏品资料库（item prototype pool）
// M1 仓库生成器从此处按稀有度抽样
// 当前为初始 60 件原型；后续可扩展到 200+ 让 MTT 全程不重复

import type { Category, Rarity } from '../core/types.ts';

export interface ItemPrototype {
  name: string;
  icon: string;          // 单字符图标
  cat: Category;
  rarity: Rarity;
  baseValue: number;     // 期望价值（生成时会加噪声）
  // 推荐形状候选；实际生成可挑其一
  preferredShapes: ReadonlyArray<readonly [number, number]>;
}

export const ITEM_POOL: ItemPrototype[] = [
  // ===== 神话 红 =====
  { name: '传国玉玺', icon: '玺', cat: 'ritual', rarity: 'red', baseValue: 1100, preferredShapes: [[4, 4]] },

  // ===== 传说 金 =====
  { name: '七星宝刀', icon: '刀', cat: 'weapon', rarity: 'gold', baseValue: 880, preferredShapes: [[1, 6], [6, 1]] },
  { name: '战马·赤兔', icon: '马', cat: 'horse',  rarity: 'gold', baseValue: 950, preferredShapes: [[2, 2], [2, 3]] },
  { name: '青龙偃月刀', icon: '青', cat: 'weapon', rarity: 'gold', baseValue: 800, preferredShapes: [[1, 4], [4, 1]] },

  // ===== 史诗 紫 =====
  { name: '孟德新书', icon: '书', cat: 'book',    rarity: 'purple', baseValue: 480, preferredShapes: [[3, 3], [2, 3]] },
  { name: '青釭剑',   icon: '剑', cat: 'weapon',  rarity: 'purple', baseValue: 510, preferredShapes: [[2, 3], [1, 4]] },
  { name: '古琴',     icon: '琴', cat: 'ritual',  rarity: 'purple', baseValue: 420, preferredShapes: [[2, 2], [3, 2]] },
  { name: '虎符',     icon: '虎', cat: 'ritual',  rarity: 'purple', baseValue: 460, preferredShapes: [[2, 2]] },
  { name: '丈八蛇矛', icon: '矛', cat: 'weapon',  rarity: 'purple', baseValue: 440, preferredShapes: [[1, 6], [6, 1]] },
  { name: '玄武印',   icon: '印', cat: 'ritual',  rarity: 'purple', baseValue: 400, preferredShapes: [[2, 2]] },

  // ===== 稀有 蓝 =====
  { name: '玛瑙杯',   icon: '杯', cat: 'treasure',  rarity: 'blue', baseValue: 280, preferredShapes: [[2, 2]] },
  { name: '九节杖',   icon: '杖', cat: 'weapon',    rarity: 'blue', baseValue: 320, preferredShapes: [[2, 2], [1, 4]] },
  { name: '马铠',     icon: '铠', cat: 'horse',     rarity: 'blue', baseValue: 290, preferredShapes: [[2, 2], [2, 3]] },
  { name: '霓裳裙',   icon: '裙', cat: 'treasure',  rarity: 'blue', baseValue: 260, preferredShapes: [[2, 2], [3, 2]] },
  { name: '玉如意',   icon: '如', cat: 'treasure',  rarity: 'blue', baseValue: 220, preferredShapes: [[2, 1], [3, 1]] },
  { name: '丹书',     icon: '丹', cat: 'book',      rarity: 'blue', baseValue: 200, preferredShapes: [[2, 1], [2, 2]] },
  { name: '兽首',     icon: '兽', cat: 'treasure',  rarity: 'blue', baseValue: 240, preferredShapes: [[2, 2]] },

  // ===== 优良 绿 =====
  { name: '蜀锦',     icon: '锦', cat: 'treasure',  rarity: 'green', baseValue: 165, preferredShapes: [[3, 2], [2, 2]] },
  { name: '云霞袍',   icon: '袍', cat: 'treasure',  rarity: 'green', baseValue: 175, preferredShapes: [[3, 2], [2, 3]] },
  { name: '兵符',     icon: '符', cat: 'ritual',    rarity: 'green', baseValue: 145, preferredShapes: [[3, 1], [2, 1]] },
  { name: '兵法',     icon: '简', cat: 'book',      rarity: 'green', baseValue: 130, preferredShapes: [[2, 2]] },
  { name: '弩机',     icon: '弩', cat: 'weapon',    rarity: 'green', baseValue: 150, preferredShapes: [[2, 1], [1, 2]] },
  { name: '简策',     icon: '策', cat: 'book',      rarity: 'green', baseValue: 120, preferredShapes: [[2, 1]] },
  { name: '战鼓',     icon: '鼓', cat: 'ritual',    rarity: 'green', baseValue: 140, preferredShapes: [[2, 2]] },
  { name: '玉璧',     icon: '璧', cat: 'treasure',  rarity: 'green', baseValue: 110, preferredShapes: [[1, 1], [2, 1]] },

  // ===== 普通 白 =====
  { name: '玉佩',     icon: '玉', cat: 'treasure',  rarity: 'white', baseValue: 90, preferredShapes: [[2, 1], [1, 1]] },
  { name: '砚台',     icon: '砚', cat: 'stationery', rarity: 'white', baseValue: 80, preferredShapes: [[1, 2], [1, 1]] },
  { name: '徽墨',     icon: '墨', cat: 'stationery', rarity: 'white', baseValue: 65, preferredShapes: [[1, 2], [1, 1]] },
  { name: '马鞭',     icon: '鞭', cat: 'horse',     rarity: 'white', baseValue: 60, preferredShapes: [[1, 2], [1, 1]] },
  { name: '马鞍',     icon: '鞍', cat: 'horse',     rarity: 'white', baseValue: 85, preferredShapes: [[2, 1]] },
  { name: '香炉',     icon: '炉', cat: 'ritual',    rarity: 'white', baseValue: 75, preferredShapes: [[1, 1], [1, 2]] },
  { name: '玉璋',     icon: '璋', cat: 'ritual',    rarity: 'white', baseValue: 95, preferredShapes: [[2, 1]] },
  { name: '残简',     icon: '残', cat: 'book',      rarity: 'white', baseValue: 30, preferredShapes: [[1, 1]] },
  { name: '银钱',     icon: '钱', cat: 'treasure',  rarity: 'white', baseValue: 45, preferredShapes: [[1, 1]] },
  { name: '铜镜',     icon: '镜', cat: 'treasure',  rarity: 'white', baseValue: 50, preferredShapes: [[1, 1]] },
  { name: '石章',     icon: '章', cat: 'stationery', rarity: 'white', baseValue: 35, preferredShapes: [[1, 1]] },
  { name: '令牌',     icon: '令', cat: 'ritual',    rarity: 'white', baseValue: 40, preferredShapes: [[1, 1]] },
  { name: '匕首',     icon: '匕', cat: 'weapon',    rarity: 'white', baseValue: 100, preferredShapes: [[1, 1], [1, 2]] },
  { name: '酒爵',     icon: '酒', cat: 'ritual',    rarity: 'white', baseValue: 70, preferredShapes: [[2, 1]] },
  { name: '羊毫',     icon: '笔', cat: 'stationery', rarity: 'white', baseValue: 55, preferredShapes: [[1, 1], [1, 2]] },
  { name: '玉饰',     icon: '饰', cat: 'treasure',  rarity: 'white', baseValue: 60, preferredShapes: [[1, 1]] },
  { name: '青铜爵',   icon: '爵', cat: 'ritual',    rarity: 'white', baseValue: 90, preferredShapes: [[2, 1], [1, 2]] },
  { name: '木简',     icon: '木', cat: 'book',      rarity: 'white', baseValue: 35, preferredShapes: [[1, 1]] },
  { name: '陶罐',     icon: '陶', cat: 'treasure',  rarity: 'white', baseValue: 40, preferredShapes: [[1, 1]] },
  { name: '草鞋',     icon: '鞋', cat: 'horse',     rarity: 'white', baseValue: 30, preferredShapes: [[1, 1]] },
];
