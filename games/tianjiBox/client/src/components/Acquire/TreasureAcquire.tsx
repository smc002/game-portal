import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Modal } from '../common/Modal';
import { GearIcon } from '../Gear/GearIcon';
import { generateTreasureChoices } from '../../engine/gearPool';
import { Quality } from '../../types/enums';
import { GEAR_DEF_MAP } from '../../data/gears';

interface TreasureAcquireProps {
  open: boolean;
  onComplete: () => void;
}

export function TreasureAcquire({ open, onComplete }: TreasureAcquireProps) {
  const { dispatch } = useGame();
  const [choices, setChoices] = useState<string[]>([]);
  const [rerolled, setRerolled] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      const c = generateTreasureChoices();
      setChoices(c);
      setRerolled(new Set());
      setSelected(null);
    }
  }, [open]);

  function handleReroll(index: number) {
    if (rerolled.has(index)) return;
    const excludeIds = [...choices];
    const pool = generateTreasureChoices(excludeIds);
    if (pool.length === 0) return;
    const newChoices = [...choices];
    newChoices[index] = pool[0];
    setChoices(newChoices);
    setRerolled(new Set([...rerolled, index]));
    if (selected === index) setSelected(null);
  }

  function handleConfirm() {
    if (selected === null) return;
    dispatch({ type: 'ACQUIRE_TREASURE', defId: choices[selected] });
    onComplete();
  }

  if (!open || choices.length === 0) return null;

  return (
    <>
      <div className="treasure-overlay-fx" />
      <Modal open={true} title="★ 珍宝降临 ★" closable={false} className="treasure-modal">
        <div className="acquire-choices">
          {choices.map((defId, i) => {
            const def = GEAR_DEF_MAP.get(defId);
            if (!def) return null;

            return (
              <div
                key={`${defId}-${i}`}
                className={`acquire-card ${selected === i ? 'selected' : ''}`}
                onClick={() => setSelected(i)}
                style={{
                  borderColor: selected === i ? '#ffd700' : '#555',
                  boxShadow: selected === i ? '0 0 16px rgba(255,215,0,0.5)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <GearIcon defId={defId} quality={Quality.White} />
                </div>
                <div style={{ fontWeight: 'bold', color: '#ffd700', marginBottom: 4 }}>
                  {def.name}
                </div>
                <div className="effect-desc">
                  {def.effect.descriptionTemplate.replace('{value}', def.effect.values[0].toString())}
                </div>
                <button
                  className="reroll-btn"
                  onClick={(e) => { e.stopPropagation(); handleReroll(i); }}
                  disabled={rerolled.has(i)}
                >
                  {rerolled.has(i) ? '已重随' : '重随'}
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            className="btn btn-confirm"
            onClick={handleConfirm}
            disabled={selected === null}
            style={{ background: '#ffd700', color: '#1a1a2e' }}
          >
            确认获取
          </button>
        </div>
      </Modal>
    </>
  );
}
