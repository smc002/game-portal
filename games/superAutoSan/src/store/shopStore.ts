import { create } from 'zustand';
import type { GeneralDef, ItemDef, GeneralInstance } from '../data/types';
import { GOLD_PER_TURN, PET_COST, ROLL_COST, SHOP_SLOTS, MAX_TEAM_SIZE, MAX_STAT, XP_TO_LV2, XP_TO_LV3 } from '../data/types';
import { generals } from '../data/generals';
import { items } from '../data/items';

interface ShopState {
  gold: number;
  petSlots: (GeneralDef | null)[];
  itemSlots: (ItemDef | null)[];
  frozenPets: Set<number>;
  frozenItems: Set<number>;
  freeRoll: boolean;
  cannedFoodBonus: { atk: number; hp: number };
  itemDiscount: number; // from 糜夫人
  lastBattleLost: boolean;
  // Level-up reward: when a pet levels to 2, offer a pick from next tier
  levelUpReward: GeneralDef[] | null;

  initShop: (tier: number) => void;
  rollShop: (tier: number) => void;
  buyPet: (slotIdx: number, team: GeneralInstance[], teamIdx: number) => { team: GeneralInstance[]; events: string[] } | null;
  buyItem: (slotIdx: number, team: GeneralInstance[], targetIdx: number) => { team: GeneralInstance[]; events: string[] } | null;
  sellPet: (team: GeneralInstance[], idx: number) => { team: GeneralInstance[]; gold: number; events: string[] };
  toggleFreezePet: (idx: number) => void;
  toggleFreezeItem: (idx: number) => void;
  spendGold: (amount: number) => boolean;
  resetTurn: (tier: number, team?: GeneralInstance[]) => void;
  setLastBattleLost: (lost: boolean) => void;
  clearLevelUpReward: () => void;
  buyRewardPet: (rewardIdx: number, team: GeneralInstance[], teamIdx: number) => { team: GeneralInstance[]; events: string[] } | null;
  mergeTeamPets: (team: GeneralInstance[], fromIdx: number, toIdx: number) => { team: GeneralInstance[]; events: string[] };
  executeEndOfTurn: (team: GeneralInstance[], tier: number) => { team: GeneralInstance[]; events: string[] };
}

function randomPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getAvailableGenerals(tier: number): GeneralDef[] {
  return generals.filter((g) => g.tier <= tier);
}

function getAvailableItems(tier: number): ItemDef[] {
  return items.filter((i) => i.tier <= tier);
}

function getShopSize(tier: number): { pets: number; items: number } {
  return SHOP_SLOTS[tier] ?? SHOP_SLOTS[6]!;
}

let instanceCounter = 0;
export function createInstance(def: GeneralDef, bonusAtk = 0, bonusHp = 0): GeneralInstance {
  return {
    defId: def.id,
    instanceId: `inst_${++instanceCounter}_${Date.now()}`,
    atk: Math.min(MAX_STAT, def.baseAtk + bonusAtk),
    hp: Math.min(MAX_STAT, def.baseHp + bonusHp),
    maxHp: Math.min(MAX_STAT, def.baseHp + bonusHp),
    level: 1,
    xp: 0,
    perk: null,
    tempAtk: 0,
    tempHp: 0,
  };
}

// ========== Shop Trigger System ==========

