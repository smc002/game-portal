import { useGameStore } from '../store/gameStore';
import { getGeneralDef } from '../data/generals';
import { clampHP, calcMaxHP } from '../engine/helpers';

export default function RestScreen() {
  const { party, setParty, setPhase } = useGameStore();

  function healAll() {
    const healed = party.map((g) => ({
      ...g,
      currentHP: clampHP(g, g.currentHP + Math.floor(g.maxHP * 0.5)),
    }));
    setParty(healed);
    setPhase('map');
  }

  function levelUp() {
    if (party.length === 0) { setPhase('map'); return; }
    const upgraded = party.map((g, i) => {
      if (i === 0) {
        const newLevel = Math.min(15, g.level + 1);
        if (newLevel === g.level) return g;
        const def = getGeneralDef(g.defId);
        const newMaxHP = calcMaxHP(def, newLevel);
        const hpGain = newMaxHP - g.maxHP;
        return { ...g, level: newLevel, maxHP: newMaxHP, currentHP: g.currentHP + hpGain };
      }
      return g;
    });
    setParty(upgraded);
    setPhase('map');
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 24, gap: 24,
    }}>
      <div style={{ fontSize: 48 }}>🏕️</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--color-gold)' }}>
        营寨休憩
      </h2>
      <p style={{ color: 'var(--color-text-dim)', fontSize: 13, textAlign: 'center' }}>
        选择一项休憩方式
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        <button onClick={healAll} style={{ padding: '16px', textAlign: 'left' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>休养生息</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>全队恢复 50% HP</div>
        </button>
        <button onClick={levelUp} style={{ padding: '16px', textAlign: 'left' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>刻苦修练</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
            先锋武将 ({party[0] ? getGeneralDef(party[0].defId).name : '无'}) 提升 1 级
          </div>
        </button>
      </div>
    </div>
  );
}
