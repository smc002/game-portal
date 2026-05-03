// v0.1 实装的 3 名武将与其绑定竞拍人技能
// 详见 DESIGN.md §6.3

import type { General } from '../core/types.ts';

export const GENERALS: Record<string, General> = {
  zhugeliang: {
    id: 'zhugeliang',
    name: '诸葛亮',
    faction: 'shu',
    skill: {
      id: 'reveal-quality',
      name: '卧龙观气',
      trigger: 'after-bid',
      revealCount: 2,
      revealKind: 'quality',
    },
  },
  caocao: {
    id: 'caocao',
    name: '曹操',
    faction: 'wei',
    skill: {
      id: 'reveal-silhouette',
      name: '望气定品',
      trigger: 'after-bid',
      revealCount: 2,
      revealKind: 'silhouette',
    },
  },
  simayi: {
    id: 'simayi',
    name: '司马懿',
    faction: 'wei',
    skill: {
      id: 'reveal-all',
      name: '终极洞察',
      trigger: 'round-start',
      triggerRound: 4,
      revealCount: Infinity,
      revealKind: 'quality+silhouette',
    },
  },
};