function executeShopTrigger(
  trigger: string,
  team: GeneralInstance[],
  events: string[],
  context: {
    gold: number;
    petSlots: (GeneralDef | null)[];
    itemSlots: (ItemDef | null)[];
    tier: number;
    targetIdx?: number; // for friendEatsFood/eatsFood
    cannedFoodBonus: { atk: number; hp: number };
    extraItems?: ItemDef[];
  }
): { goldDelta: number; petSlotChanges?: (GeneralDef | null)[]; itemSlotChanges?: (ItemDef | null)[]; itemDiscount?: number; extraItems?: ItemDef[] } {
  let goldDelta = 0;
  let petSlotChanges: (GeneralDef | null)[] | undefined;
  let itemSlotChanges: (ItemDef | null)[] | undefined;
  let itemDiscount: number | undefined;

  for (let i = 0; i < team.length; i++) {
    const g = team[i]!;
    const def = generals.find((d) => d.id === g.defId);
    if (!def || def.trigger !== trigger) continue;
    const lvl = g.level;

    switch (def.id) {
      // === startOfTurn ===
      case 'zhenji': { // Swan: +1*level gold
        goldDelta += 1 * lvl;
        events.push(`${def.name}: 洛神赋 +${lvl} 金币`);
        break;
      }
      case 'xujing': { // Worm: stock a 2-gold mantou in item shop
        const discountMantou: ItemDef = { ...items.find((ii) => ii.id === 'mantou')!, cost: 2 };
        // We can't directly set here since this runs outside the store,
        // so we flag it via context. The caller will handle adding to item slots.
        context.extraItems = context.extraItems ?? [];
        context.extraItems.push(discountMantou);
        events.push(`${def.name}: 举荐 商店补充2金馒头`);
        break;
      }
      case 'mifuren': { // Squirrel: shop items -1 gold
        itemDiscount = 1 * lvl;
        events.push(`${def.name}: 持家有道 道具 -${lvl} 金`);
        break;
      }

      // === endOfTurn ===
      case 'xunyu': { // Giraffe: friend ahead +1*level/+1*level
        const count = Math.min(lvl, i); // up to level friends ahead
        for (let j = 1; j <= count; j++) {
          const target = team[i - j];
          if (target) {
            target.atk = Math.min(MAX_STAT, target.atk + 1);
            target.hp = Math.min(MAX_STAT, target.hp + 1);
            target.maxHp = Math.min(MAX_STAT, target.maxHp + 1);
          }
        }
        if (count > 0) events.push(`${def.name}: 居中持重 前方${count}个友方 +1/+1`);
        break;
      }
      case 'machao': { // Bison: if have Lv3 friend, +2*level/+2*level
        const hasLv3 = team.some((t, idx) => idx !== i && t.level === 3);
        if (hasLv3) {
          g.atk = Math.min(MAX_STAT, g.atk + 2 * lvl);
          g.hp = Math.min(MAX_STAT, g.hp + 2 * lvl);
          g.maxHp = Math.min(MAX_STAT, g.maxHp + 2 * lvl);
          events.push(`${def.name}: 锦马超 +${2*lvl}/${2*lvl}`);
        }
        break;
      }
      case 'simayi': { // Parrot: copy ability from pet ahead (just stat copy simplified)
        if (i > 0) {
          const ahead = team[i - 1]!;
          events.push(`${def.name}: 鹰视狼顾 复制${generals.find(d => d.id === ahead.defId)?.name ?? ''}能力`);
        }
        break;
      }
      case 'lusu': { // Penguin: 2*level Lv2+ friends +1/+1
        const targets = team.filter((t, idx) => idx !== i && t.level >= 2);
        const count = Math.min(2 * lvl, targets.length);
        for (let j = 0; j < count; j++) {
          const t = targets[j]!;
          t.atk = Math.min(MAX_STAT, t.atk + 1);
          t.hp = Math.min(MAX_STAT, t.hp + 1);
          t.maxHp = Math.min(MAX_STAT, t.maxHp + 1);
        }
        if (count > 0) events.push(`${def.name}: 联盟之谊 ${count}个Lv2+友方 +1/+1`);
        break;
      }
      case 'pangde': { // Monkey: rightmost friend +2*level/+3*level
        // Rightmost = index 0 (front). Find the actual rightmost alive friend
        const rightmost = team[0];
        if (rightmost && rightmost !== g) {
          rightmost.atk = Math.min(MAX_STAT, rightmost.atk + 2 * lvl);
          rightmost.hp = Math.min(MAX_STAT, rightmost.hp + 3 * lvl);
          rightmost.maxHp = Math.min(MAX_STAT, rightmost.maxHp + 3 * lvl);
          events.push(`${def.name}: 抬棺决死 ${generals.find(d => d.id === rightmost.defId)?.name} +${2*lvl}/${3*lvl}`);
        }
        break;
      }

      // === friendEatsFood ===
      case 'huatuo': { // Rabbit: friend who ate food +1*level HP
        if (context.targetIdx !== undefined && context.targetIdx !== i) {
          const target = team[context.targetIdx];
          if (target) {
            target.hp = Math.min(MAX_STAT, target.hp + 1 * lvl);
            target.maxHp = Math.min(MAX_STAT, target.maxHp + 1 * lvl);
            events.push(`${def.name}: 妙手回春 +${lvl} HP`);
          }
        }
        break;
      }
      case 'zhugeliang': { // Dragon: all friends +1*level/+1*level (3x per turn)
        // Simplified: trigger once per food use
        for (const t of team) {
          if (t !== g) {
            t.atk = Math.min(MAX_STAT, t.atk + 1 * lvl);
            t.hp = Math.min(MAX_STAT, t.hp + 1 * lvl);
            t.maxHp = Math.min(MAX_STAT, t.maxHp + 1 * lvl);
          }
        }
        events.push(`${def.name}: 锦囊妙计 所有友方 +${lvl}/${lvl}`);
        break;
      }

      // === eatsFood (self) ===
      case 'zhugejin': { // Seal: 2*level random friends +1/+1
        const others = team.filter((_t, idx) => idx !== i);
        const picks = randomPick(others, 2 * lvl);
        for (const t of picks) {
          t.atk = Math.min(MAX_STAT, t.atk + 1);
          t.hp = Math.min(MAX_STAT, t.hp + 1);
          t.maxHp = Math.min(MAX_STAT, t.maxHp + 1);
        }
        if (picks.length > 0) events.push(`${def.name}: 斡旋 ${picks.length}个友方 +1/+1`);
        break;
      }
    }
  }

  return { goldDelta, petSlotChanges, itemSlotChanges, itemDiscount, extraItems: context.extraItems };
}

