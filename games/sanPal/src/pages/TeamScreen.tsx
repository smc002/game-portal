import { useGameStore } from '../store/gameStore';
import { getGeneralDef } from '../data/generals';
import { ITEMS } from '../data/items';
import { WEAPON_EMOJI, STAT_LABEL, STATUS_EMOJI } from '../data/types';
import type { StatKey } from '../data/types';
import { calcEffectiveStat, clampHP, calcMaxHP } from '../engine/helpers';

export default function TeamScreen() {
  const { party, setParty, inventory, removeItem, setPhase } = useGameStore();

  const healItems = inventory.items.filter((i) => {
    const item = ITEMS[i.itemId];
    return item?.category === 'heal' && i.count > 0;
  });

  function useHealItem(itemId: string, targetIdx: number) {
    const item = ITEMS[itemId]!;
    const eff = item.effect as Record<string, unknown>;
    removeItem(itemId);

    // Level up all
    if ('levelUp' in eff) {
      const lvUp = eff.levelUp as number;
      setParty(party.map((g) => {
        const newLevel = Math.min(15, g.level + lvUp);
        if (newLevel === g.level) return g;
        const def = getGeneralDef(g.defId);
        const newMaxHP = calcMaxHP(def, newLevel);
        const hpGain = newMaxHP - g.maxHP;
        return { ...g, level: newLevel, maxHP: newMaxHP, currentHP: g.currentHP + hpGain };
      }));
      return;
    }

    // Heal
    const healPct = (eff.healPercent as number) ?? 0;
    if (healPct <= 0) return;
    if (eff.target === 'all') {
      setParty(party.map((g) => ({
        ...g, currentHP: clampHP(g, g.currentHP + Math.floor(g.maxHP * healPct / 100)),
      })));
    } else {
      const g = party[targetIdx]!;
      const healed = { ...g, currentHP: clampHP(g, g.currentHP + Math.floor(g.maxHP * healPct / 100)) };
      const newParty = [...party];
      newParty[targetIdx] = healed;
      setParty(newParty);
    }
  }

  function moveUp(idx: number) {
    if (idx <= 0) return;
    const newParty = [...party];
    [newParty[idx - 1], newParty[idx]] = [newParty[idx]!, newParty[idx - 1]!];
    setParty(newParty);
  }

  function release(idx: number) {
    if (party.length <= 1) return;
    setParty(party.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-gold)' }}>
          队伍管理
        </h2>
        <button onClick={() => setPhase('map')} style={{ padding: '6px 16px' }}>返回</button>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: 12 }}>
        {party.map((g, idx) => {
          const def = getGeneralDef(g.defId);
          const hpPct = g.maxHP > 0 ? g.currentHP / g.maxHP : 0;
          return (
            <div key={idx} style={{
              background: 'var(--color-bg-card)', borderRadius: 8, padding: 12,
              border: '1px solid var(--color-border)', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span>{WEAPON_EMOJI[def.weapon]}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{def.name}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                  Lv.{g.level} · {'★'.repeat(def.star)}
                </span>
                {g.status && <span>{STATUS_EMOJI[g.status.type]}</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  {idx > 0 && <button onClick={() => moveUp(idx)} style={{ padding: '2px 8px', minHeight: 28, minWidth: 28, fontSize: 12 }}>↑</button>}
                  {party.length > 1 && <button onClick={() => release(idx)} style={{ padding: '2px 8px', minHeight: 28, minWidth: 28, fontSize: 12, color: 'var(--color-hp-low)' }}>释放</button>}
                </div>
              </div>
              {/* HP bar */}
              <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', marginBottom: 4 }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width 0.3s',
                  width: `${hpPct * 100}%`,
                  background: hpPct > 0.5 ? 'var(--color-hp)' : 'var(--color-hp-low)',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 8 }}>
                HP {g.currentHP}/{g.maxHP}
              </div>
              {/* Stats */}
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                {(['atk', 'int', 'def', 'res', 'spd'] as StatKey[]).map((stat) => (
                  <span key={stat}>
                    {STAT_LABEL[stat]} {calcEffectiveStat(def, g.level, stat, g.statStages[stat])}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Heal items */}
        {healItems.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>使用恢复道具</div>
            {healItems.map((inv) => {
              const item = ITEMS[inv.itemId]!;
              const eff = item.effect as Record<string, unknown>;
              const isAllTarget = eff.target === 'all' || 'levelUp' in eff;
              return (
                <div key={inv.itemId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: 'var(--color-bg-panel)', borderRadius: 6, marginBottom: 4,
                }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                    <span style={{ color: 'var(--color-text-dim)', fontSize: 12, marginLeft: 8 }}>×{inv.count}</span>
                    <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{item.description}</div>
                  </div>
                  {isAllTarget ? (
                    <button onClick={() => useHealItem(inv.itemId, 0)} style={{ padding: '4px 12px', fontSize: 12 }}>
                      {'levelUp' in eff ? '全队升级' : '全队使用'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {party.map((g, i) => (
                        <button
                          key={i}
                          disabled={g.currentHP >= g.maxHP}
                          onClick={() => useHealItem(inv.itemId, i)}
                          style={{ padding: '4px 8px', fontSize: 12, minHeight: 28, minWidth: 28 }}
                        >
                          {getGeneralDef(g.defId).name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
