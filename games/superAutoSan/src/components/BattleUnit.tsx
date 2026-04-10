import { useEffect, useRef, useState } from 'react';
import type { GeneralInstance } from '../data/types';
import { generals } from '../data/generals';
import { TIER_COLORS } from '../data/types';

interface Props {
  general: GeneralInstance;
  side: 'player' | 'enemy';
  animClass: string;
}

let bFloatKey = 0;

export function BattleUnit({ general, side, animClass }: Props) {
  const def = generals.find((g) => g.id === general.defId);
  const tierColor = def ? TIER_COLORS[def.tier] ?? '#888' : '#888';
  const totalAtk = general.atk + general.tempAtk;
  const totalHp = general.hp + general.tempHp;

  // Stat change floating text
  const prevRef = useRef<{ atk: number; hp: number } | null>(null);
  const [floatAtk, setFloatAtk] = useState<{ delta: number; key: number } | null>(null);
  const [floatHp, setFloatHp] = useState<{ delta: number; key: number } | null>(null);

  useEffect(() => {
    if (general.hp <= 0) return;
    const prev = prevRef.current;
    if (prev) {
      const atkDelta = totalAtk - prev.atk;
      const hpDelta = totalHp - prev.hp;
      if (atkDelta > 0) {
        setFloatAtk({ delta: atkDelta, key: ++bFloatKey });
        setTimeout(() => setFloatAtk(null), 850);
      }
      if (hpDelta > 0) {
        setFloatHp({ delta: hpDelta, key: ++bFloatKey });
        setTimeout(() => setFloatHp(null), 850);
      }
    }
    prevRef.current = { atk: totalAtk, hp: totalHp };
  }, [totalAtk, totalHp, general.hp]);

  // Hide dead units unless they're currently playing the faint animation
  if (general.hp <= 0 && animClass !== 'anim-faint') {
    return <div style={{ width: 64, height: 80 }} />;
  }

  return (
    <div
      className={animClass}
      style={{
        width: 64,
        height: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 4,
        background: 'var(--bg-card)',
        border: `2px solid ${tierColor}`,
        borderRadius: 'var(--border-radius)',
        position: 'relative',
      }}
    >
      {/* Level */}
      <div style={{ fontSize: 8, color: 'var(--text-gold)' }}>
        {'★'.repeat(general.level)}
      </div>

      {/* Color block */}
      <div style={{
        width: 32,
        height: 32,
        background: tierColor,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        color: '#fff',
        fontWeight: 'bold',
        transform: side === 'enemy' ? 'scaleX(-1)' : undefined,
      }}>
        {def?.name[0] ?? '?'}
      </div>

      {/* Name */}
      <div style={{ fontSize: 8, textAlign: 'center' }}>
        {def?.name ?? general.defId}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
        <span className="atk">{totalAtk}</span>
        <span className="hp">{Math.max(0, totalHp)}</span>
      </div>

      {/* Stat float-up (positioned relative to card, spread wide) */}
      {floatAtk && (
        <span key={`ba${floatAtk.key}`} className="stat-float" style={{ color: 'var(--atk-color)', left: -10, bottom: 18 }}>
          +{floatAtk.delta}
        </span>
      )}
      {floatHp && (
        <span key={`bh${floatHp.key}`} className="stat-float" style={{ color: 'var(--hp-color)', right: -10, bottom: 18 }}>
          +{floatHp.delta}
        </span>
      )}

      {/* Perk */}
      {general.perk && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 1,
          fontSize: 7,
          background: '#8b4513',
          color: '#fff',
          padding: '0 2px',
          borderRadius: 2,
        }}>
          锦
        </div>
      )}
    </div>
  );
}
