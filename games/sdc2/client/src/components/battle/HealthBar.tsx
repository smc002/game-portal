import '../../styles/battle.css';

interface Props {
  currentHp: number;
  maxHp: number;
  shield: number;
  side: 'A' | 'B';
  label: string;
  shaking?: boolean;
}

export default function HealthBar({ currentHp, maxHp, shield, side, label, shaking }: Props) {
  const hpPercent = Math.max(0, (currentHp / maxHp) * 100);
  const shieldPercent = Math.min((shield / maxHp) * 100, 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        fontSize: '14px', fontWeight: 'bold', minWidth: '60px', textAlign: 'right',
        fontFamily: 'var(--font-heading)',
        color: side === 'A' ? '#4a9e5a' : '#c41e3a',
        letterSpacing: '1px',
      }}>
        {label}
      </span>
      <div className={`health-bar-container ${shaking ? 'health-bar-shake' : ''}`}>
        <div
          className={`health-bar-fill health-bar-fill--${side.toLowerCase()}`}
          style={{ width: `${hpPercent}%` }}
        />
        {shield > 0 && (
          <div className="shield-bar-fill" style={{ width: `${shieldPercent}%` }} />
        )}
      </div>
      <span style={{
        fontSize: '12px', color: 'var(--color-text-dim)', minWidth: '80px',
        fontFamily: 'var(--font-body)',
      }}>
        {currentHp}/{maxHp}
        {shield > 0 && <span style={{ color: '#5b8abf' }}> +{shield}</span>}
      </span>
    </div>
  );
}
