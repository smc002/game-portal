import { useEffect, useRef, useState, useMemo } from 'react';
import type { BattleEvent, BattleOutput } from '../../../../shared/types/battle.js';
import type { HeroInstance } from '../../../../shared/types/hero.js';
import HealthBar from './HealthBar.js';
import HeroBattleCard from './HeroBattleCard.js';
import '../../styles/battle.css';

/** 每个事件的播放间隔（毫秒） */
const EVENT_INTERVAL = 360;

/** 战斗结果显示时间（毫秒） */
const RESULT_DISPLAY_TIME = 3000;

/** ATB每tick增长系数（与引擎一致） */
const TICK_DELTA = 0.1;

interface Props {
  events: BattleEvent[];
  result: BattleOutput;
  /** 当前玩家是A方还是B方 */
  mySide: 'A' | 'B';
  /** 初始阵容快照 */
  formationA: (HeroInstance | null)[];
  formationB: (HeroInstance | null)[];
  maxHpA: number;
  maxHpB: number;
  nameA: string;
  nameB: string;
  onClose: () => void;
}

interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'true_damage' | 'heal' | 'shield' | 'buff_add' | 'buff_remove';
  side: 'A' | 'B';
}

let floatId = 0;

export default function BattleScene({
  events, result, mySide, formationA, formationB,
  maxHpA, maxHpB, nameA, nameB, onClose,
}: Props) {
  const [eventIdx, setEventIdx] = useState(0);
  const [hpA, setHpA] = useState(maxHpA);
  const [hpB, setHpB] = useState(maxHpB);
  const [shieldA, setShieldA] = useState(0);
  const [shieldB, setShieldB] = useState(0);
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null);
  const [shakingA, setShakingA] = useState(false);
  const [shakingB, setShakingB] = useState(false);
  const [atbMap, setAtbMap] = useState<Record<string, number>>({});
  const [atbModifiedSet, setAtbModifiedSet] = useState<Set<string>>(new Set());
  const [floats, setFloats] = useState<FloatingText[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [defeatedHeroes, setDefeatedHeroes] = useState<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  // 收集所有英雄及其speed，用于ATB模拟
  const allHeroes = useMemo(() => {
    const heroes: { id: string; speed: number; side: 'A' | 'B' }[] = [];
    formationA.forEach(h => { if (h) heroes.push({ id: h.instanceId, speed: h.speed, side: 'A' }); });
    formationB.forEach(h => { if (h) heroes.push({ id: h.instanceId, speed: h.speed, side: 'B' }); });
    return heroes;
  }, [formationA, formationB]);

  // 根据tick差模拟ATB增长
  const simulateAtb = (currentTick: number) => {
    const tickDiff = currentTick - lastTickRef.current;
    if (tickDiff <= 0) return;
    lastTickRef.current = currentTick;

    setAtbMap(prev => {
      const next = { ...prev };
      for (const hero of allHeroes) {
        if (defeatedHeroes.has(hero.id)) continue;
        const current = next[hero.id] ?? 0;
        next[hero.id] = Math.min(100, current + hero.speed * TICK_DELTA * tickDiff);
      }
      return next;
    });
  };

  // 逐步播放事件
  useEffect(() => {
    if (eventIdx >= events.length) {
      // 播放完毕，显示结果
      setTimeout(() => setShowResult(true), 500);
      setTimeout(() => setFinished(true), RESULT_DISPLAY_TIME);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      const evt = events[eventIdx];
      processEvent(evt);
      setEventIdx(i => i + 1);
    }, EVENT_INTERVAL);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [eventIdx, events]);

  const addFloat = (text: string, type: FloatingText['type'], side: 'A' | 'B') => {
    const id = ++floatId;
    setFloats(prev => [...prev, { id, text, type, side }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1200);
  };

  const processEvent = (evt: BattleEvent) => {
    // 模拟ATB到当前tick
    simulateAtb(evt.tick);

    switch (evt.type) {
      case 'action_start':
        setActiveHeroId(evt.heroId);
        setTimeout(() => setActiveHeroId(null), 400);
        // 行动后ATB重置
        setAtbMap(prev => ({ ...prev, [evt.heroId]: 0 }));
        break;

      case 'damage': {
        const amount = evt.amount;
        if (evt.target === 'A') {
          setHpA(hp => Math.max(0, hp - amount));
          setShakingA(true);
          setTimeout(() => setShakingA(false), 350);
        } else {
          setHpB(hp => Math.max(0, hp - amount));
          setShakingB(true);
          setTimeout(() => setShakingB(false), 350);
        }
        addFloat(`-${amount}`, evt.isTrueDamage ? 'true_damage' : 'damage', evt.target);
        break;
      }

      case 'heal':
        if (evt.target === 'A') {
          setHpA(hp => Math.min(maxHpA, hp + evt.amount));
        } else {
          setHpB(hp => Math.min(maxHpB, hp + evt.amount));
        }
        addFloat(`+${evt.amount}`, 'heal', evt.target);
        break;

      case 'shield_change':
        if (evt.target === 'A') {
          setShieldA(s => Math.max(0, s + evt.amount));
        } else {
          setShieldB(s => Math.max(0, s + evt.amount));
        }
        if (evt.amount > 0) {
          addFloat(`+${evt.amount}盾`, 'shield', evt.target);
        }
        break;

      case 'buff_applied':
        addFloat(`+${evt.buffName}${evt.stacks > 1 ? ` x${evt.stacks}` : ''}`, 'buff_add', evt.targetType === 'player' ? 'A' : 'A');
        break;

      case 'buff_removed':
        addFloat(`-${evt.buffName}`, 'buff_remove', 'A');
        break;

      case 'atb_modified':
        setAtbModifiedSet(prev => new Set(prev).add(evt.heroId));
        setTimeout(() => setAtbModifiedSet(prev => {
          const next = new Set(prev);
          next.delete(evt.heroId);
          return next;
        }), 500);
        setAtbMap(prev => ({
          ...prev,
          [evt.heroId]: Math.max(0, Math.min(100, (prev[evt.heroId] ?? 0) + evt.amount)),
        }));
        break;

      case 'hero_defeated':
        addFloat('阵亡', 'damage', evt.side);
        setDefeatedHeroes(prev => new Set(prev).add(evt.heroId));
        setAtbMap(prev => ({ ...prev, [evt.heroId]: 0 }));
        break;

      case 'battle_end':
        break;
    }
  };

  const isWin = result.winner === mySide;

  return (
    <div className="battle-overlay">
      <div style={{
        width: '95%', maxWidth: '1000px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        position: 'relative',
        padding: '24px',
        background: 'rgba(26, 15, 10, 0.6)',
        border: '1px solid #5c3a21',
      }}>
        {/* 内边框 */}
        <div style={{
          position: 'absolute', inset: '4px',
          border: '1px solid rgba(92, 58, 33, 0.25)',
          pointerEvents: 'none',
        }} />

        {/* 双方血量条 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <HealthBar currentHp={hpA} maxHp={maxHpA} shield={shieldA}
            side="A" label={nameA} shaking={shakingA} />
          <span style={{
            color: '#5c3a21', fontSize: '18px', fontWeight: 'bold', padding: '0 12px',
            fontFamily: 'var(--font-display)',
            letterSpacing: '2px',
          }}>
            VS
          </span>
          <HealthBar currentHp={hpB} maxHp={maxHpB} shield={shieldB}
            side="B" label={nameB} shaking={shakingB} />
        </div>

        {/* 双方阵容 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          {/* A方 */}
          <div style={{ display: 'flex', gap: '4px', position: 'relative', flex: 1, minWidth: 0 }}>
            {formationA.map((hero, idx) => (
              <HeroBattleCard
                key={idx}
                hero={hero}
                active={hero ? hero.instanceId === activeHeroId : false}
                atbPercent={hero ? (atbMap[hero.instanceId] ?? 0) : 0}
                atbModified={hero ? atbModifiedSet.has(hero.instanceId) : false}
                defeated={hero ? defeatedHeroes.has(hero.instanceId) : false}
              />
            ))}
            {floats.filter(f => f.side === 'A').map(f => (
              <div key={f.id} className={`buff-text ${f.type.includes('damage') || f.type === 'buff_remove' ? 'buff-text--remove' : 'buff-text--add'}`}
                style={{ left: '40%', top: '-20px' }}>
                {f.text}
              </div>
            ))}
          </div>

          {/* B方 */}
          <div style={{ display: 'flex', gap: '4px', position: 'relative', flex: 1, minWidth: 0 }}>
            {formationB.map((hero, idx) => (
              <HeroBattleCard
                key={idx}
                hero={hero}
                active={hero ? hero.instanceId === activeHeroId : false}
                atbPercent={hero ? (atbMap[hero.instanceId] ?? 0) : 0}
                atbModified={hero ? atbModifiedSet.has(hero.instanceId) : false}
                defeated={hero ? defeatedHeroes.has(hero.instanceId) : false}
              />
            ))}
            {floats.filter(f => f.side === 'B').map(f => (
              <div key={f.id} className={`buff-text ${f.type.includes('damage') || f.type === 'buff_remove' ? 'buff-text--remove' : 'buff-text--add'}`}
                style={{ left: '40%', top: '-20px' }}>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* 战斗进度 */}
        <div style={{
          textAlign: 'center', fontSize: '11px', color: '#5c3a21',
          fontFamily: 'var(--font-body)',
        }}>
          {Math.min(eventIdx, events.length)}/{events.length}
        </div>

        {/* 战斗结果 */}
        {showResult && (
          <div className={`battle-result ${isWin ? 'battle-result--win' : 'battle-result--lose'}`}>
            {isWin ? '大捷' : '败北'}
          </div>
        )}

        {/* 关闭按钮 */}
        {finished && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 40px', fontSize: '16px',
                background: 'linear-gradient(180deg, #3a2a1a, #2a1a0e)',
                color: 'var(--color-text)',
                border: '1px solid #5c3a21',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '4px',
              }}
            >
              继续
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
