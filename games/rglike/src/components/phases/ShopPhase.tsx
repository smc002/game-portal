import { useGameStore } from '../../store/gameStore';
import { ItemCard } from '../common/ItemCard';

export function ShopPhase() {
  const { shopItems, gold, purchaseItem, leaveShop, ownedItemIds } = useGameStore();

  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-2xl font-bold text-white text-center mb-2">商店</h2>
      <p className="text-yellow-400 text-center mb-6 font-bold">当前金币: {gold}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {shopItems.map((item) => (
          <ItemCard
            key={item.id}
            itemId={item.id}
            price={item.price}
            canAfford={gold >= item.price && !ownedItemIds.includes(item.id)}
            owned={ownedItemIds.includes(item.id)}
            onBuy={() => purchaseItem(item.id)}
          />
        ))}
      </div>
      <div className="text-center">
        <button
          className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
          onClick={leaveShop}
        >
          离开商店
        </button>
      </div>
    </div>
  );
}
