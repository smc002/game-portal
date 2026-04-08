import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../../shared/types/index.js';
import type { HeroInstance } from '../../../../shared/types/hero.js';
import HeroCard from '../squad/HeroCard.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  heroes: HeroInstance[];
  freeRerolls: number[];
  socket: GameSocket | null;
  gold: number;
  onConfirm: () => void;
}

const REROLL_GOLD_COST = 50;

export default function RerollModal({ heroes, freeRerolls, socket, gold, onConfirm }: Props) {
  const handleReroll = (slot: number) => {
    if (!socket) return;
    socket.emit('squad:reroll', { slot, useGold: (freeRerolls[slot] ?? 0) <= 0 });
  };

  const handleConfirm = () => {
    if (!socket) return;
    socket.emit('squad:confirm_reroll');
    onConfirm();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.88)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 0',
      }}>
      <div style={{
        background: 'var(--color-bg-panel)',
        padding: '32px',
        maxWidth: '900px',
        width: '92%',
        border: '2px solid #5c3a21',
        position: 'relative',
      }}>
        {/* 内边框 */}
        <div style={{
          position: 'absolute', inset: '4px',
          border: '1px solid rgba(92, 58, 33, 0.3)',
          pointerEvents: 'none',
        }} />

        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{
            margin: '0 0 10px', fontSize: '32px',
            fontFamily: 'var(--font-display)',
            color: '#d4a017',
            letterSpacing: '6px',
            textShadow: '0 2px 10px rgba(212, 160, 23, 0.25)',
          }}>
            点将台
          </h2>

          {/* 装饰线 */}
          <div style={{
            width: '40%', height: '1px', margin: '0 auto 14px',
            background: 'linear-gradient(90deg, transparent, #5c3a21, transparent)',
          }} />

          <p style={{
            margin: 0, fontSize: '17px', color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-heading)',
          }}>
            天赐 {heroes.length} 员战将，每人可免费换将一次
          </p>
        </div>

        {/* 武将卡片 */}
        <div style={{
          display: 'flex', gap: '36px', justifyContent: 'center',
          flexWrap: 'wrap', marginBottom: '28px',
        }}>
          {heroes.map((hero, idx) => (
            <div key={hero.instanceId} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              width: '195px',
            }}>
              <div style={{ transform: 'scale(1.3)', transformOrigin: 'top center', marginBottom: '54px' }}>
                <HeroCard hero={hero} />
              </div>
              {(() => {
                const slotFree = (freeRerolls[idx] ?? 0) > 0;
                return (
                  <button
                    onClick={() => handleReroll(idx)}
                    disabled={!slotFree && gold < REROLL_GOLD_COST}
                    style={{
                      padding: '6px 20px', fontSize: '16px',
                      background: slotFree
                        ? 'linear-gradient(180deg, #2a5c2a, #1a3e1a)'
                        : 'linear-gradient(180deg, #5c4a1a, #3e3010)',
                      color: slotFree ? '#4a9e5a' : '#d4a017',
                      border: `1px solid ${slotFree ? '#4a9e5a' : '#8b6914'}`,
                      fontFamily: 'var(--font-heading)',
                      letterSpacing: '1px',
                    }}
                  >
                    {slotFree ? '换将' : `${REROLL_GOLD_COST}金 换将`}
                  </button>
                );
              })()}
            </div>
          ))}
        </div>

        {/* 确认 */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleConfirm}
            style={{
              padding: '14px 56px', fontSize: '22px', fontWeight: 'bold',
              background: 'linear-gradient(180deg, #8b1528, #c41e3a, #8b1528)',
              color: '#f0c850',
              border: '1px solid #d4a017',
              fontFamily: 'var(--font-display)',
              letterSpacing: '6px',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            点将出征
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
