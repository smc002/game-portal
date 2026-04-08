import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Modal } from '../common/Modal';
import { GearIcon } from '../Gear/GearIcon';
import { GearTooltip } from '../Gear/GearTooltip';
import { GearCategory, Quality, CATEGORY_NAMES } from '../../types/enums';
import { ALL_GEAR_DEFS, GEAR_DEF_MAP } from '../../data/gears';
import { GearInstance } from '../../types/gear';

interface AlmanacProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES: (GearCategory | 'all')[] = ['all', GearCategory.BingShu, GearCategory.SuanChou, GearCategory.FuJie, GearCategory.QiXie, GearCategory.ZhenBao];

export function Almanac({ open, onClose }: AlmanacProps) {
  const { state } = useGame();
  const [filter, setFilter] = useState<GearCategory | 'all'>('all');
  const [showMax, setShowMax] = useState(false);
  const [selectedDef, setSelectedDef] = useState<string | null>(null);

  const allGears = [...state.backpack, ...state.slots.filter(Boolean) as GearInstance[]];

  const filteredDefs = ALL_GEAR_DEFS.filter(def => {
    if (filter === 'all') return true;
    return def.category === filter;
  });

  // 统计（不含珍宝）
  const normalDefs = ALL_GEAR_DEFS.filter(d => d.category !== GearCategory.ZhenBao);
  const collectedCount = normalDefs.filter(d => state.collectedGearIds.includes(d.id)).length;

  return (
    <Modal open={open} onClose={onClose} title="图鉴">
      <div className="category-filter">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`category-tag ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat === 'all' ? '全部' : CATEGORY_NAMES[cat]}
          </button>
        ))}
      </div>

      <div className="almanac-grid">
        {filteredDefs.map(def => {
          const owned = allGears.find(g => g.defId === def.id);
          const collected = state.collectedGearIds.includes(def.id);
          const displayQuality = showMax ? def.maxQuality : (owned?.quality ?? Quality.White);

          return (
            <div
              key={def.id}
              className={`almanac-card ${!collected ? 'uncollected' : ''}`}
              onClick={() => setSelectedDef(def.id)}
              style={{ cursor: 'pointer' }}
            >
              <GearIcon defId={def.id} quality={displayQuality} size="small" />
              {!collected && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>未收集</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`category-tag ${!showMax ? 'active' : ''}`}
            onClick={() => setShowMax(false)}
          >
            当前效果
          </button>
          <button
            className={`category-tag ${showMax ? 'active' : ''}`}
            onClick={() => setShowMax(true)}
          >
            满级效果
          </button>
        </div>
        <span style={{ fontSize: 13, color: '#888' }}>
          已收集 {collectedCount} / {normalDefs.length}
        </span>
      </div>

      {selectedDef && (
        <Modal open={true} onClose={() => setSelectedDef(null)} title="机关详情">
          <GearTooltip
            defId={selectedDef}
            quality={showMax ? GEAR_DEF_MAP.get(selectedDef)!.maxQuality : (allGears.find(g => g.defId === selectedDef)?.quality ?? Quality.White)}
          />
        </Modal>
      )}
    </Modal>
  );
}
