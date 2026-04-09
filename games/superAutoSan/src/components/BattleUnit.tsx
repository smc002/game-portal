import type { GeneralInstance } from '../data/types';
import { generals } from '../data/generals';
import { TIER_COLORS } from '../data/types';

interface Props {
  general: GeneralInstance;
  side: 'player' | 'enemy';
  animClass: string;
}

export function BattleUnit({ general, side, animClass }: Props) {
  const def = generals.find((g) => g.id === general.defId);
  const tierColor = def ? TIER_COLORS[def.tier] ?? '#888' : '#888';
  const totalAtk = general.atk + general.tempAtk;
  const totalHp = general.hp + general.tempHp;
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
