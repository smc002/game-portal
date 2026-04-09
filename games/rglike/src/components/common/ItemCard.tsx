import { getItemDefinition } from '../../data/items';

const CATEGORY_COLORS: Record<string, string> = {
  attack: '#ef4444',
  defense: '#3b82f6',
  support: '#22c55e',
  special: '#f59e0b',
  control: '#ec4899',
};

const CATEGORY_NAMES: Record<string, string> = {
  attack: '攻击',
  defense: '防御',
  support: '辅助',
  special: '特殊',
  control: '控制',
};

interface ItemCardProps {
  itemId: string;
  price?: number;
  onBuy?: () => void;
  canAfford?: boolean;
  owned?: boolean;
}

export function ItemCard({ itemId, price, onBuy, canAfford = true, owned }: ItemCardProps) {
  const def = getItemDefinition(itemId);
  const catColor = CATEGORY_COLORS[def.category] || '#6b7280';

  return (
    <div className={`rounded-lg border border-gray-600 p-3 ${owned ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-white">{def.name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: catColor, color: 'white' }}>
          {CATEGORY_NAMES[def.category]}
        </span>
      </div>
      {def.boundHeroId && (
        <p className="text-xs text-purple-400 mb-1">专属武将物品</p>
      )}
      <p className="text-sm text-gray-300 mb-1">{def.description}</p>
      <p className="text-sm text-yellow-300 mb-2">{def.effectDescription}</p>
      {price !== undefined && !owned && (
        <button
          className={`w-full py-1.5 rounded text-sm font-bold transition-colors ${
            canAfford
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          onClick={canAfford ? onBuy : undefined}
          disabled={!canAfford}
        >
          {canAfford ? `购买 ${price} 金` : `金币不足 (${price})`}
        </button>
      )}
      {owned && (
        <div className="text-center text-green-400 text-sm font-bold">已拥有</div>
      )}
    </div>
  );
}
