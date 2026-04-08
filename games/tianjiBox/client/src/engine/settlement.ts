import { GearInstance } from '../types/gear';
import { OperationRecord, OperationEffect, AbilityEntry, SlotSnapshot } from '../types/game';
import { Quality, GearCategory, SpecialConditionType, Rating } from '../types/enums';
import { GEAR_DEF_MAP } from '../data/gears';
import { calculateRating, BASE_TREASURE_POINTS_PER_RUN } from '../data/scoring';

function interpolate(template: string, value: number): string {
  return template.replace('{value}', formatNumber(value));
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toString();
}

/** 检查是否在边缘位置 */
function isEdge(index: number, totalSlots: number): boolean {
  return index === 0 || index === totalSlots - 1;
}

/** 获取相邻槽位的索引 */
function getAdjacentIndices(index: number, totalSlots: number): number[] {
  const result: number[] = [];
  if (index > 0) result.push(index - 1);
  if (index < totalSlots - 1) result.push(index + 1);
  return result;
}

/** 统计相邻空位数（含边缘外的位置） */
function countAdjacentEmpty(index: number, slots: (GearInstance | null)[], totalSlots: number): number {
  let count = 0;
  // 左侧
  if (index === 0) count++; // 左边缘算空位
  else if (!slots[index - 1]) count++;
  // 右侧
  if (index === totalSlots - 1) count++; // 右边缘算空位
  else if (!slots[index + 1]) count++;
  return count;
}

/** 检查特殊条件 */
function checkSpecialCondition(
  condType: SpecialConditionType,
  condParam: GearCategory | undefined,
  slotIndex: number,
  slots: (GearInstance | null)[],
  totalSlots: number,
): boolean | number {
  switch (condType) {
    case SpecialConditionType.None:
      return false;

    case SpecialConditionType.UniqueCategory: {
      const gear = slots[slotIndex];
      if (!gear) return false;
      const def = GEAR_DEF_MAP.get(gear.defId);
      if (!def) return false;
      const sameCategory = slots.filter(
        (s, i) => s && i !== slotIndex && GEAR_DEF_MAP.get(s.defId)?.category === def.category
      );
      return sameCategory.length === 0;
    }

    case SpecialConditionType.AdjacentCategory: {
      const adj = getAdjacentIndices(slotIndex, totalSlots);
      return adj.some(i => {
        const s = slots[i];
        return s && GEAR_DEF_MAP.get(s.defId)?.category === condParam;
      });
    }

    case SpecialConditionType.EdgePosition:
      return isEdge(slotIndex, totalSlots);

    case SpecialConditionType.AdjacentEmpty:
      return countAdjacentEmpty(slotIndex, slots, totalSlots); // 返回数字

    case SpecialConditionType.FourCategories: {
      const categories = new Set<GearCategory>();
      for (const s of slots) {
        if (s) {
          const d = GEAR_DEF_MAP.get(s.defId);
          if (d && d.category !== GearCategory.ZhenBao) categories.add(d.category);
        }
      }
      return categories.size >= 4;
    }

    case SpecialConditionType.SingleAdjacent: {
      const adj = getAdjacentIndices(slotIndex, totalSlots);
      const adjacentGears = adj.filter(i => slots[i] !== null);
      return adjacentGears.length === 1;
    }

    default:
      return false;
  }
}

