import { useGameStore } from '../store/gameStore';
import { generals } from '../data/generals';

export function GameOverScreen() {
  const { wave, team, reset } = useGameStore();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 24,
    }}>
      <h1 style={{ fontSize: 36, color: 'var(--text-red)' }}>游戏结束</h1>

      <div style={{ fontSize: 48, color: 'var(--text-gold)' }}>
        第 {wave} 关
      </div>

      <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>最终阵容</div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {team.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)' }}>全军覆没</div>
        ) : (
          team.map((g) => {
            const def = generals.find((d) => d.id === g.defId);
            return (
              <div key={g.instanceId} style={{
                background: 'var(--bg-card)',
                border: '2px solid var(--slot-border)',
                borderRadius: 'var(--border-radius)',
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 80,
              }}>
                <div style={{ fontSize: 14 }}>{def?.name ?? g.defId}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Lv.{g.level}</div>
                <div style={{ fontSize: 12 }}>
                  <span className="atk">{g.atk}</span> / <span className="hp">{g.hp}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        className="primary"
        style={{ fontSize: 18, padding: '10px 40px', marginTop: 16 }}
        onClick={() => reset()}
      >
        再来一局
      </button>
    </div>
  );
}
