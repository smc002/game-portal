import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useShopStore } from '../store/shopStore';
import { GeneralCard } from '../components/GeneralCard';
import { ItemCard } from '../components/ItemCard';
import { TeamSlots } from '../components/TeamSlots';
import { StatsBar } from '../components/StatsBar';
import { generals } from '../data/generals';
import { items as allItems } from '../data/items';

export function ShopScreen() {
  const { team, updateTeam, tierUnlocked, setPhase } = useGameStore();
  const shop = useShopStore();
  const [message, setMessage] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  // Item targeting mode: when set, clicking a team slot uses the item on that target
  const [pendingItem, setPendingItem] = useState<number | null>(null);

  useEffect(() => {
    if (!initialized) {
      shop.resetTurn(tierUnlocked, team);
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  const handleRoll = useCallback(() => {
    if (!shop.freeRoll && shop.gold < 1) {
      showMessage('金币不足！');
      return;
    }
    shop.rollShop(tierUnlocked);
  }, [shop, tierUnlocked, showMessage]);

  const handleBuyPet = useCallback((slotIdx: number, teamIdx: number) => {
    const result = shop.buyPet(slotIdx, team, teamIdx);
    if (result) {
      updateTeam(result.team);
      result.events.forEach((e) => showMessage(e));
    } else {
      showMessage('无法购买！');
    }
  }, [shop, team, updateTeam, showMessage]);

  const handleBuyReward = useCallback((rewardIdx: number) => {
    const mergeIdx = shop.levelUpReward?.[rewardIdx]
      ? team.findIndex((t) => t.defId === shop.levelUpReward![rewardIdx]!.id)
      : -1;
    const teamIdx = mergeIdx >= 0 ? mergeIdx : team.length;
    const result = shop.buyRewardPet(rewardIdx, team, teamIdx);
    if (result) {
      updateTeam(result.team);
      result.events.forEach((e) => showMessage(e));
    } else {
      showMessage('队伍已满！');
    }
  }, [shop, team, updateTeam, showMessage]);

  const handleBuyItem = useCallback((slotIdx: number, targetIdx: number) => {
    const result = shop.buyItem(slotIdx, team, targetIdx);
    if (result) {
      updateTeam(result.team);
      result.events.forEach((e) => showMessage(e));
      setPendingItem(null);
    } else {
      showMessage('无法使用！');
    }
  }, [shop, team, updateTeam, showMessage]);

  const handleSell = useCallback((idx: number) => {
    const result = shop.sellPet(team, idx);
    updateTeam(result.team);
    result.events.forEach((e) => showMessage(e));
  }, [shop, team, updateTeam, showMessage]);

  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    const newTeam = [...team];
    const [moved] = newTeam.splice(fromIdx, 1);
    if (moved) newTeam.splice(toIdx, 0, moved);
    updateTeam(newTeam);
  }, [team, updateTeam]);

  const handleMerge = useCallback((fromIdx: number, toIdx: number) => {
    const source = team[fromIdx];
    const target = team[toIdx];
    if (!source || !target || source.defId !== target.defId || fromIdx === toIdx) return;

    const newTeam = [...team];
    const t = { ...target };
    t.atk = Math.min(50, Math.max(t.atk, source.atk) + 1);
    t.hp = Math.min(50, Math.max(t.hp, source.hp) + 1);
    t.maxHp = Math.min(50, Math.max(t.maxHp, source.maxHp) + 1);
    t.xp += 1;
    if (t.level === 1 && t.xp >= 2) { t.level = 2; showMessage(`${getGeneralName(t.defId)} 升级到 Lv.2！`); }
    else if (t.level === 2 && t.xp >= 5) { t.level = 3; showMessage(`${getGeneralName(t.defId)} 升级到 Lv.3！`); }
    newTeam[toIdx] = t;
    newTeam.splice(fromIdx, 1);
    updateTeam(newTeam);
  }, [team, updateTeam, showMessage]);

  const handleFight = useCallback(() => {
    // Execute end-of-turn triggers before battle
    const endResult = shop.executeEndOfTurn(team, tierUnlocked);
    if (endResult.events.length > 0) {
      updateTeam(endResult.team);
      endResult.events.forEach((e) => showMessage(e));
    }
    setInitialized(false);
    setPendingItem(null);
    setPhase('battle');
  }, [setPhase, shop, team, tierUnlocked, updateTeam, showMessage]);

  // Click on item: enter target selection mode (or apply immediately for special items)
  const handleItemClick = useCallback((slotIdx: number) => {
    const item = shop.itemSlots[slotIdx];
    if (!item) return;
    if (shop.gold < item.cost) { showMessage('金币不足！'); return; }

    // Special items that don't need a target (bingshu = canned food)
    if (item.type === 'special' && item.id === 'bingshu') {
      handleBuyItem(slotIdx, 0);
      return;
    }

    if (team.length === 0) {
      showMessage('队伍为空！');
      return;
    }

    // Enter target selection mode
    setPendingItem(slotIdx);
    showMessage(`选择要使用 ${item.name} 的武将`);
  }, [shop, team, handleBuyItem, showMessage]);

  // When in target mode, clicking a team slot applies the item
  const handleTeamClickForItem = useCallback((idx: number) => {
    if (pendingItem === null) return;
    handleBuyItem(pendingItem, idx);
  }, [pendingItem, handleBuyItem]);

  const pendingItemDef = pendingItem !== null ? shop.itemSlots[pendingItem] : null;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12, gap: 12 }}
      onClick={() => { if (pendingItem !== null) setPendingItem(null); }}
    >
      <StatsBar />

      {/* Message */}
      {message && (
        <div style={{
          textAlign: 'center',
          color: pendingItem !== null ? '#00e5ff' : 'var(--text-gold)',
          fontSize: 14,
          minHeight: 20,
        }}>
          {message}
        </div>
      )}

      {/* Shop - Pets */}
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
        商店 - 武将 (Tier {tierUnlocked})
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {shop.petSlots.map((def, i) => (
          <div key={i} style={{ position: 'relative' }}>
            {def ? (
              <GeneralCard
                def={def}
                frozen={shop.frozenPets.has(i)}
                onClick={(e) => {
                  e?.stopPropagation();
                  setPendingItem(null);
                  const mergeIdx = team.findIndex((t) => t.defId === def.id);
                  if (mergeIdx >= 0) {
                    handleBuyPet(i, mergeIdx);
                  } else if (team.length < 5) {
                    handleBuyPet(i, team.length);
                  } else {
                    showMessage('队伍已满！');
                  }
                }}
                onFreeze={() => shop.toggleFreezePet(i)}
              />
            ) : (
              <div style={{
                width: 'var(--card-width)',
                height: 'var(--card-height)',
                border: '2px dashed var(--slot-border)',
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: 12,
              }}>
                已售
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Shop - Items */}
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
        商店 - 道具
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {shop.itemSlots.map((item, i) => (
          <div key={i}>
            {item ? (
              <ItemCard
                def={item}
                frozen={shop.frozenItems.has(i)}
                selected={pendingItem === i}
                onClick={(e) => {
                  e?.stopPropagation();
                  handleItemClick(i);
                }}
                onFreeze={() => shop.toggleFreezeItem(i)}
              />
            ) : (
              <div style={{
                width: 'var(--card-width)',
                height: 'var(--card-height)',
                border: '2px dashed var(--slot-border)',
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: 12,
              }}>
                已售
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Level-up reward picks */}
      {shop.levelUpReward && shop.levelUpReward.length > 0 && (
        <>
          <div style={{ textAlign: 'center', color: '#00e5ff', fontSize: 12, fontWeight: 'bold' }}>
            🎉 升级奖励 — 选择一位武将（免费）
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {shop.levelUpReward.map((def, i) => (
              <GeneralCard
                key={`reward-${i}`}
                def={def}
                onClick={(e) => {
                  e?.stopPropagation();
                  handleBuyReward(i);
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Roll button */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button onClick={(e) => { e.stopPropagation(); handleRoll(); }}>
          {shop.freeRoll ? '刷新 (免费)' : `刷新 (${1} 金)`}
        </button>
      </div>

      {/* Sell drop zone - between shop and team */}
      <SellZone onSell={handleSell} />

      {/* Team */}
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
        我的队伍 (拖拽排序 | {pendingItem !== null ? '点击使用道具' : '右键或拖到上方出售'})
      </div>
      <TeamSlots
        team={team}
        onReorder={handleReorder}
        onSell={handleSell}
        onMerge={handleMerge}
        onSlotClick={pendingItem !== null ? handleTeamClickForItem : undefined}
        highlightSlots={pendingItem !== null}
        pendingItemName={pendingItemDef?.name}
      />

      {/* Fight button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingBottom: 8 }}>
        <button
          className="primary"
          style={{ fontSize: 18, padding: '10px 40px' }}
          onClick={handleFight}
        >
          出战！ ⚔️
        </button>
      </div>
    </div>
  );
}

function SellZone({ onSell }: { onSell: (idx: number) => void }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const idx = e.dataTransfer.getData('text/plain');
        if (idx !== '') {
          onSell(Number(idx));
        }
        setDragOver(false);
      }}
      style={{
        textAlign: 'center',
        padding: '8px 0',
        border: `2px dashed ${dragOver ? '#ff4444' : 'transparent'}`,
        borderRadius: 'var(--border-radius)',
        color: dragOver ? '#ff4444' : 'var(--text-secondary)',
        fontSize: 12,
        transition: 'all 0.15s',
        background: dragOver ? 'rgba(255,68,68,0.1)' : 'transparent',
        minHeight: 32,
      }}
    >
      {dragOver ? '松开出售' : ''}
    </div>
  );
}

function getGeneralName(defId: string): string {
  return generals.find((g) => g.id === defId)?.name ?? defId;
}
