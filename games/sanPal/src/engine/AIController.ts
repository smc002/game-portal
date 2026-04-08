import type { GeneralInstance, SkillDef } from '../data/types';
import { getWeaponMultiplier } from '../data/types';
import { getGeneralDef } from '../data/generals';
import { getAvailableSkills } from './helpers';

export type AIAction =
  | { type: 'skill'; skill: SkillDef }
  | { type: 'switch'; targetIdx: number };

export function decideAIAction(
  activeEnemy: GeneralInstance,
  activePlayer: GeneralInstance,
  _enemyTeam: GeneralInstance[],
  _enemyActiveIdx: number,
): AIAction {
  const skills = getAvailableSkills(activeEnemy);
  if (skills.length === 0) {
    return { type: 'skill', skill: { id: 'struggle', name: '挣扎', type: 'martial', power: 40, accuracy: 100, energyCost: 0, priority: 0, description: '', effects: [] } };
  }

  const enemyDef = getGeneralDef(activeEnemy.defId);
  const playerDef = getGeneralDef(activePlayer.defId);

  // Weapon advantage is per-general, constant bonus
  const weaponBonus = getWeaponMultiplier(enemyDef.weapon, playerDef.weapon) > 1 ? 20 : 0;

  const scored = skills.map((skill) => {
    let score = skill.power + weaponBonus;

    // Prefer support skills when HP is low
    if (skill.type === 'support' && activeEnemy.currentHP < activeEnemy.maxHP * 0.4) {
      score += 50;
    }

    // Prefer charge skill when low on energy
    if (skill.id === 'xuli' && activeEnemy.energy <= 2) {
      score += 80;
    }

    // Small randomness
    score += Math.random() * 20;

    return { skill, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return { type: 'skill', skill: scored[0]!.skill };
}
