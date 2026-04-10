import { useGameStore } from '../store/gameStore';
import '../animations/effects.css';

export function TutorialScreen() {
  const setPhase = useGameStore((s) => s.setPhase);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px 20px',
      gap: 16,
      overflow: 'auto',
    }}>
      <h2 style={{ textAlign: 'center', color: 'var(--text-gold)', margin: 0, fontSize: 22 }}>
        新手指引
      </h2>

      {/* Mock StatsBar */}
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
          <span>关卡: <b style={{ color: 'var(--text-gold)' }}>1</b></span>
          <span>回合: <b>1</b></span>
          <span>Tier: <b>1</b></span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <HighlightBox color="var(--gold-color)" label="金币">
            <span style={{ color: 'var(--gold-color)' }}>10 金</span>
          </HighlightBox>
          <HighlightBox color="var(--hp-color)" label="生命">
            <span>{'♥'.repeat(5)}</span>
          </HighlightBox>
        </div>
      </div>

      {/* Rules */}
      <Section title="游戏目标">
        用金币招募武将编成队伍，自动战斗击败敌人。输了扣 1 条命，5 条命用完则游戏结束，看谁能撑过更多关卡。
      </Section>

      <Section title="商店阶段">
        每回合获得 <Gold>10 金币</Gold>。
        购买武将花费 <Gold>3 金</Gold>，出售武将获得 <Gold>1 金</Gold>（等级越高卖越多）。
        买入同名武将可自动合并升级，最高 Lv.3。
      </Section>

      <Section title="锁定商店">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, color: 'var(--text-secondary)' }}>
            点击卡牌右上角的 <FreezeIcon active={false} /> 可锁定该武将/道具，下回合刷新时它会被保留。
            再次点击 <FreezeIcon active /> 解除锁定。
          </div>
          <MockShopCard />
        </div>
      </Section>

      {/* Mock team area */}
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, marginBottom: -8 }}>
        你的队伍（最多 5 位）
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        <MockCard name="赵云" atk={3} hp={4} tier={2} level={1} />
        <MockCard name="关羽" atk={5} hp={3} tier={3} level={2} />
        <MockCard name="张飞" atk={2} hp={6} tier={1} level={1} />
        <MockEmpty />
        <MockEmpty />
      </div>

      <Section title="战斗规则">
        双方最前方武将同时互攻，攻击力即为伤害。
        阵亡后后方武将自动顶上，直到一方全灭。
        每位武将都有独特技能，会在特定时机自动触发。
      </Section>

      <Section title="小提示">
        <span style={{ color: 'var(--text-secondary)' }}>
          武将卡上 <span style={{ color: 'var(--atk-color)' }}>橙色数字</span> 是攻击力，
          <span style={{ color: 'var(--hp-color)' }}>红色数字</span> 是生命值。
          悬停卡片可查看技能说明（手机长按）。道具可以给武将加属性或装备锦囊。
        </span>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingBottom: 8 }}>
        <button
          className="primary"
          style={{ fontSize: 18, padding: '10px 48px' }}
          onClick={() => setPhase('shop')}
        >
          开始游戏
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: 'var(--text-gold)', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

function Gold({ children }: { children: React.ReactNode }) {
  return <b style={{ color: 'var(--gold-color)' }}>{children}</b>;
}

function HighlightBox({ color, label, children }: {
  color: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="tutorial-highlight"
      style={{ '--pulse-color': color } as React.CSSProperties}
    >
      {children}
      <span style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 10,
        color,
        whiteSpace: 'nowrap',
        fontWeight: 'bold',
        marginBottom: 2,
      }}>
        {label}
      </span>
    </span>
  );
}

const TIER_C: Record<number, string> = { 1: '#888', 2: '#4caf50', 3: '#2196f3' };

function MockCard({ name, atk, hp, tier, level }: {
  name: string; atk: number; hp: number; tier: number; level: number;
}) {
  const color = TIER_C[tier] ?? '#888';
  return (
    <div style={{
      width: 'var(--card-width)',
      height: 'var(--card-height)',
      background: 'var(--bg-card)',
      border: `2px solid ${color}`,
      borderRadius: 'var(--border-radius)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 4,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-gold)', alignSelf: 'flex-start' }}>
        {'★'.repeat(level)}
      </div>
      <div style={{
        width: 36, height: 36, background: color, borderRadius: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: '#fff', fontWeight: 'bold',
      }}>
        {name[0]}
      </div>
      <div style={{ fontSize: 10 }}>{name}</div>
      <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
        <span style={{ color: 'var(--atk-color)' }}>{atk}</span>
        <span style={{ color: 'var(--hp-color)' }}>{hp}</span>
      </div>
    </div>
  );
}

function FreezeIcon({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      fontSize: 12,
      color: active ? '#00bfff' : '#888',
      background: active ? 'rgba(0,191,255,0.15)' : 'rgba(255,255,255,0.08)',
      borderRadius: '50%',
      border: `1px solid ${active ? '#00bfff' : '#555'}`,
      verticalAlign: 'middle',
    }}>
      {active ? '❄' : '○'}
    </span>
  );
}

function MockShopCard() {
  return (
    <div style={{
      width: 'var(--card-width)',
      height: 'var(--card-height)',
      background: 'var(--bg-card)',
      border: '2px solid #888',
      borderRadius: 'var(--border-radius)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 4,
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Freeze button highlight */}
      <div
        className="tutorial-highlight"
        style={{
          '--pulse-color': '#00bfff',
          position: 'absolute',
          top: -2,
          right: -2,
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: '#888',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          border: '1px solid #555',
        } as React.CSSProperties}
      >
        ○
      </div>
      <div style={{ fontSize: 9, color: '#888', position: 'absolute', top: 2, left: 2 }}>T1</div>
      <div style={{
        width: 36, height: 36, background: '#888', borderRadius: 2, marginTop: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: '#fff', fontWeight: 'bold',
      }}>
        刺
      </div>
      <div style={{ fontSize: 10 }}>刺客</div>
      <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
        <span style={{ color: 'var(--atk-color)' }}>2</span>
        <span style={{ color: 'var(--hp-color)' }}>3</span>
      </div>
    </div>
  );
}

function MockEmpty() {
  return (
    <div style={{
      width: 'var(--card-width)',
      height: 'var(--card-height)',
      border: '2px dashed var(--slot-border)',
      borderRadius: 'var(--border-radius)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-secondary)',
      fontSize: 11,
    }}>
      空位
    </div>
  );
}
