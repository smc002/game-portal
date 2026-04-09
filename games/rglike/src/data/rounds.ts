export const RECRUIT_ROUNDS = [1, 2, 4, 7, 10];
export const BOSS_ROUNDS = [5, 10, 15, 20, 25, 30];
export const MAX_ROUNDS = 30;

export function isRecruitRound(round: number): boolean {
  return RECRUIT_ROUNDS.includes(round);
}

export function isBossRound(round: number): boolean {
  return BOSS_ROUNDS.includes(round);
}

export function isUpgradeRound(round: number): boolean {
  return !isRecruitRound(round);
}
