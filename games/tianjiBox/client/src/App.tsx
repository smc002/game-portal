import { useState, useEffect, useRef } from 'react';
import { useGame } from './context/GameContext';
import { TianjiBox } from './components/TianjiBox/TianjiBox';
import { Backpack } from './components/Backpack/Backpack';
import { GearAcquire } from './components/Acquire/GearAcquire';
import { TreasureAcquire } from './components/Acquire/TreasureAcquire';
import { OperationAnim } from './components/Operation/OperationAnim';
import { ResultPanel } from './components/Operation/ResultPanel';
import { Abilities } from './components/Abilities/Abilities';
import { History } from './components/History/History';
import { Almanac } from './components/Almanac/Almanac';
import { Reforge } from './components/Reforge/Reforge';
import { OperationRecord, AbilityEntry } from './types/game';
import { GearInstance } from './types/gear';
import { generateBatchGears } from './engine/gearPool';

type ModalView = 'none' | 'backpack' | 'almanac' | 'history' | 'abilities' | 'reforge';

interface PendingOperation {
  record: OperationRecord;
  abilities: AbilityEntry[];
  hasExtraOp: boolean;
  batchAcquireGears: string[];
  slotSnapshot: (GearInstance | null)[];
}

export default function App() {
  const { state, dispatch } = useGame();
  const [modal, setModal] = useState<ModalView>('none');

  // 机关获取流程
  const [showAcquire, setShowAcquire] = useState(false);
  const acquireCountRef = useRef(0); // 本轮还需领取几次

  // 运转流程：动画 → 结果 → 珍宝销毁 → 珍宝获取
  const [pendingOp, setPendingOp] = useState<PendingOperation | null>(null);
  const [showAnim, setShowAnim] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showTreasure, setShowTreasure] = useState(false);
  const [showBatchResult, setShowBatchResult] = useState<string[] | null>(null);

  // ===== 机关获取 =====
  // 进入游戏或 NEXT_DAY 后触发
  useEffect(() => {
    if (state.pendingAcquires > 0 && !showAcquire && !showAnim && !showResult) {
      acquireCountRef.current = state.pendingAcquires;
      setShowAcquire(true);
    }
  }, [state.day]);

  // 首次加载
  useEffect(() => {
    if (state.pendingAcquires > 0) {
      acquireCountRef.current = state.pendingAcquires;
      setShowAcquire(true);
    }
  }, []);

  function handleAcquireComplete() {
    acquireCountRef.current--;
    if (acquireCountRef.current > 0) {
      setShowAcquire(false);
      // 短暂关闭后重新打开，让组件 reset
      requestAnimationFrame(() => setShowAcquire(true));
    } else {
      setShowAcquire(false);
    }
  }

  // ===== 运转流程 =====
  function handleStartOperation(result: {
    record: OperationRecord;
    abilities: AbilityEntry[];
    hasExtraOp: boolean;
    batchAcquireGears: string[];
  }) {
    setPendingOp({
      ...result,
      slotSnapshot: [...state.slots],
    });
    setShowAnim(true);
  }

  function handleAnimComplete() {
    if (!pendingOp) return;
    setShowAnim(false);

    // 计算珍宝是否满
    const newTP = state.treasurePoints + pendingOp.record.treasurePointsGained;
    const treasureGained = newTP >= state.treasureThreshold;

    // 提交运转结果到 state
    dispatch({
      type: 'OPERATE',
      result: pendingOp.record,
      abilities: pendingOp.abilities,
      treasureGained,
      grantExtraOp: pendingOp.hasExtraOp,
    });

    // 珍宝已在 OPERATE reducer 中自动销毁

    // 百宝箱效果
    if (pendingOp.batchAcquireGears.includes('baibaoxiang')) {
      const gears = generateBatchGears(state.backpack, state.slots);
      if (gears.length > 0) {
        dispatch({ type: 'BATCH_ACQUIRE_GEARS', defIds: gears });
        setShowBatchResult(gears);
      }
    }

    setShowResult(true);
  }

  function handleResultClose() {
    setShowResult(false);
    setShowBatchResult(null);

    // 检查是否需要珍宝获取（state 此时已更新）
    // 使用 requestAnimationFrame 等待 state 更新后判断
    requestAnimationFrame(() => {
      if (state.pendingTreasure) {
        setShowTreasure(true);
      } else {
        setPendingOp(null);
      }
    });
  }

  // 由于 state.pendingTreasure 可能在 requestAnimationFrame 时还没更新，
  // 用 effect 来兜底
  useEffect(() => {
    if (state.pendingTreasure && !showResult && !showAnim && !showTreasure) {
      setShowTreasure(true);
    }
  }, [state.pendingTreasure, showResult, showAnim, showTreasure]);

  function handleTreasureComplete() {
    setShowTreasure(false);
    setPendingOp(null);
  }

  return (
    <div className="app-container">
      <h1 style={{ textAlign: 'center', fontSize: 24, color: 'var(--accent)', marginBottom: 16, letterSpacing: 8 }}>
        天 机 盒
      </h1>

      <TianjiBox
        onShowBackpack={() => setModal('backpack')}
        onShowAlmanac={() => setModal('almanac')}
        onShowHistory={() => setModal('history')}
        onShowAbilities={() => setModal('abilities')}
        onStartOperation={handleStartOperation}
      />

      {/* 面板弹窗 */}
      <Backpack
        open={modal === 'backpack'}
        onClose={() => setModal('none')}
        onReforge={() => setModal('reforge')}
      />
      <Almanac open={modal === 'almanac'} onClose={() => setModal('none')} />
      <History open={modal === 'history'} onClose={() => setModal('none')} />
      <Abilities open={modal === 'abilities'} onClose={() => setModal('none')} />
      <Reforge open={modal === 'reforge'} onClose={() => setModal('none')} />

      {/* 机关获取 */}
      <GearAcquire open={showAcquire} onComplete={handleAcquireComplete} />

      {/* 运转动画 */}
      <OperationAnim
        open={showAnim}
        slots={pendingOp?.slotSnapshot ?? []}
        effects={pendingOp?.record.effects ?? []}
        onComplete={handleAnimComplete}
      />

      {/* 运转结果 */}
      <ResultPanel
        open={showResult}
        record={pendingOp?.record ?? null}
        onClose={handleResultClose}
        batchGears={showBatchResult}
      />

      {/* 珍宝获取 */}
      <TreasureAcquire open={showTreasure} onComplete={handleTreasureComplete} />
    </div>
  );
}
