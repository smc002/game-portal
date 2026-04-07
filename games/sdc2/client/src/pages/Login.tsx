import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  socket: GameSocket | null;
  connected: boolean;
}

export default function Login({ socket, connected }: Props) {
  const [username, setUsername] = useState('');

  const handleLogin = () => {
    if (!socket || !connected) return;
    const name = username.trim();
    if (!name) return;
    socket.emit('lobby:login', { username: name });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '20px',
      background: `
        radial-gradient(ellipse at 50% 30%, rgba(196, 30, 58, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 70%, rgba(139, 105, 20, 0.06) 0%, transparent 50%)
      `,
    }}>
      {/* 水墨装饰线 */}
      <div style={{
        width: '200px', height: '2px', marginBottom: '8px',
        background: 'linear-gradient(90deg, transparent, var(--color-border-gold), transparent)',
        opacity: 0.5,
      }} />

      {/* 标题 */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '64px',
        color: '#f0c850',
        letterSpacing: '16px',
        textShadow: '0 2px 20px rgba(212, 160, 23, 0.3), 0 0 40px rgba(196, 30, 58, 0.15)',
        animation: 'inkDrop 0.8s ease-out',
      }}>
        搜打撤
      </h1>

      {/* 副标题 */}
      <p style={{
        fontFamily: 'var(--font-heading)',
        color: 'var(--color-text-dim)',
        fontSize: '14px',
        letterSpacing: '4px',
      }}>
        三国策略 · 搜索掠夺 · 全身而退
      </p>

      {/* 装饰线 */}
      <div style={{
        width: '300px', height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--color-border), transparent)',
        margin: '4px 0',
      }} />

      {/* 输入区域 */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '16px', marginTop: '12px',
        padding: '28px 36px',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border)',
        position: 'relative',
      }}>
        {/* 内边框装饰 */}
        <div style={{
          position: 'absolute', inset: '4px',
          border: '1px solid rgba(92, 58, 33, 0.3)',
          pointerEvents: 'none',
        }} />

        <input
          type="text"
          placeholder="请输入将军名号"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={20}
          style={{
            width: '260px', fontSize: '18px', padding: '12px 16px',
            textAlign: 'center', letterSpacing: '2px',
            fontFamily: 'var(--font-heading)',
          }}
        />
        <button
          onClick={handleLogin}
          disabled={!connected || !username.trim()}
          style={{
            background: 'linear-gradient(180deg, #8b1528 0%, #c41e3a 50%, #8b1528 100%)',
            color: 'var(--color-gold-light)',
            fontSize: '20px',
            padding: '12px 48px',
            letterSpacing: '8px',
            fontFamily: 'var(--font-display)',
            border: '1px solid var(--color-gold)',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          入阵
        </button>
      </div>

      {!connected && (
        <p style={{
          color: 'var(--color-text-dim)', fontSize: '12px',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '2px',
        }}>
          正在连接中军大帐...
        </p>
      )}

      {/* 底部装饰 */}
      <div style={{
        width: '200px', height: '2px', marginTop: '12px',
        background: 'linear-gradient(90deg, transparent, var(--color-border-gold), transparent)',
        opacity: 0.5,
      }} />
    </div>
  );
}
