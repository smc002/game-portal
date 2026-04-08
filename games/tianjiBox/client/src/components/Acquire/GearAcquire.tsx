import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Modal } from '../common/Modal';
import { GearIcon } from '../Gear/GearIcon';
import { generateThreeChoices, rerollOne, allGearsMaxed } from '../../engine/gearPool';
import { GEAR_DEF_MAP } from '../../data/gears';
import { Quality, QUALITY_COLORS, CATEGORY_NAMES } from '../../types/enums';
import { GearInstance } from '../../types/gear';
import { describeCondition } from '../Gear/GearTooltip';

interface GearAcquireProps {
  open: boolean;
  onComplete: () => void;
}

function interpolate(t: string, v: number): string {
  if (v >= 10000) return t.replace('{value}', (v / 10000).toFixed(1) + '万');
  return t.replace('{value}', v.toString());
}

export function GearAcquire({ open, onComplete }: GearAcquireProps) {
  const { state, dispatch } = useGame();
  const [choices, setChoices] = useState<string[]>([]);
  const [rerolled, setRerolled] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [prevIds, setPrevIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (allGearsMaxed(state.backpack, state.slots)) {
        onComplete();
        return;
      }
      const c = generateThreeChoices(state.backpack, state.slots, state.totalAcquires);
      setChoices(c);
      setRerolled(new Set());
      setSelected(null);
      setPrevIds([]);
    }
  }, [open]);

  function handleReroll(index: number) {
    if (rerolled.has(index)) return;
    const oldId = choices[index];
    const excludeIds = [...choices, ...prevIds];
    const newId = rerollOne(state.backpack, state.slots, excludeIds);
    if (!newId) return;

    const newChoices = [...choices];
    newChoices[index] = newId;
    setChoices(newChoices);
    setRerolled(new Set([...rerolled, index]));
    setPrevIds([...prevIds, oldId]);
    if (selected === index) setSelected(null);
  }

  function handleConfirm() {
    if (selected === null) return;
    const defId = choices[selected];
    dispatch({ type: 'ACQUIRE_GEAR', defId });
    dispatch({ type: 'CONSUME_PENDING_ACQUIRE' });
    onComplete();
  }

  if (!open || choices.length === 0) return null;

  const allGears: GearInstance[] = [...state.backpack, ...(state.slots.filter(Boolean) as GearInstance[])];

  return (
    <Modal open={true} title="选择机关（三选一）" closable={false}>
      <div className="acquire-choices">
        {choices.map((defId, i) => {
          const def = GEAR_DEF_MAP.get(defId);
          if (!def) return null;

          const existing = allGears.find(g => g.defId === defId);
          const currentQ = existing?.quality ?? 0;
          const displayQ = existing?.quality ?? Quality.White;
          const hasUpgrade = !!existing;
          const upgradeQ = existing ? Math.min(existing.quality + 1, def.maxQuality) as Quality : undefined;

          const qi = Math.min(displayQ - 1, def.effect.values.length - 1);
          const normalVal = def.effect.values[qi];
          const normalText = interpolate(def.effect.descriptionTemplate, normalVal);

          // 升级后的数值
          let upgradeText = '';
          if (upgradeQ) {
            const uqi = Math.min(upgradeQ - 1, def.effect.values.length - 1);
            upgradeText = interpolate(def.effect.descriptionTemplate, def.effect.values[uqi]);
          }

          return (
            <div
              key={`${defId}-${i}`}
              className={`acquire-card ${selected === i ? 'selected' : ''}`}
              onClick={() => setSelected(i)}
            >
              {hasUpgrade && upgradeQ && (
                <div className="upgrade-badge" style={{ color: QUALITY_COLORS[upgradeQ] }}>
                  等级提升 ↑↑↑
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <GearIcon defId={defId} quality={displayQ} />
              </div>

              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                {CATEGORY_NAMES[def.category]}
              </div>

              <div className="effect-desc">
                {hasUpgrade ? (
                  <>
                    <span style={{ color: '#888', textDecoration: 'line-through' }}>{normalText}</span>
                    <br />
                    <span style={{ color: QUALITY_COLORS[upgradeQ!] }}>{upgradeText}</span>
                  </>
                ) : (
                  normalText
                )}
              </div>

              {def.specialEffect.descriptionTemplate && describeCondition(def.specialCondition) && (() => {
                const spQi = Math.min(displayQ - 1, def.specialEffect.values.length - 1);
                const spVal = def.specialEffect.values[spQi];
                const spText = interpolate(def.specialEffect.descriptionTemplate, spVal);
                const condText = describeCondition(def.specialCondition);
                return (
                  <div style={{ fontSize: 12, color: '#999', marginTop: 8, borderTop: '1px solid #333', paddingTop: 6 }}>
                    <div style={{ color: '#777', marginBottom: 2 }}>条件：{condText}</div>
                    <div>{spText}</div>
                    {hasUpgrade && upgradeQ && (() => {
                      const uSpQi = Math.min(upgradeQ - 1, def.specialEffect.values.length - 1);
                      const uSpText = interpolate(def.specialEffect.descriptionTemplate, def.specialEffect.values[uSpQi]);
                      return spText !== uSpText ? (
                        <div style={{ color: QUALITY_COLORS[upgradeQ] }}>→ {uSpText}</div>
                      ) : null;
                    })()}
                  </div>
                );
              })()}

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
        <button className="btn btn-confirm" onClick={handleConfirm} disabled={selected === null}>
          确认获取
        </button>
      </div>
    </Modal>
  );
}