/**
 * When a pet levels to Lv2, offer 2 bonus shop pet slots from the next tier.
 * Player can buy one; the other is removed when they buy, roll, or fight.
 */
function offerLevelUpReward(
  currentTier: number,
  _state: ShopState,
  events: string[],
  set: (partial: Partial<ShopState> | ((s: ShopState) => Partial<ShopState>)) => void
) {
  const nextTier = Math.min(6, currentTier + 1);
  const nextTierPets = generals.filter((g) => g.tier === nextTier);
  if (nextTierPets.length < 2) return;
  const rewards = randomPick(nextTierPets, 2);
  set({ levelUpReward: rewards });
  events.push(`升级奖励：从 Tier ${nextTier} 中选择一位武将！`);
}

/**
 * Apply all side effects of a pet leveling up:
 *   - 教头(jiaotou) levelUp: 全队 +level/+level
 *   - Offer level-up reward (only for Lv1→Lv2, not Lv2→Lv3)
 */
function applyLevelUpEffects(
  target: GeneralInstance,
  newTeam: GeneralInstance[],
  events: string[],
  state: ShopState,
  set: (partial: Partial<ShopState> | ((s: ShopState) => Partial<ShopState>)) => void,
  offerReward: boolean,
) {
  // 教头 levelUp trigger: 所有友方 +level/+level
  if (target.defId === 'jiaotou') {
    for (const m of newTeam) {
      if (m !== target) {
        m.atk = Math.min(MAX_STAT, m.atk + target.level);
        m.hp = Math.min(MAX_STAT, m.hp + target.level);
        m.maxHp = Math.min(MAX_STAT, m.maxHp + target.level);
      }
    }
    events.push(`教头: 练兵 所有友方 +${target.level}/${target.level}`);
  }
  // Offer reward only for Lv1→Lv2
  if (offerReward) {
    const tDef = generals.find((d) => d.id === target.defId);
    if (tDef) offerLevelUpReward(tDef.tier, state, events, set);
  }
}

