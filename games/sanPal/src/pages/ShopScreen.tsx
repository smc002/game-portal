import { useGameStore } from '../store/gameStore';
import { ITEMS } from '../data/items';


export default function ShopScreen() {
  const { mapNodes, currentNodeId, inventory, addItem, addGold, setPhase } = useGameStore();

  const node = mapNodes.find((n) => n.id === currentNodeId);
  const shopData = node?.data as { type: 'shop'; items: { itemId: string; price: number }[] } | undefined;
  const shopItems = shopData?.items ?? [];

  function buy(itemId: string, price: number) {
    if (inventory.gold < price) return;
    addGold(-price);
    addItem(itemId);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--color-gold)',
        textAlign: 'center', margin: '16px 0',
      }}>
        商铺
      </h2>
      <div style={{ fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
        铜钱：<span style={{ color: 'var(--color-gold)' }}>{inventory.gold}</span>
      </div>

      <div className="scroll-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shopItems.map(({ itemId, price }) => {
          const item = ITEMS[itemId];
          if (!item) return null;
          const owned = inventory.items.find((i) => i.itemId === itemId)?.count ?? 0;
          return (
            <div key={itemId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: 'var(--color-bg-card)',
              borderRadius: 8, border: '1px solid var(--color-border)',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 'bold' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 2 }}>
                  {item.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>
                  已有：{owned}
                </div>
              </div>
              <button
                disabled={inventory.gold < price}
                onClick={() => buy(itemId, price)}
                style={{ minWidth: 72, textAlign: 'center' }}
              >
                {price} 💰
              </button>
            </div>
          );
        })}
      </div>

      <button className="primary" onClick={() => setPhase('map')} style={{ marginTop: 16, fontSize: 16 }}>
        离开商铺
      </button>
    </div>
  );
}
