import { GearInstance } from '../types/gear';
import { GearCategory, SpecialConditionType } from '../types/enums';
import { GEAR_DEF_MAP } from '../data/gears';

/** 检查每个槽位的机关是否满足特殊激活条件，返回 boolean 数组 */
export function checkSlotActivation(
  slots: (GearInstance | null)[],
  maxSlots: number,
): boolean[] {
  return slots.map((gear, i) => {
    if (!gear) return false;
    const def = GEAR_DEF_MAP.get(gear.defId);
    if (!def) return false;

    switch (def.specialCondition.type) {
      case SpecialConditionType.None:
        return false;

      case SpecialConditionType.UniqueCategory: {
        const sameCategory = slots.filter(
          (s, j) => s && j !== i && GEAR_DEF_MAP.get(s.defId)?.category === def.category
        );
        return sameCategory.length === 0;
      }

      case SpecialConditionType.AdjacentCategory: {
        const adj = getAdj(i, maxSlots);
        return adj.some(j => {
          const s = slots[j];
          return s && GEAR_DEF_MAP.get(s.defId)?.category === def.specialCondition.param;
        });
      }

      case SpecialConditionType.EdgePosition:
        return i === 0 || i === maxSlots - 1;

      case SpecialConditionType.AdjacentEmpty: {
        let count = 0;
        if (i === 0) count++;
        else if (!slots[i - 1]) count++;
        if (i === maxSlots - 1) count++;
        else if (!slots[i + 1]) count++;
        return count > 0;
      }

      case SpecialConditionType.FourCategories: {
        const cats = new Set<GearCategory>();
        for (const s of slots) {
          if (s) {
            const d = GEAR_DEF_MAP.get(s.defId);
            if (d && d.category !== GearCategory.ZhenBao) cats.add(d.category);
          }
        }
        return cats.size >= 4;
      }

      case SpecialConditionType.SingleAdjacent: {
        const adj = getAdj(i, maxSlots);
        return adj.filter(j => slots[j] !== null).length === 1;
      }

      default:
        return false;
    }
  });
}

function getAdj(i: number, total: number): number[] {
  const r: number[] = [];
  if (i > 0) r.push(i - 1);
  if (i < total - 1) r.push(i + 1);
  return r;
}
