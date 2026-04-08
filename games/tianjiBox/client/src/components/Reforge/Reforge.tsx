import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { GearIcon } from '../Gear/GearIcon';
import { GearTooltip } from '../Gear/GearTooltip';
import { GearInstance } from '../../types/gear';
import { GearCategory, Quality, QUALITY_COLORS } from '../../types/enums';
import { GEAR_DEF_MAP } from '../../data/gears';
import { getTotalLevel, getSelectCount, hasRemainder, canSacrifice } from '../../engine/reforge';
import { getSelectablePool, allGearsMaxed } from '../../engine/gearPool';

interface ReforgeProps {
  open: boolean;
  onClose: () => void;
}

type ReforgePhase = 'input' | 'confirm' | 'confirm_odd' | 'selecting';

export function Reforge({ open, onClose }: ReforgeProps) {
  const { state, dispatch } = useGame();
  const { showToast } = useToast();
  const [sacrifices, setSacrifices] = useState<GearInstance[]>([]);
  const [phase, setPhase] = useState<ReforgePhase>('input');
  const [selectionsLeft, setSelectionsLeft] = useState(0);

  if (allGearsMaxed(state.backpack, state.slots)) {
    return (
      <Modal open={open} onClose={onClose} title="重铸">
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>所有机关已满级</div>
      </Modal>
    );
  }

  const totalLevel = getTotalLevel(sacrifices);
  const selectCount = getSelectCount(totalLevel);
  const isOdd = hasRemainder(totalLevel);

  const availableForSacrifice = state.backpack.filter(
    g => canSacrifice(g) && !sacrifices.find(s => s.instanceId === g.instanceId)
  );

  function addSacrifice(gear: GearInstance) {
    if (sacrifices.length >= 2) {
      showToast('最多投入2个机关');
      return;
    }
    setSacrifices([...sacrifices, gear]);
  }

  function removeSacrifice(index: number) {
    setSacrifices(sacrifices.filter((_, i) => i !== index));
  }

  function handleReforgeClick() {
    if (totalLevel < 2) {
      showToast('投入物品等级至少为2');
      return;
    }
    setPhase('confirm');
  }

  function handleConfirm() {
    if (isOdd) {
      setPhase('confirm_odd');
    } else {
      startSelecting();
    }
  }

  function handleOddConfirm() {
    startSelecting();
  }

  function startSelecting() {
    const ids = sacrifices.map(s => s.instanceId);
    dispatch({ type: 'REFORGE_SACRIFICE', instanceIds: ids });
    setSelectionsLeft(selectCount);
    setSacrifices([]);
    setPhase('selecting');
  }

  function handleSelectGear(defId: string) {
    dispatch({ type: 'REFORGE_SELECT', defId });
    const left = selectionsLeft - 1;
    setSelectionsLeft(left);
    if (left <= 0) {
      setPhase('input');
      onClose();
    }
  }

  function handleClose() {
    setSacrifices([]);
    setPhase('input');
    onClose();
  }

  // 自选界面
  if (phase === 'selecting') {
    const pool = getSelectablePool(state.backpack, state.slots);
    return (
      <Modal open={true} title={`自选机关（剩余 ${selectionsLeft} 次）`} closable={false}>
        <div className="backpack-grid">
          {pool.map(defId => {
            const def = GEAR_DEF_MAP.get(defId)!;
            const existing = state.backpack.find(g => g.defId === defId);
            const quality = existing?.quality ?? Quality.White;
            const upgradeQ = existing ? Math.min(quality + 1, def.maxQuality) as Quality : undefined;

            return (
              <div key={defId} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSelectGear(defId)}>
                {existing && upgradeQ && (
                  <div style={{ fontSize: 11, color: QUALITY_COLORS[upgradeQ], fontWeight: 'bold' }}>
                    等级提升↑
                  </div>
                )}
                <GearIcon defId={defId} quality={quality} size="small" />
              </div>
            );
          })}
        </div>
      </Modal>
    );
  }

  const sacrificeNames = sacrifices.map(s => GEAR_DEF_MAP.get(s.defId)?.name ?? '').join('、');

  return (
    <Modal open={open} onClose={handleClose} title="重铸">
      <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
        投入机关（最多2个），根据总等级获得自选机会
      </p>

      {/* 投入区 */}
      <div className="reforge-input">
        {[0, 1].map(i => (
          <div key={i} className="reforge-slot" onClick={() => sacrifices[i] && removeSacrifice(i)}>
            {sacrifices[i] ? (
              <GearIcon defId={sacrifices[i].defId} quality={sacrifices[i].quality} size="small" />
            ) : (
              <span style={{ color: '#555', fontSize: 24 }}>+</span>
            )}
          </div>
        ))}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#aaa' }}>总等级：{totalLevel}</div>
          <div style={{ fontSize: 14, color: totalLevel >= 2 ? 'var(--accent)' : '#666' }}>
            可自选：{selectCount} 次
          </div>
        </div>
      </div>

      {/* 可投入的机关 */}
      <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>点击机关投入重铸：</div>
      <div className="backpack-grid">
        {availableForSacrifice.map(gear => (
          <div key={gear.instanceId} onClick={() => addSacrifice(gear)}>
            <GearIcon defId={gear.defId} quality={gear.quality} size="small" />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleReforgeClick}
          disabled={totalLevel < 2}
        >
          重铸{selectCount > 0 ? `（${selectCount}）` : ''}
        </button>
      </div>

      {/* 确认弹窗 */}
      <ConfirmDialog
        open={phase === 'confirm'}
        message={`您将重铸机关 ${sacrificeNames}。这些机关会被永久摧毁，您可以获得 ${selectCount} 次自选机关的机会，请问是否确认？`}
        onConfirm={handleConfirm}
        onCancel={() => setPhase('input')}
      />

      {/* 奇数等级确认 */}
      <ConfirmDialog
        open={phase === 'confirm_odd'}
        message="当前投入机关总等级为奇数，多余等级不会退还，是否确认？"
        onConfirm={handleOddConfirm}
        onCancel={() => setPhase('input')}
      />
    </Modal>
  );
}
