import { useGameStore } from '../store/gameStore';
import { GENERALS, STARTER_IDS } from '../data/generals';
import { WEAPON_EMOJI, WEAPON_LABEL, FACTION_LABEL } from '../data/types';
import { createInstance } from '../engine/helpers';
import { generateMap } from '../engine/MapGenerator';
import { useState } from 'react';

export default function StarterSelect() {
  const { setParty, setPhase, setMap, setCurrentNode } = useGameStore();
  const [selected, setSelected] = useState<string | null>(null);

  const starters = STARTER_IDS.map((id) => GENERALS[id]!);

  function confirm() {
    if (!selected) return;
    const inst = createInstance(selected, 3);
    setParty([inst]);
    const map = generateMap(1);
    setMap(map);
    setCurrentNode('start');
    setPhase('map');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--color-gold)',
        textAlign: 'center', margin: '24px 0 8px',
      }}>
        选择初始武将
      </h2>
      <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', fontSize: 13, marginBottom: 24 }}>
        选择一位武将开始你的三国征途
      </p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        {starters.map((g) => (
          <div
            key={g.id}
            onClick={() => setSelected(g.id)}
            style={{
              border: `2px solid ${selected === g.id ? 'var(--color-gold)' : 'var(--color-border)'}`,
              borderRadius: 8, padding: 16,
              background: selected === g.id ? 'var(--color-bg-card)' : 'var(--color-bg-panel)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{WEAPON_EMOJI[g.weapon]}</span>
              <span style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: 'var(--color-text-bright)' }}>
                {g.name}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
                {'★'.repeat(g.star)} · {WEAPON_LABEL[g.weapon]} · {FACTION_LABEL[g.faction]}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
              <span>HP {g.baseStats.hp}</span>
              <span>武力 {g.baseStats.atk}</span>
              <span>智力 {g.baseStats.int}</span>
              <span>防御 {g.baseStats.def}</span>
              <span>谋略 {g.baseStats.res}</span>
              <span>速度 {g.baseStats.spd}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-gold)', marginTop: 8 }}>
              被动·{g.passive.name}：{g.passive.description}
            </div>
          </div>
        ))}
      </div>

      <button
        className="primary"
        disabled={!selected}
        onClick={confirm}
        style={{ marginTop: 16, fontSize: 16, padding: '14px 0' }}
      >
        出发！
      </button>
    </div>
  );
}
