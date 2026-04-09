import type { WaveConfig } from './types';

export const waveConfigs: WaveConfig[] = [
  // Wave 1-2: Newbie
  {
    waveRange: [1, 2],
    petCount: [1, 3],
    tierRange: [1, 1],
    maxLevel: 1,
    levelChance: { lv2: 0, lv3: 0 },
    perkChance: 0,
    availablePerks: [],
  },
  // Wave 3-4: Transition
  {
    waveRange: [3, 4],
    petCount: [2, 4],
    tierRange: [1, 2],
    maxLevel: 1,
    levelChance: { lv2: 0, lv3: 0 },
    perkChance: 0,
    availablePerks: [],
  },
  // Wave 5-6: Early growth
  {
    waveRange: [5, 6],
    petCount: [3, 5],
    tierRange: [1, 2],
    maxLevel: 1,
    levelChance: { lv2: 0, lv3: 0 },
    perkChance: 0.1,
    availablePerks: ['jinnang'],
  },
  // Wave 7-8: Mid growth
  {
    waveRange: [7, 8],
    petCount: [4, 5],
    tierRange: [1, 3],
    maxLevel: 2,
    levelChance: { lv2: 0.2, lv3: 0 },
    perkChance: 0.2,
    availablePerks: ['jinnang', 'tiegu'],
  },
  // Wave 9-10: Mid game
  {
    waveRange: [9, 10],
    petCount: [5, 5],
    tierRange: [1, 4],
    maxLevel: 2,
    levelChance: { lv2: 0.3, lv3: 0 },
    perkChance: 0.3,
    availablePerks: ['jinnang', 'tiegu', 'tiejia'],
  },
  // Wave 11-13: Late early
  {
    waveRange: [11, 13],
    petCount: [5, 5],
    tierRange: [1, 5],
    maxLevel: 2,
    levelChance: { lv2: 0.4, lv3: 0.05 },
    perkChance: 0.4,
    availablePerks: ['jinnang', 'tiegu', 'tiejia', 'lieyan'],
  },
  // Wave 14-15: Late mid
  {
    waveRange: [14, 15],
    petCount: [5, 5],
    tierRange: [1, 6],
    maxLevel: 3,
    levelChance: { lv2: 0.4, lv3: 0.1 },
    perkChance: 0.5,
    availablePerks: ['jinnang', 'tiegu', 'tiejia', 'lieyan', 'tiebi'],
  },
  // Wave 16-20: Endless early
  {
    waveRange: [16, 20],
    petCount: [5, 5],
    tierRange: [1, 6],
    maxLevel: 3,
    levelChance: { lv2: 0.5, lv3: 0.2 },
    perkChance: 0.6,
    availablePerks: ['jinnang', 'tiegu', 'tiejia', 'lieyan', 'tiebi', 'huanhundan', 'qinglongyanyuedao'],
  },
  // Wave 21-30: Endless mid
  {
    waveRange: [21, 30],
    petCount: [5, 5],
    tierRange: [3, 6],
    maxLevel: 3,
    levelChance: { lv2: 0.4, lv3: 0.4 },
    perkChance: 0.8,
    availablePerks: ['tiejia', 'lieyan', 'tiebi', 'huanhundan', 'qinglongyanyuedao'],
  },
  // Wave 31+: Extreme
  {
    waveRange: [31, Infinity],
    petCount: [5, 5],
    tierRange: [4, 6],
    maxLevel: 3,
    levelChance: { lv2: 0.3, lv3: 0.6 },
    perkChance: 1.0,
    availablePerks: ['tiebi', 'huanhundan', 'qinglongyanyuedao', 'lieyan'],
  },
];
