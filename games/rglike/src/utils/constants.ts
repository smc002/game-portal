export const ACTION_BAR_MAX = 1000;
export const TICK_INCREMENT = 10;

// Gold rewards
export const GOLD_EASY_MIN = 90;
export const GOLD_EASY_MAX = 110;
export const GOLD_HARD_MIN = 130;
export const GOLD_HARD_MAX = 170;
export const GOLD_BOSS_EASY_BONUS = 50;
export const GOLD_BOSS_HARD_BONUS = 80;

// Enemy scaling
export const ENEMY_SCALE_PER_ROUND = 0.08;
export const HARD_STAT_MULTIPLIER = 1.15;
export const BOSS_STAT_MULTIPLIER = 1.5;

// Easy mode: 2-3 enemies, Hard mode: 3-5 enemies
export const EASY_ENEMY_MIN = 2;
export const EASY_ENEMY_MAX = 3;
export const HARD_ENEMY_MIN = 3;
export const HARD_ENEMY_MAX = 5;

// Shop
export const SHOP_ITEM_COUNT = 3;
export const SHOP_ITEM_DISCOUNT_WITH_JINNANG = 0.1;

// Battle speed (ms per tick)
export const BATTLE_TICK_MS: Record<number, number> = {
  1: 500,
  2: 250,
  4: 125,
};
