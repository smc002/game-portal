import { create } from 'zustand';
import { GamePhase, Difficulty, HeroInstance, GameStats, ItemId, HeroId } from '../types';
import { isRecruitRound, isBossRound } from '../data/rounds';
import { HERO_DEFINITIONS } from '../data/heroes';
import { ITEM_DEFINITIONS } from '../data/items';
import { pickRandom, randomInt } from '../utils/random';
import { SHOP_ITEM_COUNT } from '../utils/constants';
import { generateEnemyPreviews, EnemyPreview } from '../engine/enemyGenerator';

interface GameStore {
  phase: GamePhase;
  round: number;
  gold: number;
  heroes: HeroInstance[];
  ownedItemIds: ItemId[];
  selectedDifficulty: Difficulty | null;
  lastBattleGoldReward: number;
  stats: GameStats;
  isBossRound: boolean;

  // Transient UI state
  heroChoices: HeroId[];
  upgradeChoices: HeroId[];
  shopItems: Array<{ id: string; price: number }>;
  enemyPreviewEasy: EnemyPreview | null;
  enemyPreviewHard: EnemyPreview | null;

  // Actions
  startNewGame: () => void;
  setPhase: (phase: GamePhase) => void;
  selectHero: (heroId: HeroId) => void;
  upgradeHero: (heroId: HeroId) => void;
  selectDifficulty: (difficulty: Difficulty) => void;
  completeBattle: (won: boolean) => void;
  purchaseItem: (itemId: string) => void;
  leaveShop: () => void;
  advanceToNextRound: () => void;
  generateHeroChoices: () => void;
  generateUpgradeChoices: () => void;
  generateShopItems: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'start_menu',
  round: 1,
  gold: 0,
  heroes: [],
  ownedItemIds: [],
  selectedDifficulty: null,
  lastBattleGoldReward: 0,
  stats: { hardChoiceCount: 0, bossesDefeated: 0, totalGoldEarned: 0 },
  isBossRound: false,
  heroChoices: [],
  upgradeChoices: [],
  shopItems: [],
  enemyPreviewEasy: null,
  enemyPreviewHard: null,

  startNewGame: () => {
    set({
      phase: 'hero_select',
      round: 1,
      gold: 0,
      heroes: [],
      ownedItemIds: [],
      selectedDifficulty: null,
      lastBattleGoldReward: 0,
      stats: { hardChoiceCount: 0, bossesDefeated: 0, totalGoldEarned: 0 },
      isBossRound: false,
      heroChoices: [],
      upgradeChoices: [],
      shopItems: [],
    });
    get().generateHeroChoices();
  },

  setPhase: (phase) => set({ phase }),

  generateHeroChoices: () => {
    const ownedIds = get().heroes.map((h) => h.definitionId);
    const available = HERO_DEFINITIONS.filter((h) => !ownedIds.includes(h.id));
    const choices = pickRandom(available, 3).map((h) => h.id);
    set({ heroChoices: choices });
  },

  generateUpgradeChoices: () => {
    const heroes = get().heroes;
    if (heroes.length < 2) {
      set({ upgradeChoices: heroes.map((h) => h.definitionId) });
      return;
    }
    const choices = pickRandom(heroes, 2).map((h) => h.definitionId);
    set({ upgradeChoices: choices });
  },

  generateShopItems: () => {
    const { ownedItemIds, heroes } = get();
    const ownedHeroIds = heroes.map((h) => h.definitionId);
    const hasJinNang = ownedItemIds.includes('jinNangMiaoJi');

    const availableItems = ITEM_DEFINITIONS.filter((item) => {
      if (ownedItemIds.includes(item.id)) return false;
      if (item.boundHeroId && !ownedHeroIds.includes(item.boundHeroId)) return false;
      return true;
    });

    const count = hasJinNang ? SHOP_ITEM_COUNT + 1 : SHOP_ITEM_COUNT;
    const selected = pickRandom(availableItems, Math.min(count, availableItems.length));
    const discount = hasJinNang ? 0.1 : 0;

    const shopItems = selected.map((item) => ({
      id: item.id,
      price: Math.round(randomInt(item.basePrice - item.priceVariance, item.basePrice + item.priceVariance) * (1 - discount)),
    }));

    set({ shopItems });
  },

  selectHero: (heroId) => {
    const heroes = [...get().heroes, { definitionId: heroId, level: 1 }];
    const previews = generateEnemyPreviews(get().round);
    set({ heroes, phase: 'difficulty_choice', enemyPreviewEasy: previews.easy, enemyPreviewHard: previews.hard });
  },

  upgradeHero: (heroId) => {
    const heroes = get().heroes.map((h) =>
      h.definitionId === heroId ? { ...h, level: h.level + 1 } : h
    );
    const previews = generateEnemyPreviews(get().round);
    set({ heroes, phase: 'difficulty_choice', enemyPreviewEasy: previews.easy, enemyPreviewHard: previews.hard });
  },

  selectDifficulty: (difficulty) => {
    const stats = { ...get().stats };
    if (difficulty === 'hard') stats.hardChoiceCount++;
    set({
      selectedDifficulty: difficulty,
      stats,
      phase: 'battle',
      isBossRound: isBossRound(get().round),
    });
  },

  completeBattle: (won) => {
    if (!won) {
      set({ phase: 'game_over' });
      return;
    }

    const { selectedDifficulty, round, stats, enemyPreviewEasy, enemyPreviewHard } = get();
    const preview = selectedDifficulty === 'hard' ? enemyPreviewHard : enemyPreviewEasy;
    const goldReward = preview?.gold ?? 100;

    if (isBossRound(round)) {
      stats.bossesDefeated++;
    }

    stats.totalGoldEarned += goldReward;

    set({
      gold: get().gold + goldReward,
      lastBattleGoldReward: goldReward,
      stats,
      phase: 'settlement',
    });
  },

  purchaseItem: (itemId) => {
    const { gold, shopItems, ownedItemIds } = get();
    const shopItem = shopItems.find((i) => i.id === itemId);
    if (!shopItem || gold < shopItem.price) return;

    set({
      gold: gold - shopItem.price,
      ownedItemIds: [...ownedItemIds, itemId],
    });
  },

  leaveShop: () => {
    // After shop, advance to the next round
    const nextRound = get().round + 1;
    if (nextRound > 30) {
      set({ phase: 'victory' });
      return;
    }

    set({ round: nextRound, selectedDifficulty: null });

    if (isRecruitRound(nextRound)) {
      get().generateHeroChoices();
      set({ phase: 'hero_select' });
    } else {
      get().generateUpgradeChoices();
      set({ phase: 'upgrade' });
    }
  },

  advanceToNextRound: () => {
    const { round } = get();

    // After settlement, check if boss round -> shop
    if (isBossRound(round)) {
      get().generateShopItems();
      set({ phase: 'shop' });
      return;
    }

    const nextRound = round + 1;
    if (nextRound > 30) {
      set({ phase: 'victory' });
      return;
    }

    set({ round: nextRound, selectedDifficulty: null });

    if (isRecruitRound(nextRound)) {
      get().generateHeroChoices();
      set({ phase: 'hero_select' });
    } else {
      get().generateUpgradeChoices();
      set({ phase: 'upgrade' });
    }
  },
}));
