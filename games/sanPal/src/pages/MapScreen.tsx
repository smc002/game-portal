import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { getGeneralDef } from '../data/generals';
import { NODE_EMOJI, NODE_LABEL, MAX_ENERGY } from '../data/types';
import type { MapNode, NodeData } from '../data/types';
import { createInstance, randomInt } from '../engine/helpers';

function restorePartyEnergy(p: ReturnType<typeof useGameStore.getState>['party']) {
  return p.map(g => ({ ...g, energy: MAX_ENERGY }));
}

export default function MapScreen() {
  const { mapNodes, currentNodeId, party, act, inventory, setPhase, setCurrentNode, visitNode } = useGameStore();
  const initBattle = useBattleStore((s) => s.initBattle);

  const currentNode = mapNodes.find((n) => n.id === currentNodeId);
  const reachable = currentNode?.connections ?? [];

  // Group nodes by layer
  const layers = new Map<number, MapNode[]>();
  for (const node of mapNodes) {
    const arr = layers.get(node.layer) ?? [];
    arr.push(node);
    layers.set(node.layer, arr);
  }
  const sortedLayers = [...layers.entries()].sort((a, b) => b[0] - a[0]);

  function handleNodeClick(node: MapNode) {
    if (!reachable.includes(node.id)) return;
    visitNode(node.id);
    setCurrentNode(node.id);

    const data = node.data as NodeData;
    switch (data.type) {
      case 'spawn':
        break;
      case 'wild': {
        const level = data.level ?? (1 + act * 2 + randomInt(0, 2));
        const enemy = createInstance(data.generalId, level);
        initBattle(restorePartyEnergy(party), [enemy]);
        setPhase('battle');
        break;
      }
      case 'elite': {
        const enemies = data.generalIds.map((id) =>
          createInstance(id, 2 + act * 3),
        );
        initBattle(restorePartyEnergy(party), enemies);
        setPhase('battle');
        break;
      }
      case 'boss': {
        const bossInst = createInstance(data.generalId, act * 3 + 1);
        const escorts = data.escorts.map((id) => createInstance(id, act * 3));
        initBattle(restorePartyEnergy(party), [bossInst, ...escorts]);
        setPhase('battle');
        break;
      }
      case 'shop':
        setPhase('shop');
        break;
      case 'rest':
        setPhase('rest');
        break;
      case 'event':
        setPhase('event');
        break;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)', fontSize: 13,
      }}>
        <span>第{act}幕</span>
        <span>铜钱：{inventory.gold}</span>
        <span
          onClick={() => setPhase('team')}
          style={{ color: 'var(--color-gold)', cursor: 'pointer' }}
        >
          队伍 ({party.length}/4)
        </span>
      </div>

      {/* Map */}
      <div className="scroll-area" style={{ flex: 1, padding: '16px 8px' }}>
        {sortedLayers.map(([layer, nodes]) => (
          <div key={layer} style={{
            display: 'flex', justifyContent: 'center', gap: 12,
            marginBottom: 24, position: 'relative',
          }}>
            {nodes.map((node) => {
              const isReachable = reachable.includes(node.id);
              const isCurrent = node.id === currentNodeId;
              return (
                <div
                  key={node.id}
                  className={isCurrent ? 'node-current' : isReachable ? 'node-reachable' : ''}
                  onClick={() => isReachable ? handleNodeClick(node) : undefined}
                  style={{
                    width: 76, height: isCurrent ? 88 : 76, borderRadius: 12,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2,
                    border: `${isReachable ? 3 : 2}px solid ${isCurrent ? 'var(--color-gold)' : isReachable ? 'var(--color-primary)' : node.visited ? 'var(--color-border)' : 'var(--color-border-light)'}`,
                    background: isCurrent ? 'var(--color-bg-card)' : isReachable ? 'var(--color-bg-panel)' : node.visited ? 'var(--color-bg)' : 'var(--color-bg-panel)',
                    opacity: node.visited && !isCurrent && !isReachable ? 0.4 : 1,
                    cursor: isReachable ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{NODE_EMOJI[node.type]}</span>
                  <span style={{ fontSize: 10, color: isCurrent ? 'var(--color-gold)' : isReachable ? 'var(--color-text-bright)' : 'var(--color-text-dim)' }}>
                    {NODE_LABEL[node.type]}
                  </span>
                  {isCurrent && <span style={{ fontSize: 8, color: 'var(--color-gold)', fontWeight: 'bold' }}>当前位置</span>}
                  {isReachable && <span style={{ fontSize: 8, color: 'var(--color-primary)' }}>可前往</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Party bar */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 12px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg-panel)',
      }}>
        {party.map((g, i) => {
          const def = getGeneralDef(g.defId);
          const hpPct = g.maxHP > 0 ? g.currentHP / g.maxHP : 0;
          return (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: '4px 0',
              borderRadius: 6, background: 'var(--color-bg-card)',
            }}>
              <div style={{ fontSize: 14 }}>{def.name}</div>
              <div style={{
                height: 4, margin: '4px 8px 0', borderRadius: 2,
                background: 'var(--color-border)',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${hpPct * 100}%`,
                  background: hpPct > 0.5 ? 'var(--color-hp)' : 'var(--color-hp-low)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
