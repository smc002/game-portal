import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { useShopStore } from '../store/shopStore';
import { BattleUnit } from '../components/BattleUnit';
import { StatsBar } from '../components/StatsBar';
import { executeBattle } from '../engine/BattleEngine';
import { generateEnemy, getLastArenaIdx, getLastArenaSavedAt } from '../engine/EnemyGenerator';
import { saveArenaTeam } from '../engine/ArenaStore';
import type { BattleEvent, GeneralInstance } from '../data/types';
import '../animations/effects.css';

export function BattleScreen() {
  const { team, updateTeam, wave, incrementWave, nextTurn, loseLife, setPhase } = useGameStore();
  const battle = useBattleStore();
  const [playerDisplay, setPlayerDisplay] = useState<GeneralInstance[]>([]);
  const [enemyDisplay, setEnemyDisplay] = useState<GeneralInstance[]>([]);
  const [animClass, setAnimClass] = useState<Record<string, string>>({});
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [started, setStarted] = useState(false);
  const prebattleTeamRef = useRef<GeneralInstance[]>([]);
  const arenaIdxRef = useRef<number | undefined>(undefined);
  const battleWaveRef = useRef<number>(0);
  const [arenaSavedAt, setArenaSavedAt] = useState<number | undefined>(undefined);

  // Initialize battle
  useEffect(() => {
    if (started) return;
    setStarted(true);

    const currentWave = wave + 1;
    battleWaveRef.current = currentWave;
    const enemy = generateEnemy(currentWave);
    arenaIdxRef.current = getLastArenaIdx();
    setArenaSavedAt(getLastArenaSavedAt());
    // Save pre-battle team snapshot for revival after battle
    prebattleTeamRef.current = JSON.parse(JSON.stringify(team));
    const playerCopy: GeneralInstance[] = JSON.parse(JSON.stringify(team));

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
      return s === 1 ? 500 : s === 2 ? 250 : 120;
    };

    const playNext = () => {
      const state = useBattleStore.getState();
      if (state.currentEventIdx >= state.events.length) {
        battle.setPlaying(false);
        return;
      }

      const event = state.events[state.currentEventIdx]!;

      // Skip non-visual events instantly (no delay)
      const instant = ['battle_start', 'shift_forward', 'snapshot', 'knockback', 'ability_trigger', 'perk_trigger', 'summon', 'buff', 'damage_dealt'];
      if (instant.includes(event.type)) {
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
            // Survived: keep permanent stat changes from battle, restore HP to max
            return { ...battlePet, hp: battlePet.maxHp, tempAtk: 0, tempHp: 0 };
          } else {
            // Died: restore with pre-battle stats, HP to max
            return { ...prePet, hp: prePet.maxHp, tempAtk: 0, tempHp: 0 };
          }
        });
        updateTeam(restoredTeam);

        // Save winning team to PVE arena
        if (event.result === 'win') {
          saveArenaTeam(battleWaveRef.current, preTeam, arenaIdxRef.current);
        }

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

  const lives = useGameStore((s) => s.lives);
  const isWave15Win = battle.result === 'win' && battleWaveRef.current === 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12, gap: 8, position: 'relative' }}>
      {/* Result overlay */}
      {battle.result && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
          pointerEvents: 'none',
          animation: 'fadeIn 0.3s ease-out',
          padding: 20,
        }}>
          {isWave15Win ? (
            <>
              <div style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: '#ffd700',
                textShadow: '0 0 24px rgba(255,215,0,0.8), 0 4px 12px rgba(0,0,0,0.9)',
                letterSpacing: 6,
                marginBottom: 12,
                textAlign: 'center',
              }}>
                通关！恭喜
              </div>
              <div style={{
                fontSize: 16,
                color: '#fff',
                textShadow: '0 0 8px rgba(0,0,0,0.9)',
                marginBottom: 8,
                textAlign: 'center',
                maxWidth: 360,
                lineHeight: 1.5,
              }}>
                你已征服 15 关，超凡的统帅！
              </div>
              <div style={{
                fontSize: 14,
                color: '#8ab4f8',
                textShadow: '0 0 6px rgba(0,0,0,0.9)',
                marginBottom: 16,
                textAlign: 'center',
                maxWidth: 360,
                lineHeight: 1.5,
              }}>
                接下来进入<span style={{ color: '#ff9800', fontWeight: 'bold' }}>无尽挑战</span>，敌人将逐回合急剧变强，看你能撑到多少关！
              </div>
              <div style={{
                fontSize: 16,
                color: 'var(--hp-color)',
                textShadow: '0 0 8px rgba(0,0,0,0.9)',
                letterSpacing: 2,
              }}>
                剩余生命: {'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, 5 - lives))} ({lives}/5)
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontSize: 64,
                fontWeight: 'bold',
                color: battle.result === 'win' ? '#ffd700' : battle.result === 'lose' ? '#ff4444' : '#888',
                textShadow: '0 0 20px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.8)',
                letterSpacing: 8,
                marginBottom: 16,
              }}>
                {battle.result === 'win' ? '胜利！' : battle.result === 'lose' ? '失败...' : '平局'}
              </div>
              <div style={{
                fontSize: 18,
                color: 'var(--hp-color)',
                textShadow: '0 0 8px rgba(0,0,0,0.9)',
                letterSpacing: 2,
              }}>
                剩余生命: {'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, 5 - lives))} ({lives}/5)
              </div>
            </>
          )}
        </div>
      )}

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, position: 'relative' }}>
          {arenaSavedAt !== undefined && (
            <div style={{
              fontSize: 9,
              color: '#8ab4f8',
              background: 'rgba(0,0,0,0.4)',
              padding: '2px 6px',
              borderRadius: 3,
              border: '1px solid #3a5a9a',
              alignSelf: 'flex-start',
              whiteSpace: 'nowrap',
            }}>
              ⚔ 玩家阵容 · {arenaSavedAt > 0 ? formatTimestamp(arenaSavedAt) : '历史数据'}
            </div>
          )}
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

function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return '刚刚';
  if (diff < hr) return `${Math.floor(diff / min)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hr)}小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
