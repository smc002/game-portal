import { useGameStore } from '../store/gameStore';
import { clampHP } from '../engine/helpers';

interface EventChoice {
  label: string;
  effect: () => void;
  description: string;
}

const EVENT_DEFS: Record<string, { title: string; description: string; getChoices: (store: ReturnType<typeof useGameStore.getState>) => EventChoice[] }> = {
  gift: {
    title: '路遇贵人',
    description: '一位老翁拦住去路，手捧一个包裹。',
    getChoices: (s) => [
      {
        label: '接受赠礼', description: '获得 60 铜钱',
        effect: () => { s.addGold(60); s.setPhase('map'); },
      },
      {
        label: '婉言谢绝', description: '全队恢复 20% HP',
        effect: () => {
          s.setParty(s.party.map((g) => ({ ...g, currentHP: clampHP(g, g.currentHP + Math.floor(g.maxHP * 0.2)) })));
          s.setPhase('map');
        },
      },
    ],
  },
  trap: {
    title: '埋伏！',
    description: '前方道路上发现了可疑的痕迹...',
    getChoices: (s) => [
      {
        label: '小心绕行', description: '无事发生',
        effect: () => { s.setPhase('map'); },
      },
      {
        label: '直接冲过', description: '50%概率获得宝物，50%全队受伤',
        effect: () => {
          if (Math.random() < 0.5) {
            s.addItem('jinnang');
            s.setPhase('map');
          } else {
            s.setParty(s.party.map((g) => ({ ...g, currentHP: clampHP(g, g.currentHP - Math.floor(g.maxHP * 0.15)) })));
            s.setPhase('map');
          }
        },
      },
    ],
  },
  shrine: {
    title: '古祠祈福',
    description: '发现一座供奉先贤的古祠。',
    getChoices: (s) => [
      {
        label: '虔诚祈福', description: '全队恢复 30% HP',
        effect: () => {
          s.setParty(s.party.map((g) => ({ ...g, currentHP: clampHP(g, g.currentHP + Math.floor(g.maxHP * 0.3)) })));
          s.setPhase('map');
        },
      },
      {
        label: '搜刮供品', description: '获得 80 铜钱，但先锋 HP -20%',
        effect: () => {
          s.addGold(80);
          if (s.party[0]) {
            const g = s.party[0];
            const dmg = Math.floor(g.maxHP * 0.2);
            s.updateGeneral(0, { currentHP: clampHP(g, g.currentHP - dmg) });
          }
          s.setPhase('map');
        },
      },
    ],
  },
  merchant: {
    title: '流浪商人',
    description: '一位神秘商人向你展示了稀有物品。',
    getChoices: (s) => [
      {
        label: '购买玉玺（150铜钱）', description: '必定捕获道具',
        effect: () => {
          if (s.inventory.gold >= 150) {
            s.addGold(-150);
            s.addItem('yuxi');
          }
          s.setPhase('map');
        },
      },
      {
        label: '不感兴趣', description: '继续前进',
        effect: () => { s.setPhase('map'); },
      },
    ],
  },
};

export default function EventScreen() {
  const gameStore = useGameStore();
  const { mapNodes, currentNodeId } = gameStore;

  const node = mapNodes.find((n) => n.id === currentNodeId);
  const eventData = node?.data as { type: 'event'; eventId: string } | undefined;
  const eventId = eventData?.eventId ?? 'gift';
  const evt = EVENT_DEFS[eventId] ?? EVENT_DEFS.gift!;
  const choices = evt.getChoices(useGameStore.getState());

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 24, gap: 20,
    }}>
      <div style={{ fontSize: 48 }}>📜</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--color-gold)' }}>
        {evt.title}
      </h2>
      <p style={{ color: 'var(--color-text-dim)', fontSize: 14, textAlign: 'center' }}>
        {evt.description}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 12 }}>
        {choices.map((c, i) => (
          <button key={i} onClick={c.effect} style={{ padding: 16, textAlign: 'left' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{c.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
