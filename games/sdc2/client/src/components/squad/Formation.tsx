import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../../shared/types/index.js';
import type { HeroInstance } from '../../../../shared/types/hero.js';
import HeroCard from './HeroCard.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  formation: (HeroInstance | null)[];
  bench: HeroInstance[];
  socket: GameSocket | null;
  disabled?: boolean;
}

export default function Formation({ formation, bench, socket, disabled }: Props) {
  const [dragSource, setDragSource] = useState<{ type: 'formation' | 'bench'; index: number } | null>(null);

  const handleDragStart = (type: 'formation' | 'bench', index: number) => (e: React.DragEvent) => {
    setDragSource({ type, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnFormation = (targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragSource || disabled) return;

    const newFormation = [...formation];
    const newBench = [...bench];

    if (dragSource.type === 'formation') {
      const temp = newFormation[targetIdx];
      newFormation[targetIdx] = newFormation[dragSource.index];
      newFormation[dragSource.index] = temp;
    } else {
      const hero = newBench[dragSource.index];
      const displaced = newFormation[targetIdx];
      newFormation[targetIdx] = hero;
      newBench.splice(dragSource.index, 1);
      if (displaced) {
        newBench.push(displaced);
      }
    }

    emitFormation(newFormation);
    setDragSource(null);
  };

  const handleDropOnBench = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragSource || disabled || dragSource.type !== 'formation') return;

    const hero = formation[dragSource.index];
    if (!hero) return;

    const newFormation = [...formation];
    newFormation[dragSource.index] = null;

    emitFormation(newFormation);
    setDragSource(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const emitFormation = (newFormation: (HeroInstance | null)[]) => {
    if (!socket) return;
    socket.emit('squad:update_formation', {
      formation: newFormation.map(h => h?.instanceId ?? null),
    });
  };

  return (
    <div style={{ padding: '12px' }}>
      {/* 编队区 5 槽 */}
      <div style={{
        marginBottom: '8px', fontSize: '13px',
        color: '#d4a017', fontWeight: 'bold',
        fontFamily: 'var(--font-heading)',
        letterSpacing: '2px',
      }}>
        阵列 ({formation.filter(Boolean).length}/5)
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {formation.map((hero, idx) => (
          <div
            key={idx}
            onDragOver={handleDragOver}
            onDrop={handleDropOnFormation(idx)}
            style={{
              width: '150px', minHeight: '180px',
              border: `1px dashed ${dragSource ? '#8b6914' : '#3a2a1a'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: dragSource ? 'rgba(139, 105, 20, 0.05)' : 'transparent',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            {hero ? (
              <HeroCard
                hero={hero}
                draggable={!disabled}
                onDragStart={handleDragStart('formation', idx)}
              />
            ) : (
              <span style={{
                color: '#3a2a1a', fontSize: '12px',
                fontFamily: 'var(--font-heading)',
              }}>
                {['前锋', '左翼', '中军', '右翼', '后卫'][idx] ?? `第${idx + 1}位`}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 备战席 */}
      {bench.length > 0 && (
        <>
          <div style={{
            marginBottom: '8px', fontSize: '13px',
            color: 'var(--color-text-dim)', fontWeight: 'bold',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '2px',
          }}>
            后备 ({bench.length})
          </div>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropOnBench}
            style={{
              display: 'flex', gap: '8px', flexWrap: 'wrap',
              padding: '8px',
              background: 'rgba(10, 6, 4, 0.4)',
              border: '1px solid #3a2a1a',
              minHeight: '50px',
            }}
          >
            {bench.map((hero, idx) => (
              <HeroCard
                key={hero.instanceId}
                hero={hero}
                compact
                draggable={!disabled}
                onDragStart={handleDragStart('bench', idx)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