/** 执行结算 */
export function settle(slots: (GearInstance | null)[], maxSlots: number): {
  record: OperationRecord;
  abilities: AbilityEntry[];
  treasurePointsGained: number;
  hasExtraOp: boolean;
  batchAcquireGears: string[];
} {
  const totalSlots = maxSlots;
  const effectiveQualities: (Quality | null)[] = slots.map(s => s?.quality ?? null);
  const effects: OperationEffect[] = [];
  const abilities: AbilityEntry[] = [];
  const snapshots: SlotSnapshot[] = [];
  let totalScore = 0;
  let totalTP = BASE_TREASURE_POINTS_PER_RUN;
  let hasExtraOp = false;
  const batchAcquireGears: string[] = [];

  // Phase 1: 找放大镜，优先结算（修改相邻生效等级）
  const sortedIndices = slots
    .map((s, i) => ({ s, i }))
    .filter(x => x.s !== null)
    .sort((a, b) => {
      const defA = GEAR_DEF_MAP.get(a.s!.defId)!;
      const defB = GEAR_DEF_MAP.get(b.s!.defId)!;
      return defA.settlementPriority - defB.settlementPriority;
    });

  for (const { s, i } of sortedIndices) {
    const def = GEAR_DEF_MAP.get(s!.defId);
    if (!def || def.id !== 'fangdajing') continue;
    const boost = def.effect.values[(s!.quality) - 1];
    const adj = getAdjacentIndices(i, totalSlots);
    for (const ai of adj) {
      if (slots[ai] && effectiveQualities[ai] !== null) {
        effectiveQualities[ai] = Math.min(effectiveQualities[ai]! + boost, Quality.Red) as Quality;
      }
    }
  }

  // Phase 2: 从左到右结算
  for (let i = 0; i < slots.length; i++) {
    const gear = slots[i];
    if (!gear) continue;

    const def = GEAR_DEF_MAP.get(gear.defId);
    if (!def) continue;

    const eq = effectiveQualities[i] ?? gear.quality;
    const valueIdx = Math.min(eq - 1, def.effect.values.length - 1);

    // 普通效果
    const normalValue = def.effect.values[valueIdx];
    const normalText = interpolate(def.effect.descriptionTemplate, normalValue);
    const floatingTexts: string[] = [interpolate(def.effect.floatingTextTemplate, normalValue)];

    // 特殊条件
    const condResult = checkSpecialCondition(
      def.specialCondition.type, def.specialCondition.param, i, slots, totalSlots
    );

    let specialTriggered = false;
    let specialText = '';

    if (def.specialCondition.type === SpecialConditionType.AdjacentEmpty) {
      // 空位数量特殊处理
      const emptyCount = condResult as number;
      if (emptyCount > 0) {
        specialTriggered = true;
        const spValueIdx = Math.min(eq - 1, def.specialEffect.values.length - 1);
        const perEmpty = def.specialEffect.values[spValueIdx];
        const totalSpecialTP = perEmpty * emptyCount;
        specialText = `相邻 ${emptyCount} 个空位，额外获得 ${totalSpecialTP} 珍宝点数`;
        floatingTexts.push(`+${totalSpecialTP} 珍宝点数`);
        totalTP += totalSpecialTP;
      }
    } else if (condResult === true) {
      specialTriggered = true;
      const spValueIdx = Math.min(eq - 1, def.specialEffect.values.length - 1);
      const specialValue = def.specialEffect.values[spValueIdx];
      specialText = interpolate(def.specialEffect.descriptionTemplate, specialValue);
      if (def.specialEffect.floatingTextTemplate) {
        floatingTexts.push(interpolate(def.specialEffect.floatingTextTemplate, specialValue));
      }
      // 特殊效果中的珍宝点数
      if (def.specialEffect.floatingTextTemplate.includes('珍宝点数')) {
        totalTP += specialValue;
      }
    }

    // 基础效果中的珍宝点数（探龙针等）
    if (def.effect.floatingTextTemplate.includes('珍宝点数')) {
      totalTP += normalValue;
    }

    // 珍宝特殊处理
    if (def.category === GearCategory.ZhenBao) {
      if (def.id === 'muniuliumaa') hasExtraOp = true;
      if (def.id === 'baibaoxiang') {
        // 标记需要批量获取3个机关
        batchAcquireGears.push(def.id);
      }
    }

    // 分数
    const scoreIdx = Math.min(eq - 1, def.baseScore.length - 1);
    const score = def.baseScore[scoreIdx] + (specialTriggered ? def.specialScore : 0);
    totalScore += score;

    // 今日能力
    if (def.effect.abilityEntry) {
      abilities.push({
        type: def.effect.abilityEntry.type,
        name: def.effect.abilityEntry.name,
        description: interpolate(def.effect.abilityEntry.description || def.effect.abilityEntry.name, normalValue),
        uses: def.category === GearCategory.BingShu ? normalValue : undefined,
      });
    }
    if (specialTriggered && def.specialEffect.abilityEntry) {
      const spValueIdx = Math.min(eq - 1, def.specialEffect.values.length - 1);
      abilities.push({
        type: def.specialEffect.abilityEntry.type,
        name: def.specialEffect.abilityEntry.name,
        description: def.specialEffect.abilityEntry.description,
      });
    }

    effects.push({
      gearDefId: def.id,
      gearName: def.name,
      quality: gear.quality,
      effectiveQuality: eq,
      normalEffectText: normalText,
      specialTriggered,
      specialEffectText: specialText,
      floatingTexts,
      score,
      treasurePoints: def.baseTreasurePoints,
    });

    snapshots.push({
      defId: gear.defId,
      quality: gear.quality,
      effectiveQuality: eq,
      slotIndex: i,
    });
  }

  const rating = calculateRating(totalScore, totalSlots);

  return {
    record: {
      day: 0, // 调用方设置
      slotSnapshots: snapshots,
      effects,
      totalScore,
      rating,
      treasurePointsGained: totalTP,
    },
    abilities,
    treasurePointsGained: totalTP,
    hasExtraOp,
    batchAcquireGears,
  };
}
