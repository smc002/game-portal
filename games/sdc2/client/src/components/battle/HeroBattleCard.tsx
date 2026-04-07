import type { HeroInstance } from '../../../../shared/types/hero.js';
import '../../styles/battle.css';

const FACTION_COLORS: Record<string, string> = {
  wei: '#5b8abf',
  shu: '#4a9e5a',
  wu: '#c45050',
  qun: '#8e6ab8',
};

const FACTION_SHORT: Record<string, string> = {
  wei: '魏', shu: '蜀', wu: '吴', qun: '群',
};

interface Props {
  hero: HeroInstance | null;
  active?: boolean;
  atbPercent?: number;
  atbModified?: boolean;
  defeated?: boolean;
}

export default function HeroBattleCard({ hero, active, atbPercent = 0, atbModified, defeated }: Props) {
  if (!hero) {
    return (
      <div className="hero-battle-card hero-battle-card--defeated"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px' }}>
        <span style={{ color: '#3a2a1a', fontSize: '11px', fontFamily: 'var(--font-heading)' }}>空</span>
      </div>
    );
  }

  if (defeated) {
    return (
      <div className="hero-battle-card" style={{ opacity: 0.35 }}>
        <div style={{
          fontSize: '13px', fontWeight: 'bold', marginBottom: '2px',
          fontFamily: 'var(--font-heading)',
          color: '#8a7560',
          textDecoration: 'line-through',
        }}>
          {hero.name}
        </div>
        <div style={{ fontSize: '11px', color: '#c41e3a', fontFamily: 'var(--font-heading)' }}>
          阵亡
        </div>
      </div>
    );
  }

  const factionColor = FACTION_COLORS[hero.faction] ?? '#8a7560';

  return (
    <div className={`hero-battle-card ${active ? 'hero-battle-card--active' : ''}`}>
      {/* 阵营标签 */}
      <div style={{
        fontSize: '9px', fontWeight: 'bold', color: factionColor,
        background: `${factionColor}18`, padding: '1px 4px',
        border: `1px solid ${factionColor}33`,
        marginBottom: '2px', display: 'inline-block',
        fontFamily: 'var(--font-heading)',
      }}>
        {FACTION_SHORT[hero.faction]}
      </div>
      {/* 名字 */}
      <div style={{
        fontSize: '13px', fontWeight: 'bold', marginBottom: '2px',
        fontFamily: 'var(--font-heading)',
        color: 'var(--color-text-bright, #f5e6cf)',
      }}>
        {hero.name}
      </div>
      {/* 星级 */}
      <div style={{ fontSize: '9px', color: '#d4a017', marginBottom: '4px' }}>
        {'★'.repeat(hero.starLevel)}
      </div>
      {/* ATB条 */}
      <div className="atb-bar-container">
        <div
          className={`atb-bar-fill ${atbModified ? 'atb-bar-fill--modified' : ''}`}
          style={{ width: `${Math.min(100, atbPercent)}%` }}
        />
      </div>
    </div>
  );
}
