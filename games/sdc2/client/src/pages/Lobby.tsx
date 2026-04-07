import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import { useGameStore } from '../stores/gameStore.js';
import { TOMES, TOME_ENTRY_COSTS } from '../../../shared/data/tomes.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  socket: GameSocket | null;
}

export default function Lobby({ socket }: Props) {
  const player = useGameStore((s) => s.player);
  const [selectedTomes, setSelectedTomes] = useState<string[]>([]);

  if (!player) return null;

  const toggleTome = (tomeId: string) => {
    setSelectedTomes((prev) => {
      if (prev.includes(tomeId)) {
        return prev.filter((id) => id !== tomeId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, tomeId];
    });
  };

  const totalCost = selectedTomes.reduce((sum, _, i) => sum + TOME_ENTRY_COSTS[i], 0);
  const canAfford = player.gold >= totalCost;

  const handleDeploy = () => {
    if (!socket) return;
    if (selectedTomes.length > 0) {
      socket.emit('lobby:select_tomes', { tomeIds: selectedTomes });
    }
    socket.emit('lobby:deploy');
  };

  const handleGM = () => {
    socket?.emit('lobby:gm_add_gold');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '16px',
      background: `
        radial-gradient(ellipse at 50% 20%, rgba(139, 105, 20, 0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(196, 30, 58, 0.04) 0%, transparent 50%)
      `,
    }}>
      {/* 标题 */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '36px',
        color: '#d4a017',
        letterSpacing: '8px',
        textShadow: '0 2px 12px rgba(212, 160, 23, 0.25)',
      }}>
        安全屋
      </h2>

      {/* 装饰线 */}
      <div style={{
        width: '240px', height: '1px',
        background: 'linear-gradient(90deg, transparent, #5c3a21, transparent)',
      }} />

      {/* 玩家信息 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '8px 20px',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border)',
      }}>
        <span style={{
          fontSize: '18px', fontFamily: 'var(--font-heading)',
          color: 'var(--color-text-bright)',
        }}>
          {player.username}
        </span>
        <span style={{
          color: '#d4a017', fontSize: '16px',
          fontFamily: 'var(--font-heading)',
        }}>
          {player.gold} 金
        </span>
        <button
          onClick={handleGM}
          style={{
            background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
            color: '#888', fontSize: '11px', padding: '3px 8px',
            border: '1px solid #444',
          }}
        >
          GM +10000
        </button>
      </div>

      {/* 兵书选择 */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '8px',
        background: 'var(--color-bg-panel)',
        padding: '20px 24px',
        border: '1px solid var(--color-border)',
        width: '420px',
        position: 'relative',
      }}>
        {/* 内边框 */}
        <div style={{
          position: 'absolute', inset: '4px',
          border: '1px solid rgba(92, 58, 33, 0.25)',
          pointerEvents: 'none',
        }} />

        <h3 style={{
          fontSize: '16px', marginBottom: '8px',
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text-bright)',
          letterSpacing: '2px',
          textAlign: 'center',
        }}>
          选择兵书（最多三卷）
        </h3>

        {TOMES.map((tome) => {
          const isSelected = selectedTomes.includes(tome.id);
          return (
            <div
              key={tome.id}
              onClick={() => toggleTome(tome.id)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                background: isSelected
                  ? 'linear-gradient(90deg, rgba(196, 30, 58, 0.15), rgba(139, 105, 20, 0.1))'
                  : 'transparent',
                border: `1px solid ${isSelected ? '#8b6914' : '#3a2a1a'}`,
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <div style={{
                fontWeight: 'bold',
                fontFamily: 'var(--font-heading)',
                color: isSelected ? '#d4a017' : 'var(--color-text)',
                letterSpacing: '1px',
              }}>
                {tome.name}
              </div>
              <div style={{
                fontSize: '12px', color: 'var(--color-text-dim)',
                marginTop: '2px',
              }}>
                {tome.description}
              </div>
              {isSelected && (
                <div style={{
                  position: 'absolute', top: '50%', right: '12px',
                  transform: 'translateY(-50%)',
                  color: '#c41e3a', fontSize: '14px',
                  fontFamily: 'var(--font-display)',
                }}>
                  已选
                </div>
              )}
            </div>
          );
        })}
        {selectedTomes.length > 0 && (
          <div style={{
            fontSize: '14px',
            color: canAfford ? '#d4a017' : '#c41e3a',
            marginTop: '4px',
            textAlign: 'center',
            fontFamily: 'var(--font-heading)',
          }}>
            入场费: {totalCost} 金
          </div>
        )}
      </div>

      {/* 出征按钮 */}
      <button
        onClick={handleDeploy}
        disabled={!canAfford}
        style={{
          background: 'linear-gradient(180deg, #8b1528 0%, #c41e3a 50%, #8b1528 100%)',
          color: '#f0c850',
          fontSize: '24px',
          padding: '14px 56px',
          letterSpacing: '8px',
          fontFamily: 'var(--font-display)',
          border: '1px solid #d4a017',
          textShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        出征
      </button>
    </div>
  );
}
