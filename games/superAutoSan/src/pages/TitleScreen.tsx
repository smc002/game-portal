import { useGameStore } from '../store/gameStore';

export function TitleScreen() {
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 24,
    }}>
      <h1 style={{ fontSize: 48, color: 'var(--text-gold)', letterSpacing: 4 }}>
        超级自走三国
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
        Super Auto San
      </p>
      <button
        className="primary"
        style={{ fontSize: 20, padding: '12px 48px', marginTop: 24 }}
        onClick={startGame}
      >
        开始游戏
      </button>
    </div>
  );
}
