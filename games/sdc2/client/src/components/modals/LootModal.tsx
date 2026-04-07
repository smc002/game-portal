import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../../shared/types/index.js';
import type { HeroInstance } from '../../../../shared/types/hero.js';
import HeroCard from '../squad/HeroCard.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  heroOption: HeroInstance | null;
  resourceAmount: number;
  socket: GameSocket | null;
  onClose: () => void;
}

export default function LootModal({ heroOption, resourceAmount, socket, onClose }: Props) {
  const handleChoose = (choice: 'hero' | 'resources') => {
    socket?.emit('loot:choose', { choice });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 950,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-bg-panel)',
        padding: '28px 36px',
        border: '2px solid #8b6914',
        textAlign: 'center',
        minWidth: '420px',
        position: 'relative',
      }}>
        {/* 内边框 */}
        <div style={{
          position: 'absolute', inset: '4px',
          border: '1px solid rgba(139, 105, 20, 0.3)',
          pointerEvents: 'none',
        }} />

        <div style={{
          fontSize: '22px', fontWeight: 'bold',
          color: '#d4a017',
          marginBottom: '8px',
          fontFamily: 'var(--font-display)',
          letterSpacing: '4px',
          textShadow: '0 2px 10px rgba(212, 160, 23, 0.3)',
        }}>
          战利品
        </div>

        {/* 装饰线 */}
        <div style={{
          width: '60%', height: '1px', margin: '0 auto 8px',
          background: 'linear-gradient(90deg, transparent, #8b6914, transparent)',
          opacity: 0.5,
        }} />

        <div style={{
          fontSize: '13px', color: 'var(--color-text-dim)', marginBottom: '20px',
          fontFamily: 'var(--font-heading)',
        }}>
          择其一而取之
        </div>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'stretch' }}>
          {/* 武将选项 */}
          <div style={{
            flex: 1, padding: '16px',
            background: 'var(--color-bg-light)',
            border: '1px solid #5c3a21',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          }}>
            <div style={{
              fontSize: '14px', fontWeight: 'bold',
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-bright)',
              letterSpacing: '2px',
            }}>
              收编武将
            </div>
            {heroOption ? (
              <>
                <HeroCard hero={heroOption} />
                <button
                  onClick={() => handleChoose('hero')}
                  style={{
                    padding: '8px 24px', fontSize: '13px',
                    background: 'linear-gradient(180deg, #2a5c2a, #1a3e1a)',
                    color: '#4a9e5a',
                    border: '1px solid #4a9e5a',
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: '2px',
                  }}
                >
                  收编
                </button>
              </>
            ) : (
              <div style={{
                color: '#5c3a21', fontSize: '12px', padding: '20px 0',
                fontFamily: 'var(--font-heading)',
              }}>
                无可收编之将
              </div>
            )}
          </div>

          {/* 物资选项 */}
          <div style={{
            flex: 1, padding: '16px',
            background: 'var(--color-bg-light)',
            border: '1px solid #5c3a21',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '14px', fontWeight: 'bold',
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-bright)',
              letterSpacing: '2px',
            }}>
              掠夺金银
            </div>
            <div style={{
              fontSize: '32px', color: '#d4a017', fontWeight: 'bold',
              fontFamily: 'var(--font-display)',
              textShadow: '0 2px 8px rgba(212, 160, 23, 0.3)',
            }}>
              {resourceAmount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>金</div>
            <button
              onClick={() => handleChoose('resources')}
              style={{
                padding: '8px 24px', fontSize: '13px',
                background: 'linear-gradient(180deg, #8b6914, #d4a017, #8b6914)',
                color: '#1a0f0a',
                border: '1px solid #d4a017',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '2px',
              }}
            >
              掠夺
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
