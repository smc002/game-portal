import { HeroInstance } from './hero';
import { ItemId } from './item';

export type GamePhase =
  | 'start_menu'
  | 'hero_select'
  | 'upgrade'
  | 'difficulty_choice'
  | 'battle'
  | 'settlement'
  | 'shop'
  | 'game_over'
  | 'victory';

export type Difficulty = 'easy' | 'hard';

export interface GameStats {
  hardChoiceCount: number;
  bossesDefeated: number;
  totalGoldEarned: number;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  gold: number;
  heroes: HeroInstance[];
  ownedItemIds: ItemId[];
  selectedDifficulty: Difficulty | null;
  lastBattleGoldReward: number;
  stats: GameStats;
  isBossRound: boolean;
}
