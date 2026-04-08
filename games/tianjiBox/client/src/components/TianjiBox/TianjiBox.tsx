import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useToast } from '../common/Toast';
import { GearIcon } from '../Gear/GearIcon';
import { GearTooltip } from '../Gear/GearTooltip';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import { settle } from '../../engine/settlement';
import { getSlotUnlockDay } from '../../data/progression';
import { checkSlotActivation } from '../../engine/slotCheck';
import { OperationRecord, AbilityEntry } from '../../types/game';

interface SettleResult {
  record: OperationRecord;
  abilities: AbilityEntry[];
  hasExtraOp: boolean;
  batchAcquireGears: string[];
}

interface TianjiBoxProps {
  onShowBackpack: () => void;
  onShowAlmanac: () => void;
  onShowHistory: () => void;
  onShowAbilities: () => void;
  onStartOperation: (settleResult: SettleResult) => void;
}

export function TianjiBox({ onShowBackpack, onShowAlmanac, onShowHistory, onShowAbilities, onStartOperation }: TianjiBoxProps) {
  const { state, dispatch } = useGame();
  const { showToast } = useToast();
  const [confirmOp, setConfirmOp] = useState(false);
  const [confirmNextDay, setConfirmNextDay] = useState(false);
  const [tooltipGear, setTooltipGear] = useState<{ defId: string; quality: number; slotIndex: number } | null>(null);

  const hasAnyGear = state.slots.some(s => s !== null);
  const allFilled = state.slots.slice(0, state.maxSlots).every(s => s !== null);
  const canOperate = hasAnyGear && (!state.hasOperatedToday || state.extraOperations > 0);

  const activations = checkSlotActivation(state.slots, state.maxSlots);

  function handleOperateClick() {
    if (!hasAnyGear) {
      showToast('请从背包中拖入机关');
      return;
    }
    if (state.hasOperatedToday && state.extraOperations <= 0) {
      showToast('天机盒今日已耗尽，请点击【下一天】');
      return;
    }
    setConfirmOp(true);
  }

  function doOperate() {
    setConfirmOp(false);
    const result = settle(state.slots, state.maxSlots);
    result.record.day = state.day;

    // 如果使用了额外运转次数，先扣除
    if (state.hasOperatedToday && state.extraOperations > 0) {
      dispatch({ type: 'USE_EXTRA_OPERATION' });
    }

    // 把结算结果传给 App，由 App 控制动画→结果→珍宝流程
    onStartOperation(result);
  }

  function handleSlotClick(index: number) {
    const gear = state.slots[index];
    if (gear) {
      setTooltipGear({ defId: gear.defId, quality: gear.quality, slotIndex: index });
    }
  }

  function handleRemoveGear(slotIndex: number) {
    dispatch({ type: 'REMOVE_GEAR', slotIndex });
    setTooltipGear(null);
  }

  function handleNextDay() {
    setConfirmNextDay(false);
    dispatch({ type: 'NEXT_DAY' });
  }

  return (
    <div>
      {/* 顶部状态栏 */}
      <div className="top-bar">
        <div className="day-display">第 {state.day} 天</div>
        <div className="top-actions">
          <button className="btn btn-primary btn-small" onClick={onShowBackpack}>背包</button>
          <button className="btn btn-primary btn-small" onClick={onShowAlmanac}>图鉴</button>
          <button className="btn btn-primary btn-small" onClick={onShowHistory}>记录</button>
          {state.todayAbilities.length > 0 && (
            <button className="btn btn-primary btn-small" onClick={onShowAbilities}>今日能力</button>
          )}
        </div>
      </div>

      {/* 天机盒槽位 */}
      <div className="tianji-box">
        {Array.from({ length: 6 }).map((_, i) => {
          const unlocked = i < state.maxSlots;
          const gear = unlocked ? state.slots[i] : null;
          const activated = gear ? activations[i] : false;

          if (!unlocked) {
            return (
              <div key={i} className="slot locked">
                <span className="slot-lock-text">第{getSlotUnlockDay(i)}天<br />解锁</span>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`slot ${gear ? 'filled' : ''}`}
              onClick={() => gear ? handleSlotClick(i) : onShowBackpack()}
            >
              {gear ? (
                <GearIcon defId={gear.defId} quality={gear.quality} activated={activated} />
              ) : (
                <span style={{ color: '#555', fontSize: 24 }}>+</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 珍宝点数进度条 */}
      <div className="treasure-bar">
        <div className="treasure-bar-label">
          <span>珍宝点数</span>
          <span>{state.treasurePoints} / {state.treasureThreshold}</span>
        </div>
        <div className="treasure-bar-track">
          <div
            className="treasure-bar-fill"
            style={{ width: `${Math.min(100, (state.treasurePoints / state.treasureThreshold) * 100)}%` }}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="action-bar">
        <button
          className="btn btn-primary"
          onClick={handleOperateClick}
          disabled={!canOperate}
          style={{ fontSize: 16, padding: '10px 32px' }}
        >
          {state.hasOperatedToday && state.extraOperations > 0 ? '额外运转' : '运转'}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setConfirmNextDay(true)}
          style={{ fontSize: 16, padding: '10px 32px' }}
        >
          下一天 →
        </button>
      </div>

      {/* 运转确认 */}
      <ConfirmDialog
        open={confirmOp}
        message={allFilled ? '每日只可运行一次，是否确认？' : '天机盒未装满，是否确认运行？'}
        onConfirm={doOperate}
        onCancel={() => setConfirmOp(false)}
      />

      {/* 下一天确认 */}
      <ConfirmDialog
        open={confirmNextDay}
        message={`确认进入第 ${state.day + 1} 天？`}
        onConfirm={handleNextDay}
        onCancel={() => setConfirmNextDay(false)}
      />

      {/* 机关详情浮窗 */}
      {tooltipGear && (
        <Modal open={true} onClose={() => setTooltipGear(null)} title="机关详情">
          <GearTooltip
            defId={tooltipGear.defId}
            quality={tooltipGear.quality}
            specialActive={activations[tooltipGear.slotIndex]}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-cancel" onClick={() => handleRemoveGear(tooltipGear.slotIndex)}>下阵</button>
            <button className="btn btn-confirm" onClick={() => setTooltipGear(null)}>关闭</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
