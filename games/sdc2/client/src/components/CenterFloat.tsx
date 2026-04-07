import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore.js';

export default function CenterFloat() {
  const centerFloats = useGameStore((s) => s.centerFloats);
  const removeCenterFloat = useGameStore((s) => s.removeCenterFloat);

  // 自动消失
  useEffect(() => {
    if (centerFloats.length === 0) return;
    const latest = centerFloats[centerFloats.length - 1];
    const timer = setTimeout(() => removeCenterFloat(latest.id), 2000);
    return () => clearTimeout(timer);
  }, [centerFloats, removeCenterFloat]);

  if (centerFloats.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '35%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9500,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {centerFloats.slice(-3).map((f) => (
        <div
          key={f.id}
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            fontFamily: 'var(--font-display)',
            color: f.color || '#f0c850',
            textShadow: '0 0 16px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)',
            letterSpacing: '4px',
            animation: 'centerFloatAnim 2s ease-out forwards',
            whiteSpace: 'nowrap',
          }}
        >
          {f.text}
        </div>
      ))}
      <style>{`
        @keyframes centerFloatAnim {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          15% { opacity: 1; transform: translateY(0) scale(1.1); }
          30% { transform: translateY(0) scale(1); }
          70% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-30px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
