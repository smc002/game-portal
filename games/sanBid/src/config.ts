// 全局可调参数 — 镜像 DESIGN.md §9 的 CONFIG 表
// 任何数值/规则改动都应先改这里，再在依赖此 CONFIG 的模块中验证

export const CONFIG = {
  // ===== 仓库（§3.2）=====
  warehouse: {
    gridCols: 10,
    gridRows: 20,
    itemCountRange: [30, 60] as const,
    packingDirection: 'top' as const,
    targetLoadRatio: [0.3, 0.6] as const,
    shapes: [
      [1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [2, 2],
      [2, 3], [3, 2], [3, 3], [2, 4], [4, 2], [4, 4],
      [1, 6], [6, 1],
    ] as const,
    rarities: {
      white:  { name: '普通', color: '#e0d8c8', valueRange: [30, 100],   countRange: [12, 18] },
      green:  { name: '优良', color: '#5cb85c', valueRange: [80, 180],   countRange: [6, 10]  },
      blue:   { name: '稀有', color: '#4a8eb8', valueRange: [180, 350],  countRange: [4, 7]   },
      purple: { name: '史诗', color: '#a855c7', valueRange: [350, 550],  countRange: [2, 4]   },
      gold:   { name: '传说', color: '#f4c97a', valueRange: [550, 900],  countRange: [1, 3]   },
      red:    { name: '神话', color: '#e85050', valueRange: [900, 1200], countRange: [0, 1]   },
    } as const,
    categories: ['weapon', 'book', 'treasure', 'horse', 'ritual', 'stationery'] as const,
  },

  // ===== 拍卖流程（§3.3 / §3.4）=====
  auction: {
    warehousesPerSession: 1,
    maxRounds: 5,
    thresholdMultipliers: [2.0, 1.6, 1.3, 1.1, 1.0] as const,
    sellbackRate: 1.0,
    finalRoundTieRule: 'random' as 'random' | 'overtime' | 'voided',
    allPassRule: 'voided' as 'voided' | 'forceNextRound',
    entryFeeSink: true,
  },

  // ===== 押注（§4）=====
  betting: {
    valueBandPercent: 0.10,
    payoutMultipliers: [4.0, 3.5, 3.0, 2.5, 2.0] as const,
    maxStakeRatio: 0.5,
    refundOnNonClosingRound: true,
  },

  // ===== MTT（§5）=====
  tournament: {
    tableSize: 4,
    initialChips: 1000,
    blindLevels: [100, 150, 250, 400, 600, 900, 1300, 1700, 2000] as const,
    blindLevelDurationSec: 900,
    rebuyThresholdRatio: 0.2,
    addonMaxCount: Infinity,
    rebuyDisabledAtFinalLevel: true,
    payouts: [0.5, 0.25, 0.15, 0.1] as const,
  },

  // ===== AI 性格（§6.1）=====
  ai: {
    personalities: ['conservative', 'aggressive', 'bluffer'] as const,
  },
} as const;

export type Config = typeof CONFIG;
