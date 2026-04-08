import { useGameStore } from '../store/gameStore';

export default function ResultScreen() {
  const { won, setPhase } = useGameStore();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 32, gap: 24,
    }}>
      <div style={{ fontSize: 64 }}>
        {won ? '🏆' : '💀'}
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 36,
        color: won ? 'var(--color-gold)' : 'var(--color-hp-low)',
      }}>
        {won ? '天下一统！' : '壮志未酬...'}
      </h1>
      <p style={{ color: 'var(--color-text-dim)', fontSize: 14, textAlign: 'center' }}>
        {won
          ? '你击败了所有对手，统一了三国！'
          : '你的武将全部阵亡，征途在此画上了句号。'}
      </p>
      <button
        className="primary"
        onClick={() => setPhase('title')}
        style={{ fontSize: 18, padding: '14px 48px', marginTop: 16 }}
      >
        再来一局
      </button>
    </div>
  );
}
