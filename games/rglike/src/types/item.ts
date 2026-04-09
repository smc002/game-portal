import { HeroId } from './hero';

export type ItemId = string;

export type ItemCategory = 'attack' | 'defense' | 'support' | 'special' | 'control';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  category: ItemCategory;
  basePrice: number;
  priceVariance: number; // +/- this amount
  description: string;
  effectDescription: string;
  boundHeroId?: HeroId;
}
