import { Quality, QUALITY_COLORS, CATEGORY_NAMES, GearCategory } from '../../types/enums';
import { GEAR_DEF_MAP } from '../../data/gears';

interface GearIconProps {
  defId: string;
  quality: Quality;
  activated?: boolean;
  size?: 'normal' | 'small';
  onClick?: () => void;
}

export function GearIcon({ defId, quality, activated, size = 'normal', onClick }: GearIconProps) {
  const def = GEAR_DEF_MAP.get(defId);
  if (!def) return null;

  const w = size === 'small' ? 60 : 80;
  const fontSize = size === 'small' ? 10 : 12;
  const isTreasure = def.category === GearCategory.ZhenBao;
  const qualityClass = isTreasure ? 'quality-treasure' : `quality-${quality}`;
  const borderColor = isTreasure ? '#ffd700' : QUALITY_COLORS[quality];

  return (
    <div
      className={`gear-icon ${qualityClass} ${activated ? 'activated' : ''}`}
      style={{ width: w, height: w, borderColor }}
      onClick={onClick}
    >
      <span style={{ fontSize: fontSize + 4 }}>
        {isTreasure ? '★' : '◆'}
      </span>
      <span className="gear-name" style={{ fontSize }}>{def.name}</span>
      <span
        className="gear-category-badge"
        style={{ background: `var(--cat-${def.category})` }}
      >
        {CATEGORY_NAMES[def.category]}
      </span>
    </div>
  );
}
