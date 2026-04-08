import type { StarLevel } from '../data/types';

const STAR_MODIFIER: Record<StarLevel, number> = {
  1: 1.0,
  2: 0.8,
  3: 0.6,
  4: 0.4,
  5: 0, // Boss, uncatchable
};

export function calcCaptureRate(
  baseCaptureRate: number, // from item (40/65/100)
  star: StarLevel,
): number {
  if (star === 5) return 0;
  const rate = baseCaptureRate * STAR_MODIFIER[star];
  return Math.min(100, Math.max(0, rate));
}

export function attemptCapture(
  baseCaptureRate: number,
  star: StarLevel,
): boolean {
  const rate = calcCaptureRate(baseCaptureRate, star);
  return Math.random() * 100 < rate;
}