export const useShopStore = create<ShopState>((set, get) => ({
  gold: GOLD_PER_TURN,
  petSlots: [],
  itemSlots: [],
  frozenPets: new Set(),
  frozenItems: new Set(),
  freeRoll: false,
  cannedFoodBonus: { atk: 0, hp: 0 },
  itemDiscount: 0,
  lastBattleLost: false,
  levelUpReward: null,

  initShop: (tier) => {
    const size = getShopSize(tier);
    const available = getAvailableGenerals(tier);
    const availableItems = getAvailableItems(tier);
    set({
      gold: GOLD_PER_TURN,
      petSlots: randomPick(available, size.pets),
      itemSlots: randomPick(availableItems, size.items),
      frozenPets: new Set(),
      frozenItems: new Set(),
      freeRoll: false,
      itemDiscount: 0,
      levelUpReward: null,
    });
  },

  rollShop: (tier) => {
    const state = get();
    const cost = state.freeRoll ? 0 : ROLL_COST;
    if (state.gold < cost) return;

    const size = getShopSize(tier);
    const available = getAvailableGenerals(tier);
    const availableItems = getAvailableItems(tier);

    const newPets: (GeneralDef | null)[] = [];
    const rolled = randomPick(available, size.pets);
    for (let i = 0; i < size.pets; i++) {
      if (state.frozenPets.has(i) && state.petSlots[i]) {
        newPets.push(state.petSlots[i]!);
      } else {
        newPets.push(rolled[i] ?? null);
      }
    }

    const newItems: (ItemDef | null)[] = [];
    const rolledItems = randomPick(availableItems, size.items);
    for (let i = 0; i < size.items; i++) {
      if (state.frozenItems.has(i) && state.itemSlots[i]) {
        newItems.push(state.itemSlots[i]!);
      } else {
        newItems.push(rolledItems[i] ?? null);
      }
    }

    set({
      gold: state.gold - cost,
      petSlots: newPets,
      itemSlots: newItems,
      freeRoll: false,
      levelUpReward: null, // Clear reward on roll
    });
  },

  buyPet: (slotIdx, team, teamIdx) => {
    const state = get();
    const def = state.petSlots[slotIdx];
    if (!def || state.gold < PET_COST) return null;

    const events: string[] = [];
    const newTeam = [...team];
    let purchased: GeneralInstance | null = null; // the pet that was bought/merged

    const target = newTeam[teamIdx];
    if (target && target.defId === def.id) {
      // Merge
      const bonus = state.cannedFoodBonus;
      const srcAtk = def.baseAtk + bonus.atk;
      const srcHp = def.baseHp + bonus.hp;
      target.atk = Math.min(MAX_STAT, Math.max(target.atk, srcAtk) + 1);
      target.hp = Math.min(MAX_STAT, Math.max(target.hp, srcHp) + 1);
      target.maxHp = Math.min(MAX_STAT, Math.max(target.maxHp, srcHp) + 1);
      target.xp += 1;

      if (target.level === 1 && target.xp >= XP_TO_LV2) {
        target.level = 2;
        events.push(`${def.name} 升级到 Lv.2！`);
        applyLevelUpEffects(target, newTeam, events, state, set, true);
      } else if (target.level === 2 && target.xp >= XP_TO_LV3) {
        target.level = 3;
        events.push(`${def.name} 升级到 Lv.3！`);
        applyLevelUpEffects(target, newTeam, events, state, set, false);
      }
      events.push(`合并 ${def.name}`);
      purchased = target;
    } else if (!target && newTeam.length < MAX_TEAM_SIZE) {
      const bonus = state.cannedFoodBonus;
      const inst = createInstance(def, bonus.atk, bonus.hp);
      newTeam.splice(teamIdx, 0, inst);
      events.push(`购买 ${def.name}`);
      purchased = inst;
    } else if (!target) {
      const inst = createInstance(def, state.cannedFoodBonus.atk, state.cannedFoodBonus.hp);
      newTeam[teamIdx] = inst;
      events.push(`购买 ${def.name}`);
      purchased = inst;
    } else {
      return null;
    }

    // 孙尚香 (Cow): only when SHE is bought (one-time shop replace)
    if (purchased && def.id === 'sunshangxiang') {
      const freeMilk: ItemDef = {
        id: 'junliang_free', name: '军粮', originalName: 'Milk',
        tier: 1, cost: 0, type: 'stat', description: '+1/+2（免费）',
      };
      set({ itemSlots: [freeMilk, freeMilk] });
      events.push(`孙尚香: 嫁妆 商店道具变为2个免费军粮`);
    }

    // Team-wide buy triggers — fire for ALL matching members on EVERY purchase
    if (purchased) {
      for (const member of newTeam) {
        // 军需官 (Otter): random friend(s) +1/+1
        if (member.defId === 'junxuguan') {
          const others = newTeam.filter((t) => t !== member);
          const picks = randomPick(others, member.level);
          for (const t of picks) {
            t.atk = Math.min(MAX_STAT, t.atk + 1);
            t.hp = Math.min(MAX_STAT, t.hp + 1);
            t.maxHp = Math.min(MAX_STAT, t.maxHp + 1);
          }
          if (picks.length > 0) events.push(`军需官: 补给分配 ${picks.length}个友方 +1/+1`);
        }
        // 徐庶 (Snail): if lost last battle, all friends +level/+level
        if (member.defId === 'xushu' && state.lastBattleLost) {
          for (const t of newTeam) {
            if (t !== member) {
              t.atk = Math.min(MAX_STAT, t.atk + 1 * member.level);
              t.hp = Math.min(MAX_STAT, t.hp + 1 * member.level);
              t.maxHp = Math.min(MAX_STAT, t.maxHp + 1 * member.level);
            }
          }
          events.push(`徐庶: 雪中送炭 所有友方 +${member.level}/${member.level}`);
        }
      }
    }

    const newPetSlots = [...state.petSlots];
    newPetSlots[slotIdx] = null;
    const newFrozen = new Set(state.frozenPets);
    newFrozen.delete(slotIdx);

    set({ gold: state.gold - PET_COST, petSlots: newPetSlots, frozenPets: newFrozen });
    return { team: newTeam, events };
  },

  buyItem: (slotIdx, team, targetIdx) => {
    const state = get();
    const item = state.itemSlots[slotIdx];
    if (!item) return null;
    const effectiveCost = Math.max(0, item.cost - state.itemDiscount);
    if (state.gold < effectiveCost) return null;
    const target = team[targetIdx];
    if (!target && item.type !== 'special') return null;

    const events: string[] = [];
    const newTeam = [...team];

    // Check if target has 郭嘉 (Cat) passive: double food effects
    const hasGuojia = newTeam.some((t) => t.defId === 'guojia');
    const foodMult = hasGuojia ? 2 : 1;

    if (item.type === 'stat') {
      const t = newTeam[targetIdx]!;
      switch (item.id) {
        case 'mantou': { // Apple: +1/+1
          const boost = 1 * foodMult;
          t.atk = Math.min(MAX_STAT, t.atk + boost);
          t.hp = Math.min(MAX_STAT, t.hp + boost);
          t.maxHp = Math.min(MAX_STAT, t.maxHp + boost);
          break;
        }
        case 'junliang_free': { // Free milk from 孙尚香: +1/+2
          t.atk = Math.min(MAX_STAT, t.atk + 1 * foodMult);
          t.hp = Math.min(MAX_STAT, t.hp + 2 * foodMult);
          t.maxHp = Math.min(MAX_STAT, t.maxHp + 2 * foodMult);
          break;
        }
        case 'jiu': { // Cupcake: +3/+3 temp
          const boost = 3 * foodMult;
          t.tempAtk += boost;
          t.tempHp += boost;
          break;
        }
        case 'junliang': // Salad: 2 random +1/+1
        case 'yushan': // Sushi: 3 random +1/+1
        case 'yuyan': // Pizza: 2 random +2/+2
        {
          const count = item.id === 'yushan' ? 3 : 2;
          const boost = (item.id === 'yuyan' ? 2 : 1) * foodMult;
          const indices = [...newTeam.keys()].sort(() => Math.random() - 0.5).slice(0, count);
          for (const i of indices) {
            const p = newTeam[i]!;
            p.atk = Math.min(MAX_STAT, p.atk + boost);
            p.hp = Math.min(MAX_STAT, p.hp + boost);
            p.maxHp = Math.min(MAX_STAT, p.maxHp + boost);
          }
          break;
        }
        case 'xiantao': { // Pear: +2/+2
          const boost = 2 * foodMult;
          t.atk = Math.min(MAX_STAT, t.atk + boost);
          t.hp = Math.min(MAX_STAT, t.hp + boost);
          t.maxHp = Math.min(MAX_STAT, t.maxHp + boost);
          break;
        }
      }
      events.push(`对 ${getGeneralName(t.defId)} 使用 ${item.name}`);
    } else if (item.type === 'perk') {
      const t = newTeam[targetIdx]!;
      t.perk = item.id;
      events.push(`${getGeneralName(t.defId)} 装备了 ${item.name}`);
    } else if (item.type === 'special') {
      switch (item.id) {
        case 'anmianyao': {
          if (!target) return null;
          events.push(`${getGeneralName(target.defId)} 被安眠药击倒`);
          // Trigger faint effects in shop (e.g., Cricket summons zombie, Sheep summons rams)
          const faintedDef = generals.find((d) => d.id === target.defId);
          if (faintedDef) {
            switch (faintedDef.id) {
              case 'sishi': // Cricket: summon zombie
                if (newTeam.length <= MAX_TEAM_SIZE) { // will have room after removing
                  const zombie = createInstance(
                    { ...faintedDef, id: 'sishi_zombie', name: '亡灵死士' } as GeneralDef,
                    target.level - 1, target.level - 1
                  );
                  newTeam.splice(targetIdx, 1);
                  if (newTeam.length < MAX_TEAM_SIZE) newTeam.push(zombie);
                  events.push(`亡魂不散：召唤亡灵死士`);
                  return finishBuyItem();
                }
                break;
              case 'zhangren': // Sheep: summon 2 rams
                newTeam.splice(targetIdx, 1);
                for (let r = 0; r < 2 && newTeam.length < MAX_TEAM_SIZE; r++) {
                  const ram = createInstance(
                    { ...faintedDef, id: 'shoujun', name: '守军' } as GeneralDef,
                    2 * target.level - faintedDef.baseAtk, 2 * target.level - faintedDef.baseHp
                  );
                  newTeam.push(ram);
                }
                events.push(`誓死守城：召唤守军`);
                return finishBuyItem();
              default:
                break;
            }
          }
          newTeam.splice(targetIdx, 1);
          break;

          function finishBuyItem() {
            const newItemSlots2 = [...state.itemSlots];
            newItemSlots2[slotIdx] = null;
            const newFrozen2 = new Set(state.frozenItems);
            newFrozen2.delete(slotIdx);
            set({ gold: state.gold - effectiveCost, itemSlots: newItemSlots2, frozenItems: newFrozen2 });
            return { team: newTeam, events };
          }
        }
        case 'bingshu': {
          const bonus = get().cannedFoodBonus;
          set({ cannedFoodBonus: { atk: bonus.atk + 1, hp: bonus.hp + 1 } });
          events.push('兵书效果：所有未来商店武将 +1/+1');
          break;
        }
        case 'bingfa': {
          if (!target) return null;
          const t = newTeam[targetIdx]!;
          t.xp += 1;
          if (t.level === 1 && t.xp >= XP_TO_LV2) {
            t.level = 2;
            events.push(`${getGeneralName(t.defId)} 升级到 Lv.2！`);
            applyLevelUpEffects(t, newTeam, events, state, set, true);
          } else if (t.level === 2 && t.xp >= XP_TO_LV3) {
            t.level = 3;
            events.push(`${getGeneralName(t.defId)} 升级到 Lv.3！`);
            applyLevelUpEffects(t, newTeam, events, state, set, false);
          }
          events.push(`${getGeneralName(t.defId)} 获得经验`);
          break;
        }
      }
    }

    // Trigger friendEatsFood / eatsFood for non-special items
    if (item.type !== 'special') {
      const foodEvents: string[] = [];
      executeShopTrigger('friendEatsFood', newTeam, foodEvents, {
        gold: state.gold, petSlots: state.petSlots, itemSlots: state.itemSlots,
        tier: 1, targetIdx, cannedFoodBonus: state.cannedFoodBonus,
      });
      // eatsFood for the target itself
      if (target) {
        const tDef = generals.find((d) => d.id === target.defId);
        if (tDef?.trigger === 'eatsFood') {
          executeShopTrigger('eatsFood', newTeam, foodEvents, {
            gold: state.gold, petSlots: state.petSlots, itemSlots: state.itemSlots,
            tier: 1, targetIdx, cannedFoodBonus: state.cannedFoodBonus,
          });
        }
      }
      events.push(...foodEvents);
    }

    const newItemSlots = [...state.itemSlots];
    newItemSlots[slotIdx] = null;
    const newFrozen = new Set(state.frozenItems);
    newFrozen.delete(slotIdx);

    set({ gold: state.gold - effectiveCost, itemSlots: newItemSlots, frozenItems: newFrozen });
    return { team: newTeam, events };
  },

  sellPet: (team, idx) => {
    const pet = team[idx];
    if (!pet) return { team, gold: 0, events: [] };
    const events: string[] = [];
    let sellGold = pet.level;

    // Sell triggers
    const def = generals.find((d) => d.id === pet.defId);
    if (def?.trigger === 'sell') {
      switch (def.id) {
        case 'minfu': { // Beaver: 2*level random friends +1 HP
          const others = team.filter((_, i) => i !== idx);
          const picks = randomPick(others, 2 * pet.level);
          for (const t of picks) {
            t.hp = Math.min(MAX_STAT, t.hp + 1);
            t.maxHp = Math.min(MAX_STAT, t.maxHp + 1);
          }
          if (picks.length > 0) events.push(`民夫: 修筑工事 ${picks.length}个友方 +1 HP`);
          break;
        }
        case 'huofu': { // Duck: shop pets +1*level HP (buff the cannedFoodBonus HP only)
          const bonus = get().cannedFoodBonus;
          set({ cannedFoodBonus: { atk: bonus.atk, hp: bonus.hp + pet.level } });
          events.push(`伙夫: 军粮供给 商店武将 +${pet.level} HP`);
          break;
        }
        case 'shanggu': { // Pig: +1*level extra gold
          sellGold += 1 * pet.level;
          events.push(`商贾: 生财有道 +${pet.level} 额外金币`);
          break;
        }
        case 'xinshi': { // Pigeon: stock free bread crumbs in item shop
          const freeMantou: ItemDef = { ...items.find((i) => i.id === 'mantou')!, cost: 0 };
          // Add to item slots (append as extra slot)
          set((s) => ({
            itemSlots: [...s.itemSlots, freeMantou],
          }));
          events.push(`信使: 飞鸽传书 商店补充免费馒头！`);
          break;
        }
      }
    }

    // friendSold trigger: 糜竺 (Shrimp)
    for (const t of team) {
      if (t === pet) continue;
      if (t.defId === 'mizhu') {
        const others = team.filter((o) => o !== pet && o !== t);
        const picks = randomPick(others, t.level);
        for (const p of picks) {
          p.hp = Math.min(MAX_STAT, p.hp + 1);
          p.maxHp = Math.min(MAX_STAT, p.maxHp + 1);
        }
        if (picks.length > 0) events.push(`糜竺: 商贾之才 ${picks.length}个友方 +1 HP`);
      }
    }

    const newTeam = team.filter((_, i) => i !== idx);
    set((s) => ({ gold: s.gold + sellGold }));
    events.unshift(`出售 ${getGeneralName(pet.defId)}，获得 ${sellGold} 金币`);
    return { team: newTeam, gold: sellGold, events };
  },

  toggleFreezePet: (idx) =>
    set((s) => {
      const f = new Set(s.frozenPets);
      if (f.has(idx)) f.delete(idx);
      else f.add(idx);
      return { frozenPets: f };
    }),

  toggleFreezeItem: (idx) =>
    set((s) => {
      const f = new Set(s.frozenItems);
      if (f.has(idx)) f.delete(idx);
      else f.add(idx);
      return { frozenItems: f };
    }),

  spendGold: (amount) => {
    const s = get();
    if (s.gold < amount) return false;
    set({ gold: s.gold - amount });
    return true;
  },

  setLastBattleLost: (lost) => set({ lastBattleLost: lost }),

  buyRewardPet: (rewardIdx, team, teamIdx) => {
    const state = get();
    const reward = state.levelUpReward?.[rewardIdx];
    if (!reward) return null;

    const events: string[] = [];
    const newTeam = [...team];
    const target = newTeam[teamIdx];

    // Clear current reward FIRST, so a chained level-up can offer a fresh one
    set({ levelUpReward: null });

    if (target && target.defId === reward.id) {
      // Merge with existing
      target.atk = Math.min(MAX_STAT, Math.max(target.atk, reward.baseAtk) + 1);
      target.hp = Math.min(MAX_STAT, Math.max(target.hp, reward.baseHp) + 1);
      target.maxHp = Math.min(MAX_STAT, Math.max(target.maxHp, reward.baseHp) + 1);
      target.xp += 1;
      if (target.level === 1 && target.xp >= XP_TO_LV2) {
        target.level = 2;
        events.push(`${reward.name} 升级到 Lv.2！`);
        applyLevelUpEffects(target, newTeam, events, get(), set, true);
      } else if (target.level === 2 && target.xp >= XP_TO_LV3) {
        target.level = 3;
        events.push(`${reward.name} 升级到 Lv.3！`);
        applyLevelUpEffects(target, newTeam, events, get(), set, false);
      }
      events.push(`升级奖励：合并 ${reward.name}`);
    } else if (!target && newTeam.length < MAX_TEAM_SIZE) {
      const bonus = state.cannedFoodBonus;
      const inst = createInstance(reward, bonus.atk, bonus.hp);
      newTeam.splice(teamIdx, 0, inst);
      events.push(`升级奖励：获得 ${reward.name}！`);
    } else if (newTeam.length < MAX_TEAM_SIZE) {
      const bonus = state.cannedFoodBonus;
      const inst = createInstance(reward, bonus.atk, bonus.hp);
      newTeam.push(inst);
      events.push(`升级奖励：获得 ${reward.name}！`);
    } else {
      return null; // Team full
    }

    return { team: newTeam, events };
  },

  clearLevelUpReward: () => set({ levelUpReward: null }),

  mergeTeamPets: (team, fromIdx, toIdx) => {
    const events: string[] = [];
    const source = team[fromIdx];
    const target = team[toIdx];
    if (!source || !target || source.defId !== target.defId || fromIdx === toIdx) {
      return { team, events };
    }

    const newTeam = [...team];
    const t = { ...target };
    t.atk = Math.min(MAX_STAT, Math.max(t.atk, source.atk) + 1);
    t.hp = Math.min(MAX_STAT, Math.max(t.hp, source.hp) + 1);
    t.maxHp = Math.min(MAX_STAT, Math.max(t.maxHp, source.maxHp) + 1);
    t.xp += 1;
    newTeam[toIdx] = t;
    newTeam.splice(fromIdx, 1);

    if (t.level === 1 && t.xp >= XP_TO_LV2) {
      t.level = 2;
      events.push(`${getGeneralName(t.defId)} 升级到 Lv.2！`);
      applyLevelUpEffects(t, newTeam, events, get(), set, true);
    } else if (t.level === 2 && t.xp >= XP_TO_LV3) {
      t.level = 3;
      events.push(`${getGeneralName(t.defId)} 升级到 Lv.3！`);
      applyLevelUpEffects(t, newTeam, events, get(), set, false);
    }

    return { team: newTeam, events };
  },

  executeEndOfTurn: (team, tier) => {
    const events: string[] = [];
    const newTeam = [...team];
    executeShopTrigger('endOfTurn', newTeam, events, {
      gold: get().gold, petSlots: get().petSlots, itemSlots: get().itemSlots,
      tier, cannedFoodBonus: get().cannedFoodBonus,
    });
    return { team: newTeam, events };
  },

  resetTurn: (tier, team?: GeneralInstance[]) => {
    const state = get();
    const size = getShopSize(tier);
    const available = getAvailableGenerals(tier);
    const availableItems = getAvailableItems(tier);

    // Execute startOfTurn triggers
    const startEvents: string[] = [];
    const triggerResult = executeShopTrigger('startOfTurn', team ?? [], startEvents, {
      gold: state.gold, petSlots: state.petSlots, itemSlots: state.itemSlots,
      tier, cannedFoodBonus: state.cannedFoodBonus,
    });

    const newPets: (GeneralDef | null)[] = [];
    const rolled = randomPick(available, size.pets);
    for (let i = 0; i < size.pets; i++) {
      if (state.frozenPets.has(i) && state.petSlots[i]) {
        newPets.push(state.petSlots[i]!);
      } else {
        newPets.push(rolled[i] ?? null);
      }
    }

    const newItems: (ItemDef | null)[] = [];
    const rolledItems = randomPick(availableItems, size.items);
    for (let i = 0; i < size.items; i++) {
      if (state.frozenItems.has(i) && state.itemSlots[i]) {
        newItems.push(state.itemSlots[i]!);
      } else {
        newItems.push(rolledItems[i] ?? null);
      }
    }

    // Append extra items from startOfTurn triggers (e.g. 许靖's discounted mantou)
    const finalItems = triggerResult.extraItems
      ? [...newItems, ...triggerResult.extraItems]
      : newItems;

    set({
      gold: GOLD_PER_TURN + triggerResult.goldDelta,
      petSlots: newPets,
      itemSlots: finalItems,
      freeRoll: false,
      itemDiscount: triggerResult.itemDiscount ?? 0,
      levelUpReward: null,
    });
  },
}));

function getGeneralName(defId: string): string {
  return generals.find((g) => g.id === defId)?.name ?? defId;
}
