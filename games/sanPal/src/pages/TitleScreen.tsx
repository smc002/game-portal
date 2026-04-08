import { useGameStore } from '../store/gameStore';

export default function TitleScreen() {
  const resetRun = useGameStore((s) => s.resetRun);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 32, padding: 24,
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--color-gold)',
        textShadow: '0 2px 8px rgba(212,160,23,0.4)',
      }}>
        三国宝可梦尖塔
      </h1>
      <p style={{ color: 'var(--color-text-dim)', fontSize: 14, textAlign: 'center' }}>
        捕获武将，策略对战，征服乱世
      </p>
      <button className="primary" onClick={resetRun} style={{ fontSize: 18, padding: '14px 48px' }}>
        开始冒险
      </button>
    </div>
  );
}
