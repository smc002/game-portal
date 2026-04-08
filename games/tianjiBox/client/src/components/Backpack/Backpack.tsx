import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { GearIcon } from '../Gear/GearIcon';
import { GearTooltip } from '../Gear/GearTooltip';
import { GearCategory, CATEGORY_NAMES } from '../../types/enums';
import { GEAR_DEF_MAP } from '../../data/gears';
import { GearInstance } from '../../types/gear';

interface BackpackProps {
  open: boolean;
  onClose: () => void;
  onReforge: () => void;
}

const CATEGORIES: (GearCategory | 'all')[] = ['all', GearCategory.BingShu, GearCategory.SuanChou, GearCategory.FuJie, GearCategory.QiXie, GearCategory.ZhenBao];

export function Backpack({ open, onClose, onReforge }: BackpackProps) {
  const { state, dispatch } = useGame();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<GearCategory | 'all'>('all');
  const [selectedGear, setSelectedGear] = useState<GearInstance | null>(null);

  const filteredGears = state.backpack.filter(g => {
    if (filter === 'all') return true;
    const def = GEAR_DEF_MAP.get(g.defId);
    return def?.category === filter;
  });

  const ownedCategories = new Set(
    state.backpack.map(g => GEAR_DEF_MAP.get(g.defId)?.category).filter(Boolean)
  );

  function handleCategoryClick(cat: GearCategory | 'all') {
    if (cat !== 'all' && !ownedCategories.has(cat)) {
      showToast('未拥有该类型的机关');
      return;
    }
    setFilter(cat);
  }

  function handlePlaceGear(gear: GearInstance) {
    const emptySlot = state.slots.findIndex(s => s === null);
    if (emptySlot < 0) {
      showToast('天机盒已满');
      return;
    }
    dispatch({ type: 'PLACE_GEAR', instanceId: gear.instanceId, slotIndex: emptySlot });
    setSelectedGear(null);
  }

  return (
    <Modal open={open} onClose={onClose} title="机关背包" className="backpack-modal">
      <div className="category-filter">
        {CATEGORIES.map(cat => {
          const label = cat === 'all' ? '全部' : CATEGORY_NAMES[cat];
          const disabled = cat !== 'all' && !ownedCategories.has(cat);
          return (
            <button
              key={cat}
              className={`category-tag ${filter === cat ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filteredGears.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>暂无机关</div>
      ) : (
        <div className="backpack-grid">
          {filteredGears.map(gear => (
            <div key={gear.instanceId} onClick={() => setSelectedGear(gear)}>
              <GearIcon defId={gear.defId} quality={gear.quality} size="small" />
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={onReforge}>重铸</button>
      </div>

      {/* 机关详情 + 上阵操作 */}
      {selectedGear && (
        <Modal open={true} onClose={() => setSelectedGear(null)} title="机关详情">
          <GearTooltip defId={selectedGear.defId} quality={selectedGear.quality} />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-confirm" onClick={() => handlePlaceGear(selectedGear)}>
              上阵
            </button>
            <button className="btn btn-cancel" onClick={() => setSelectedGear(null)}>关闭</button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
