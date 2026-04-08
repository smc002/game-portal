import { GameState, GameAction } from '../types/game';
import { createGearInstance } from '../types/gear';
import { Quality, GearCategory } from '../types/enums';
import { getMaxSlots } from '../data/progression';
import { GEAR_DEF_MAP } from '../data/gears';
import { getTreasureThreshold, MAX_HISTORY_RECORDS, MAX_PENDING_ACQUIRES } from '../data/scoring';

export function createInitialState(): GameState {
  return {
    day: 1,
    maxSlots: getMaxSlots(1),
    slots: [null],
    backpack: [],
    hasOperatedToday: false,
    extraOperations: 0,
    treasurePoints: 0,
    treasureThreshold: getTreasureThreshold(0),
    treasureCount: 0,
    history: [],
    todayAbilities: [],
    collectedGearIds: [],
    pendingAcquires: 1,
    pendingTreasure: false,
    totalAcquires: 0,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEXT_DAY': {
      const newDay = state.day + 1;
      const newMaxSlots = getMaxSlots(newDay);
      const newSlots = [...state.slots];
      while (newSlots.length < newMaxSlots) {
        newSlots.push(null);
      }
      const newPending = Math.min(state.pendingAcquires + 1, MAX_PENDING_ACQUIRES);
      return {
        ...state,
        day: newDay,
        maxSlots: newMaxSlots,
        slots: newSlots,
        hasOperatedToday: false,
        extraOperations: 0,
        todayAbilities: [],
        pendingAcquires: newPending,
      };
    }

    case 'ACQUIRE_GEAR': {
      const def = GEAR_DEF_MAP.get(action.defId);
      if (!def) return state;

      const newBackpack = [...state.backpack];
      const newCollected = [...state.collectedGearIds];

      // 查找背包中是否已有
      const bpIdx = newBackpack.findIndex(g => g.defId === action.defId);
      if (bpIdx >= 0) {
        const existing = newBackpack[bpIdx];
        const newQ = Math.min(existing.quality + 1, def.maxQuality) as Quality;
        newBackpack[bpIdx] = { ...existing, quality: newQ };
      } else {
        // 查找天机盒中是否已有
        const slotGear = state.slots.find(s => s?.defId === action.defId);
        if (slotGear) {
          // 天机盒中有，升级天机盒里的
          const newSlots = state.slots.map(slot => {
            if (slot?.defId === action.defId) {
              return { ...slot, quality: Math.min(slot.quality + 1, def.maxQuality) as Quality };
            }
            return slot;
          });
          if (!newCollected.includes(action.defId)) newCollected.push(action.defId);
          return { ...state, slots: newSlots, collectedGearIds: newCollected, totalAcquires: state.totalAcquires + 1 };
        }
        // 全新
        newBackpack.push(createGearInstance(action.defId));
        if (!newCollected.includes(action.defId)) newCollected.push(action.defId);
      }

      return { ...state, backpack: newBackpack, collectedGearIds: newCollected, totalAcquires: state.totalAcquires + 1 };
    }

    case 'CONSUME_PENDING_ACQUIRE':
      return { ...state, pendingAcquires: Math.max(0, state.pendingAcquires - 1) };

    case 'PLACE_GEAR': {
      const { instanceId, slotIndex } = action;
      if (slotIndex < 0 || slotIndex >= state.maxSlots) return state;
      const gearIdx = state.backpack.findIndex(g => g.instanceId === instanceId);
      if (gearIdx < 0) return state;

      const gear = state.backpack[gearIdx];
      const newBackpack = [...state.backpack];
      newBackpack.splice(gearIdx, 1);

      const newSlots = [...state.slots];
      const displaced = newSlots[slotIndex];
      if (displaced) newBackpack.push(displaced);
      newSlots[slotIndex] = gear;

      return { ...state, backpack: newBackpack, slots: newSlots };
    }

    case 'REMOVE_GEAR': {
      const { slotIndex } = action;
      if (slotIndex < 0 || slotIndex >= state.slots.length) return state;
      const gear = state.slots[slotIndex];
      if (!gear) return state;

      const newSlots = [...state.slots];
      newSlots[slotIndex] = null;
      return { ...state, slots: newSlots, backpack: [...state.backpack, gear] };
    }

    case 'OPERATE': {
      const { result, abilities, treasureGained, grantExtraOp } = action;
      const newHistory = [result, ...state.history].slice(0, MAX_HISTORY_RECORDS);
      const newTP = state.treasurePoints + result.treasurePointsGained;

      // 运转后销毁天机盒中的珍宝（珍宝使用一次即销毁，不回背包）
      const newSlots = state.slots.map(slot => {
        if (slot) {
          const def = GEAR_DEF_MAP.get(slot.defId);
          if (def?.category === GearCategory.ZhenBao) return null;
        }
        return slot;
      });

      return {
        ...state,
        slots: newSlots,
        hasOperatedToday: true,
        extraOperations: grantExtraOp ? state.extraOperations + 1 : state.extraOperations,
        history: newHistory,
        todayAbilities: [...state.todayAbilities, ...abilities],
        treasurePoints: treasureGained ? newTP - state.treasureThreshold : newTP,
        pendingTreasure: treasureGained,
        treasureCount: treasureGained ? state.treasureCount + 1 : state.treasureCount,
        treasureThreshold: treasureGained
          ? getTreasureThreshold(state.treasureCount + 1)
          : state.treasureThreshold,
      };
    }

    case 'USE_EXTRA_OPERATION':
      return {
        ...state,
        extraOperations: Math.max(0, state.extraOperations - 1),
      };

    case 'DESTROY_SLOT_TREASURES': {
      // 从天机盒中移除珍宝，不放回背包
      const newSlots = state.slots.map(slot => {
        if (slot) {
          const def = GEAR_DEF_MAP.get(slot.defId);
          if (def?.category === GearCategory.ZhenBao) return null;
        }
        return slot;
      });
      return { ...state, slots: newSlots };
    }

    case 'ACQUIRE_TREASURE': {
      const def = GEAR_DEF_MAP.get(action.defId);
      if (!def || def.category !== GearCategory.ZhenBao) return state;

      const newBackpack = [...state.backpack];
      newBackpack.push(createGearInstance(action.defId));

      const newCollected = [...state.collectedGearIds];
      if (!newCollected.includes(action.defId)) newCollected.push(action.defId);

      return { ...state, backpack: newBackpack, collectedGearIds: newCollected, pendingTreasure: false };
    }

    case 'SET_PENDING_TREASURE':
      return { ...state, pendingTreasure: action.value };

    case 'REFORGE_SACRIFICE': {
      const idSet = new Set(action.instanceIds);
      return {
        ...state,
        backpack: state.backpack.filter(g => !idSet.has(g.instanceId)),
        slots: state.slots.map(slot => slot && idSet.has(slot.instanceId) ? null : slot),
      };
    }

    case 'REFORGE_SELECT': {
      const def = GEAR_DEF_MAP.get(action.defId);
      if (!def) return state;

      const newBackpack = [...state.backpack];
      const newCollected = [...state.collectedGearIds];

      const existingIdx = newBackpack.findIndex(g => g.defId === action.defId);
      if (existingIdx >= 0) {
        const existing = newBackpack[existingIdx];
        newBackpack[existingIdx] = { ...existing, quality: Math.min(existing.quality + 1, def.maxQuality) as Quality };
      } else {
        newBackpack.push(createGearInstance(action.defId));
        if (!newCollected.includes(action.defId)) newCollected.push(action.defId);
      }

      return { ...state, backpack: newBackpack, collectedGearIds: newCollected };
    }

    case 'BATCH_ACQUIRE_GEARS': {
      let s = state;
      for (const defId of action.defIds) {
        s = gameReducer(s, { type: 'ACQUIRE_GEAR', defId });
      }
      // 不递增 totalAcquires（已在 ACQUIRE_GEAR 中处理）
      return s;
    }

    default:
      return state;
  }
}
