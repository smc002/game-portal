/**
 * Synergy system — checks party composition and applies bonuses.
 */
import type { GeneralInstance, BattleAction, SkillDef } from '../data/types';
import { SYNERGIES } from '../data/synergies';



// ===== Check which passive synergies are active for a party =====

export interface ActiveSynergy {
  id: string;
  name: string;
  description: string;
}

export function getActiveSynergies(party: GeneralInstance[]): ActiveSynergy[] {
  const ids = new Set(party.map((g) => g.defId));
  const active: ActiveSynergy[] = [];

  for (const syn of SYNERGIES) {
    if (syn.type !== 'passive') continue;

    if (syn.minCount) {
      // Count how many required generals are present
      const count = syn.requiredGenerals.filter((id) => ids.has(id)).length;
      if (count >= syn.minCount) {
        active.push({ id: syn.id, name: syn.name, description: syn.description });
      }
    } else {
      // All required must be present
      if (syn.requiredGenerals.every((id) => ids.has(id))) {
        active.push({ id: syn.id, name: syn.name, description: syn.description });
      }
    }
  }

  return active;
}

// ===== Apply passive synergy bonuses at battle start =====

export function applySynergyBonuses(
  party: GeneralInstance[],
): { updatedParty: GeneralInstance[]; actions: BattleAction[] } {
  const synergies = getActiveSynergies(party);
  const actions: BattleAction[] = [];
  let updated = [...party];

  for (const syn of synergies) {
    actions.push({ type: 'synergy', message: `连携发动！【${syn.name}】${syn.description}` });

    switch (syn.id) {
      case 'taoyuan': {
        // 桃园结义: liu_bei+guan_yu+zhang_fei → ATK+15%, HP+10%
        const targetIds = new Set(['liu_bei', 'guan_yu', 'zhang_fei']);
        updated = updated.map((g) => {
          if (!targetIds.has(g.defId)) return g;
          const bonusHP = Math.floor(g.maxHP * 0.1);
          return {
            ...g,
            maxHP: g.maxHP + bonusHP,
            currentHP: g.currentHP + bonusHP,
            statStages: { ...g.statStages, atk: Math.min(3, g.statStages.atk + 1) },
          };
        });
        break;
      }
      case 'wolong_fengchu': {
        // 卧龙凤雏: zhuge_liang+pang_tong → INT+20% (via +1 stage)
        const targetIds = new Set(['zhuge_liang', 'pang_tong']);
        updated = updated.map((g) => {
          if (!targetIds.has(g.defId)) return g;
          // Boost INT via stage and give +2 starting energy
          return {
            ...g,
            statStages: { ...g.statStages, int: Math.min(3, g.statStages.int + 1) },
            energy: Math.min(10, g.energy + 2),
          };
        });
        break;
      }
      case 'wuhu': {
        // 五虎将 any 3: SPD+15% (via +1 stage)
        const targetIds = new Set(['guan_yu', 'zhang_fei', 'zhao_yun', 'ma_chao', 'huang_zhong']);
        updated = updated.map((g) => {
          if (!targetIds.has(g.defId)) return g;
          return {
            ...g,
            statStages: { ...g.statStages, spd: Math.min(3, g.statStages.spd + 1) },
          };
        });
        break;
      }
      case 'hubaoqi': {
        // 虎豹骑: cao_cao + 2 wei warriors → all DEF+10% (via +1 stage)
        updated = updated.map((g) => ({
          ...g,
          statStages: { ...g.statStages, def: Math.min(3, g.statStages.def + 1) },
        }));
        break;
      }
      case 'jiangdong': {
        // 江东双璧: zhou_yu+sun_ce → crit +15% (tracked via special tag, but we use stage for simplicity)
        // Crit bonus is handled separately in getPassiveCritBonus; this just logs
        break;
      }
    }
  }

  return { updatedParty: updated, actions };
}

// ===== Check trigger synergies after a skill is used =====

export function checkTriggerSynergy(
  actor: GeneralInstance,
  skill: SkillDef,
  party: GeneralInstance[],
  _enemyActive: GeneralInstance,
): { actions: BattleAction[]; bonusDamage: number; bonusHealAll: number; bonusBurn: boolean } {
  const ids = new Set(party.map((g) => g.defId));
  const actions: BattleAction[] = [];
  let bonusDamage = 0;
  let bonusHealAll = 0;
  let bonusBurn = false;

  for (const syn of SYNERGIES) {
    if (syn.type !== 'trigger') continue;
    // Check if all required generals are in party
    if (!syn.requiredGenerals.every((id) => ids.has(id))) continue;

    switch (syn.id) {
      case 'guan_zhang': {
        // 关羽 martial → 30% 张飞 follow-up (50% power)
        if (actor.defId === 'guan_yu' && skill.type === 'martial' && Math.random() < 0.3) {
          const zhangFei = party.find((g) => g.defId === 'zhang_fei' && g.currentHP > 0);
          if (zhangFei) {
            const dmg = Math.floor(skill.power * 0.5 * 0.8); // rough follow-up damage
            bonusDamage += dmg;
            actions.push({ type: 'synergy', actorSide: 'player', message: `【兄弟同心】张飞追击！造成${dmg}点伤害！`, damage: dmg });
          }
        }
        break;
      }
      case 'zhuge_zhao': {
        // 诸葛亮 strategy → 25% 赵云 follow-up
        if (actor.defId === 'zhuge_liang' && skill.type === 'strategy' && Math.random() < 0.25) {
          const zhaoYun = party.find((g) => g.defId === 'zhao_yun' && g.currentHP > 0);
          if (zhaoYun) {
            const dmg = Math.floor(75 * 0.6); // rough龙胆枪 follow-up
            bonusDamage += dmg;
            actions.push({ type: 'synergy', actorSide: 'player', message: `【龙胆智辅】赵云先制追击！造成${dmg}点伤害！`, damage: dmg });
          }
        }
        break;
      }
      case 'zhou_huang': {
        // 周瑜 fire skill → 40% 黄盖 burn
        if (actor.defId === 'zhou_yu' && skill.type === 'strategy' && Math.random() < 0.4) {
          const huangGai = party.find((g) => g.defId === 'huang_gai' && g.currentHP > 0);
          if (huangGai) {
            bonusBurn = true;
            actions.push({ type: 'synergy', actorSide: 'player', message: `【苦肉连环】黄盖对敌施加灼烧！` });
          }
        }
        break;
      }
      case 'cao_dian': {
        // cao_cao hit → 35% dian_wei absorbs 50% — handled as damage reduction
        // This is defensive; we skip it in attack triggers (handled elsewhere)
        break;
      }
      case 'liu_zhuge': {
        // 刘备 support → 30% 诸葛亮 heal all 10%
        if (actor.defId === 'liu_bei' && skill.type === 'support' && Math.random() < 0.3) {
          const zgl = party.find((g) => g.defId === 'zhuge_liang' && g.currentHP > 0);
          if (zgl) {
            bonusHealAll = 10; // 10% max HP
            actions.push({ type: 'synergy', actorSide: 'player', message: `【鱼水之情】诸葛亮为全队恢复10%HP！` });
          }
        }
        break;
      }
    }
  }

  return { actions, bonusDamage, bonusHealAll, bonusBurn };
}

// ===== Check jiangdong crit synergy =====

export function getSynergyCritBonus(party: GeneralInstance[]): number {
  const synergies = getActiveSynergies(party);
  if (synergies.some((s) => s.id === 'jiangdong')) return 0.15;
  return 0;
}
