import { useGameStore } from '../store/gameStore';
import { useShopStore } from '../store/shopStore';

export function StatsBar() {
  const { wave, turn, lives, tierUnlocked } = useGameStore();
  const gold = useShopStore((s) => s.gold);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 12px',
      background: 'var(--bg-medium)',
      borderRadius: 'var(--border-radius)',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <span>关卡: <b style={{ color: 'var(--text-gold)' }}>{wave}</b></span>
        <span>回合: <b>{turn}</b></span>
        <span>Tier: <b>{tierUnlocked}</b></span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <span className="gold">
          {gold} 金
        </span>
        <span>
          {'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, 5 - lives))}
        </span>
      </div>
    </div>
  );
}
