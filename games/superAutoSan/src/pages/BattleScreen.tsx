import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { useShopStore } from '../store/shopStore';
import { BattleUnit } from '../components/BattleUnit';
import { StatsBar } from '../components/StatsBar';
import { executeBattle } from '../engine/BattleEngine';
import { generateEnemy } from '../engine/EnemyGenerator';
import type { BattleEvent, GeneralInstance } from '../data/types';
import '../animations/effects.css';

export function BattleScreen() {
  const { team, updateTeam, wave, incrementWave, nextTurn, loseLife, setPhase } = useGameStore();
  const battle = useBattleStore();
  const [playerDisplay, setPlayerDisplay] = useState<GeneralInstance[]>([]);
  const [enemyDisplay, setEnemyDisplay] = useState<GeneralInstance[]>([]);
  const [animClass, setAnimClass] = useState<Record<string, string>>({});
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [started, setStarted] = useState(false);
  const prebattleTeamRef = useRef<GeneralInstance[]>([]);

  // Initialize battle
  useEffect(() => {
    if (started) return;
    setStarted(true);

    const currentWave = wave + 1;
    const enemy = generateEnemy(currentWave);
    // Save pre-battle team snapshot for revival after battle
    prebattleTeamRef.current = JSON.parse(JSON.stringify(team));
    const playerCopy: GeneralInstance[] = JSON.parse(JSON.stringify(team));
    for (const p of playerCopy) {
      p.tempAtk = 0;
      p.tempHp = 0;
    }

    const result = executeBattle(playerCopy, enemy);
    battle.startBattle(result.events, playerCopy, enemy);
    setPlayerDisplay(JSON.parse(JSON.stringify(playerCopy)));
    setEnemyDisplay(JSON.parse(JSON.stringify(enemy)));
  }, [started, team, wave, battle]);

  // Play events with batching for simultaneous actions
  useEffect(() => {
    if (!battle.isPlaying) return;

    const getDelay = () => {
      const s = useBattleStore.getState().speed;
      return s === 1 ? 800 : s === 2 ? 400 : 200;
    };

    const playNext = () => {
      const state = useBattleStore.getState();
      if (state.currentEventIdx >= state.events.length) {
        battle.setPlaying(false);
        return;
      }

      const event = state.events[state.currentEventIdx]!;

      // Skip non-visual events instantly (no delay)
      if (event.type === 'battle_start' || event.type === 'shift_forward') {
        battle.nextEvent();
        processEvent(event);
        // Continue immediately to next event
        timerRef.current = setTimeout(playNext, 0);
        return;
      }

      // Batch same-type paired events (attacks, hurts, faints)
      const batchable = ['attack', 'hurt', 'faint'];
      const batch: BattleEvent[] = [event];
      const nextEvt = state.events[state.currentEventIdx + 1];
      if (batchable.includes(event.type) && nextEvt && nextEvt.type === event.type) {
        batch.push(nextEvt);
      }

      for (let i = 0; i < batch.length; i++) {
        battle.nextEvent();
      }
      for (const evt of batch) {
        processEvent(evt);
      }

      timerRef.current = setTimeout(playNext, getDelay());
    };

    timerRef.current = setTimeout(playNext, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [battle.isPlaying]);

  const processEvent = useCallback((event: BattleEvent) => {
    switch (event.type) {
      case 'snapshot':
        setPlayerDisplay(JSON.parse(JSON.stringify(event.playerTeam)));
        setEnemyDisplay(JSON.parse(JSON.stringify(event.enemyTeam)));
        break;

      case 'attack': {
        const key = `${event.attackerSide}-${event.attackerIdx}`;
        const attackAnim = event.attackerSide === 'player' ? 'anim-attack-player' : 'anim-attack-enemy';
        setAnimClass((prev) => ({ ...prev, [key]: attackAnim }));
        setTimeout(() => setAnimClass((prev) => { const c = { ...prev }; delete c[key]; return c; }), 300);
        break;
      }

      case 'hurt': {
        const key = `${event.side}-${event.idx}`;
        setAnimClass((prev) => ({ ...prev, [key]: 'anim-hurt' }));
        setBattleLog((prev) => [...prev, `受伤: HP ${event.hpBefore} → ${event.hpAfter}`]);
        setTimeout(() => setAnimClass((prev) => { const c = { ...prev }; delete c[key]; return c; }), 300);
        break;
      }

      case 'faint': {
        const key = `${event.side}-${event.idx}`;
        setAnimClass((prev) => ({ ...prev, [key]: 'anim-faint' }));
        setBattleLog((prev) => [...prev, `阵亡!`]);
        break;
      }

      case 'knockback':
        break; // merged into faint animation

      case 'ability_trigger':
        setBattleLog((prev) => [...prev, event.abilityDesc]);
        break;

      case 'perk_trigger':
        setBattleLog((prev) => [...prev, `${event.perkId}: ${event.effect}`]);
        break;

      case 'battle_end': {
        battle.setResult(event.result);
        incrementWave();
        nextTurn();

        if (event.result === 'lose') {
          loseLife();
          useShopStore.getState().setLastBattleLost(true);
        } else {
          useShopStore.getState().setLastBattleLost(false);
        }

        // Bug 1 fix: All pets survive between rounds.
        // Survivors keep battle HP; dead ones are restored with pre-battle HP.
        const preTeam = prebattleTeamRef.current;
        const lastSnapshot = useBattleStore.getState().events
          .filter((e): e is Extract<BattleEvent, { type: 'snapshot' }> => e.type === 'snapshot')
          .pop();

        const restoredTeam: GeneralInstance[] = preTeam.map((prePet) => {
          const battlePet = lastSnapshot?.playerTeam.find(
            (p) => p.instanceId === prePet.instanceId
          );
          if (battlePet && battlePet.hp > 0) {
            // Survived: keep battle HP, clear temp buffs
            return { ...battlePet, tempAtk: 0, tempHp: 0 };
          } else {
            // Died: restore with pre-battle stats
            return { ...prePet, tempAtk: 0, tempHp: 0 };
          }
        });
        updateTeam(restoredTeam);

        setBattleLog((prev) => [
          ...prev,
          event.result === 'win' ? '胜利！' : event.result === 'lose' ? '失败...' : '平局',
        ]);
        break;
      }
    }
  }, [battle, incrementWave, nextTurn, loseLife, updateTeam]);

  const handleContinue = useCallback(() => {
    const currentLives = useGameStore.getState().lives;
    if (currentLives <= 0) {
      setPhase('gameOver');
    } else {
      setPhase('shop');
    }
  }, [setPhase]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12, gap: 8 }}>
      <StatsBar />

      {/* Speed controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {([1, 2, 3] as const).map((s) => (
          <button
            key={s}
            onClick={() => battle.setSpeed(s)}
            style={{
              padding: '4px 12px',
              background: battle.speed === s ? 'var(--accent)' : 'var(--bg-card)',
              borderColor: battle.speed === s ? 'var(--accent)' : 'var(--slot-border)',
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Battle field */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      }}>
        {/* Player team */}
        <div style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse' }}>
          {playerDisplay.map((g, i) => (
            <BattleUnit
              key={g.instanceId}
              general={g}
              side="player"
              animClass={animClass[`player-${i}`] ?? ''}
            />
          ))}
        </div>

        <div style={{ fontSize: 32, color: 'var(--text-gold)' }}>VS</div>

        {/* Enemy team */}
        <div style={{ display: 'flex', gap: 8 }}>
          {enemyDisplay.map((g, i) => (
            <BattleUnit
              key={g.instanceId}
              general={g}
              side="enemy"
              animClass={animClass[`enemy-${i}`] ?? ''}
            />
          ))}
        </div>
      </div>

      {/* Battle log */}
      <div style={{
        height: 80,
        overflow: 'auto',
        background: 'var(--bg-medium)',
        borderRadius: 'var(--border-radius)',
        padding: 8,
        fontSize: 12,
        color: 'var(--text-secondary)',
      }}>
        {battleLog.slice(-8).map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>

      {/* Continue button */}
      {battle.result && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
          <button className="primary" style={{ fontSize: 16, padding: '8px 32px' }} onClick={handleContinue}>
            {useGameStore.getState().lives <= 0 ? '查看结算' : '继续'}
          </button>
        </div>
      )}
    </div>
  );
}
