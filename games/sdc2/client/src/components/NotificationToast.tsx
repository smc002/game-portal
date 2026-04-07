import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore.js';

const TYPE_COLORS: Record<string, string> = {
  error: '#c41e3a',
  warning: '#d4a017',
  success: '#4a9e5a',
  info: '#5b8abf',
};

const TYPE_BORDERS: Record<string, string> = {
  error: '#8b1528',
  warning: '#8b6914',
  success: '#2a5c2a',
  info: '#2a4a6a',
};

export default function NotificationToast() {
  const notifications = useGameStore((s) => s.notifications);
  const clearNotification = useGameStore((s) => s.clearNotification);

  // 自动消失
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[notifications.length - 1];
    const timer = setTimeout(() => clearNotification(latest.id), 3000);
    return () => clearTimeout(timer);
  }, [notifications, clearNotification]);

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '40px',
      right: '16px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      maxWidth: '320px',
    }}>
      {notifications.slice(-5).map((n) => (
        <div
          key={n.id}
          onClick={() => clearNotification(n.id)}
          style={{
            padding: '8px 14px',
            background: 'var(--color-bg-panel)',
            border: `1px solid ${TYPE_BORDERS[n.type] || TYPE_BORDERS.info}`,
            borderLeft: `3px solid ${TYPE_COLORS[n.type] || TYPE_COLORS.info}`,
            color: 'var(--color-text)',
            fontSize: '13px',
            cursor: 'pointer',
            animation: 'fadeIn 0.2s ease-out',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {n.message}
        </div>
      ))}
    </div>
  );
}
