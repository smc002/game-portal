import type { ItemDef } from '../data/types';
import { TIER_COLORS } from '../data/types';
import { useShopStore } from '../store/shopStore';
import { Tooltip } from './Tooltip';

interface Props {
  def: ItemDef;
  frozen?: boolean;
  selected?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  onFreeze?: () => void;
}

export function ItemCard({ def, frozen, selected, onClick, onFreeze }: Props) {
  const tierColor = TIER_COLORS[def.tier] ?? '#888';
  const itemDiscount = useShopStore((s) => s.itemDiscount);
  const effectiveCost = Math.max(0, def.cost - itemDiscount);
  const discounted = effectiveCost < def.cost;

  const tooltipContent = (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{def.name}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 10, marginBottom: 4 }}>
        Tier {def.tier} | {def.cost} 金 | {def.type === 'perk' ? '锦囊' : def.type === 'special' ? '特殊' : '属性'}
      </div>
      <div style={{ color: '#ccc' }}>{def.description}</div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div
        onClick={onClick}
        style={{
          width: 'var(--card-width)',
          height: 'var(--card-height)',
          background: 'var(--bg-card)',
          border: `2px solid ${selected ? '#00e5ff' : frozen ? '#00bfff' : tierColor}`,
          boxShadow: selected ? '0 0 8px rgba(0,229,255,0.5)' : undefined,
          borderRadius: 'var(--border-radius)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 4,
          cursor: 'pointer',
          position: 'relative',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {/* Freeze */}
        {onFreeze && (
          <div
            onClick={(e) => { e.stopPropagation(); onFreeze(); }}
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              cursor: 'pointer',
              color: frozen ? '#00bfff' : '#888',
              background: frozen ? 'rgba(0,191,255,0.15)' : 'rgba(255,255,255,0.08)',
              borderRadius: '50%',
              border: `1px solid ${frozen ? '#00bfff' : '#555'}`,
            }}
          >
            {frozen ? '❄' : '○'}
          </div>
        )}

        {/* Icon block */}
        <div style={{
          width: 36,
          height: 36,
          background: def.type === 'perk' ? '#8b4513' : def.type === 'special' ? '#4a0080' : '#2e7d32',
          borderRadius: 2,
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: '#fff',
        }}>
          {def.name[0]}
        </div>

        {/* Name */}
        <div style={{ fontSize: 10, textAlign: 'center' }}>
          {def.name}
        </div>

        {/* Cost */}
        <div style={{ fontSize: 11, color: discounted ? '#44ff44' : 'var(--gold-color)' }}>
          {discounted && (
            <span style={{ color: '#888', textDecoration: 'line-through', marginRight: 4 }}>
              {def.cost}
            </span>
          )}
          {effectiveCost} 金
        </div>
      </div>
    </Tooltip>
  );
}
