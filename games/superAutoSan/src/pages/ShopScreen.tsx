import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useShopStore } from '../store/shopStore';
import { GeneralCard } from '../components/GeneralCard';
import { ItemCard } from '../components/ItemCard';
import { TeamSlots } from '../components/TeamSlots';
import { StatsBar } from '../components/StatsBar';
import { XP_TO_LV2, XP_TO_LV3 } from '../data/types';
import type { GeneralInstance } from '../data/types';

function computeMergeMode(team: GeneralInstance[], defId: string): 'levelup' | 'merge' | null {
  const member = team.find((t) => t.defId === defId && t.level < 3);
  if (!member) return null;
  if (member.level === 1 && member.xp + 1 >= XP_TO_LV2) return 'levelup';
  if (member.level === 2 && member.xp + 1 >= XP_TO_LV3) return 'levelup';
  return 'merge';
}

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
    const result = shop.mergeTeamPets(team, fromIdx, toIdx);
    updateTeam(result.team);
    result.events.forEach((e) => showMessage(e));
  }, [shop, team, updateTeam, showMessage]);

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
    const effectiveCost = Math.max(0, item.cost - shop.itemDiscount);
    if (shop.gold < effectiveCost) { showMessage('金币不足！'); return; }

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

  const [sellDragOver, setSellDragOver] = useState(false);

  const sellZoneHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setSellDragOver(true); },
    onDragLeave: () => setSellDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const idx = e.dataTransfer.getData('text/plain');
      if (idx !== '') handleSell(Number(idx));
      setSellDragOver(false);
    },
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12, gap: 12 }}
      onClick={() => { if (pendingItem !== null) setPendingItem(null); }}
    >
      {/* Entire upper area is the sell drop zone */}
      <div
        {...sellZoneHandlers}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
          borderRadius: 'var(--border-radius)',
          border: sellDragOver ? '2px dashed #ff4444' : '2px dashed transparent',
          background: sellDragOver ? 'rgba(255,68,68,0.06)' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s',
          padding: sellDragOver ? 4 : 4,
          position: 'relative',
        }}
      >
        {/* Sell hint overlay */}
        {sellDragOver && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff4444',
            fontSize: 20,
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: 50,
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 'var(--border-radius)',
          }}>
            松开出售
          </div>
        )}

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
                  mergeMode={computeMergeMode(team, def.id)}
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
              升级奖励 — 选择一位武将（免费）
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
      </div>

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
          出战！
        </button>
      </div>
    </div>
  );
}

