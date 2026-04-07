import { useState, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../../shared/types/index.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** 自动迎战倒计时（秒），略短于服务端15秒以避免竞态 */
const AUTO_FIGHT_SECONDS = 13;

interface Props {
  enemyName: string;
  estimatedPower: number;
  encounterType: 'normal' | 'ambush';
  fleeCount: number;
  socket: GameSocket | null;
  onClose: () => void;
}

export default function EncounterModal({
  enemyName, estimatedPower, encounterType, fleeCount, socket, onClose,
}: Props) {
  const [countdown, setCountdown] = useState(AUTO_FIGHT_SECONDS);
  const foughtRef = useRef(false);

  // 倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // 超时自动迎战
          if (!foughtRef.current) {
            foughtRef.current = true;
            socket?.emit('encounter:fight');
            onClose();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [socket, onClose]);

  const handleFight = () => {
    if (foughtRef.current) return;
    foughtRef.current = true;
    socket?.emit('encounter:fight');
    onClose();
  };

  const handleFlee = () => {
    if (foughtRef.current) return;
    foughtRef.current = true;
    socket?.emit('encounter:flee');
    onClose();
  };

  const isAmbush = encounterType === 'ambush';
  const pct = countdown / AUTO_FIGHT_SECONDS;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 950,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-bg-panel)',
        padding: '28px 36px',
        border: `2px solid ${isAmbush ? '#c41e3a' : '#d4a017'}`,
        textAlign: 'center',
        minWidth: '340px',
        position: 'relative',
      }}>
        {/* 内边框 */}
        <div style={{
          position: 'absolute', inset: '4px',
          border: `1px solid ${isAmbush ? 'rgba(196, 30, 58, 0.3)' : 'rgba(212, 160, 23, 0.3)'}`,
          pointerEvents: 'none',
        }} />

        {/* 标题 */}
        <div style={{
          fontSize: '22px', fontWeight: 'bold', marginBottom: '16px',
          fontFamily: 'var(--font-display)',
          color: isAmbush ? '#c41e3a' : '#d4a017',
          letterSpacing: '4px',
          textShadow: `0 2px 10px ${isAmbush ? 'rgba(196, 30, 58, 0.3)' : 'rgba(212, 160, 23, 0.3)'}`,
        }}>
          {isAmbush ? '遭遇偷袭' : '狭路相逢'}
        </div>

        {/* 装饰线 */}
        <div style={{
          width: '60%', height: '1px', margin: '0 auto 16px',
          background: `linear-gradient(90deg, transparent, ${isAmbush ? '#c41e3a' : '#d4a017'}, transparent)`,
          opacity: 0.5,
        }} />

        {/* 敌方信息 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '18px', fontWeight: 'bold', marginBottom: '6px',
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-bright)',
            letterSpacing: '2px',
          }}>
            {enemyName}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>
            预估战力: <span style={{
              color: '#f0c850', fontWeight: 'bold',
              fontFamily: 'var(--font-heading)',
            }}>{estimatedPower}</span>
          </div>
        </div>

        {/* 倒计时进度条 */}
        <div style={{
          width: '80%', height: '4px', margin: '0 auto 14px',
          background: '#1a0f0a', borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct * 100}%`,
            background: countdown <= 3 ? '#c41e3a' : '#d4a017',
            transition: 'width 1s linear',
          }} />
        </div>
        <div style={{
          fontSize: '12px', color: countdown <= 3 ? '#c41e3a' : 'var(--color-text-dim)',
          marginBottom: '14px', fontFamily: 'var(--font-heading)',
        }}>
          {countdown}秒后自动迎战
        </div>

        {/* 按钮区 */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={handleFight}
            style={{
              padding: '10px 32px', fontSize: '16px', fontWeight: 'bold',
              background: 'linear-gradient(180deg, #8b1528, #c41e3a, #8b1528)',
              color: '#f0c850',
              border: '1px solid #c41e3a',
              fontFamily: 'var(--font-display)',
              letterSpacing: '4px',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            迎战
          </button>
          <button
            onClick={handleFlee}
            disabled={fleeCount <= 0}
            style={{
              padding: '10px 32px', fontSize: '16px', fontWeight: 'bold',
              background: fleeCount > 0
                ? 'linear-gradient(180deg, #3a2a1a, #2a1a0e)'
                : 'linear-gradient(180deg, #2a2020, #1a1010)',
              color: fleeCount > 0 ? 'var(--color-text)' : '#555',
              border: `1px solid ${fleeCount > 0 ? '#5c3a21' : '#3a2a1a'}`,
              fontFamily: 'var(--font-display)',
              letterSpacing: '4px',
            }}
          >
            退避 ({fleeCount})
          </button>
        </div>

        {fleeCount <= 0 && (
          <div style={{
            marginTop: '10px', fontSize: '11px', color: '#c41e3a',
            fontFamily: 'var(--font-heading)',
          }}>
            退路已断！
          </div>
        )}

        {isAmbush && (
          <div style={{
            marginTop: '10px', fontSize: '11px', color: '#c41e3a',
            fontFamily: 'var(--font-heading)',
          }}>
            遭偷袭，无法使用药品
          </div>
        )}
      </div>
    </div>
  );
}
