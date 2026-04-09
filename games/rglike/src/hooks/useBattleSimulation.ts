import { useEffect } from 'react';
import { BattleAction } from '../types';
import { useBattleStore } from '../store/battleStore';
import { simulateTick, applyBattleStartEffects, createAllyUnits } from '../engine/battleEngine';
import { generateEnemiesFromPreview } from '../engine/enemyGenerator';
import { useGameStore } from '../store/gameStore';

const TICKS_PER_FRAME: Record<number, number> = {
  1: 7,
  2: 15,
  4: 30,
};

const FRAME_INTERVAL_MS: Record<number, number> = {
  1: 400,
  2: 200,
  4: 100,
};

const MAX_BATTLE_TICKS = 5000; // ~2 minutes of real time at 1x speed

// Module-level flag so skipBattle can signal the loop to stop
let skipRequested = false;

export function useBattleSimulation() {
  useEffect(() => {
    const { heroes, ownedItemIds, round, selectedDifficulty, enemyPreviewEasy, enemyPreviewHard } = useGameStore.getState();
    if (!selectedDifficulty) return;

    skipRequested = false;

    const allies = createAllyUnits(heroes, ownedItemIds);
    const preview = selectedDifficulty === 'hard' ? enemyPreviewHard : enemyPreviewEasy;
    const enemies = preview
      ? generateEnemiesFromPreview(round, selectedDifficulty, preview)
      : generateEnemiesFromPreview(round, selectedDifficulty, { entries: [], gold: 100, isBoss: false });

    useBattleStore.getState().initBattle(allies, enemies);

    const startActions = applyBattleStartEffects(allies, enemies, ownedItemIds);
    if (startActions.length > 0) {
      useBattleStore.getState().addActions(startActions);
    }
    useBattleStore.getState().applyTick(allies, enemies, [], 'running');

    let totalTicks = 0;
    let cancelled = false;
    let timeoutId: number;

    const runFrame = () => {
      if (cancelled) return;

      if (skipRequested) {
        // Immediately end battle as a win - don't try to simulate
        skipRequested = false;
        useBattleStore.getState().applyTick(allies, enemies, [{
          actorId: 'system', actorName: '系统',
          type: 'skill' as const, targets: [],
          description: '跳过战斗 - 胜利！',
        }], 'won');
        return;
      }

      const speed = useBattleStore.getState().speed;
      const ticksToRun = TICKS_PER_FRAME[speed] || 15;
      const allActions: BattleAction[] = [];
      let finalStatus = 'running';

      for (let i = 0; i < ticksToRun; i++) {
        totalTicks++;
        if (totalTicks >= MAX_BATTLE_TICKS) {
          finalStatus = 'won';
          allActions.push({
            actorId: 'system', actorName: '系统',
            type: 'skill' as const, targets: [],
            description: '战斗时间过长 - 判定胜利！',
          });
          break;
        }

        const result = simulateTick(allies, enemies, ownedItemIds);
        allActions.push(...result.actions);
        if (result.status !== 'running') {
          finalStatus = result.status;
          break;
        }
      }

      if (allActions.length > 0 || finalStatus !== 'running') {
        useBattleStore.getState().applyTick(allies, enemies, allActions, finalStatus as any);
      }

      if (finalStatus !== 'running') return;

      const interval = FRAME_INTERVAL_MS[speed] || 400;
      timeoutId = window.setTimeout(runFrame, interval);
    };

    timeoutId = window.setTimeout(runFrame, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const skipBattle = () => {
    skipRequested = true;
  };

  return { skipBattle };
}
