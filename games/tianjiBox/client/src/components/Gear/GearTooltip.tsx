import { Quality, QUALITY_NAMES, QUALITY_COLORS, CATEGORY_NAMES, SpecialConditionType, GearCategory } from '../../types/enums';
import { SpecialCondition } from '../../types/gear';
import { GEAR_DEF_MAP } from '../../data/gears';

interface GearTooltipProps {
  defId: string;
  quality: Quality;
  specialActive?: boolean;
  showUpgrade?: boolean;
  upgradeQuality?: Quality;
}

function interpolate(template: string, value: number): string {
  if (value >= 10000) return template.replace('{value}', (value / 10000).toFixed(1) + '万');
  return template.replace('{value}', value.toString());
}

/** 将特殊条件转为中文描述 */
function describeCondition(cond: SpecialCondition): string {
  switch (cond.type) {
    case SpecialConditionType.None:
      return '';
    case SpecialConditionType.UniqueCategory:
      return '天机盒中同类型机关仅有此一个';
    case SpecialConditionType.AdjacentCategory:
      return `与${CATEGORY_NAMES[cond.param as GearCategory]}类机关相邻`;
    case SpecialConditionType.EdgePosition:
      return '摆放在边缘位置（第一格或最后一格）';
    case SpecialConditionType.AdjacentEmpty:
      return '相邻位置为空位或边缘';
    case SpecialConditionType.FourCategories:
      return '天机盒中同时拥有兵书、算筹、符节、奇械四种类型';
    case SpecialConditionType.SingleAdjacent:
      return '仅与一个机关相邻';
    default:
      return '';
  }
}

export function GearTooltip({ defId, quality, specialActive, showUpgrade, upgradeQuality }: GearTooltipProps) {
  const def = GEAR_DEF_MAP.get(defId);
  if (!def) return null;

  const qi = quality - 1;
  const normalValue = def.effect.values[Math.min(qi, def.effect.values.length - 1)];
  const specialValue = def.specialEffect.values[Math.min(qi, def.specialEffect.values.length - 1)];
  const conditionText = describeCondition(def.specialCondition);

  return (
    <div style={{ padding: 12, minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 'bold', fontSize: 16, color: QUALITY_COLORS[quality] }}>
          {def.name}
        </span>
        <span style={{ fontSize: 12, color: '#999' }}>
          {CATEGORY_NAMES[def.category]} · {QUALITY_NAMES[quality]}色
        </span>
      </div>

      {showUpgrade && upgradeQuality && (
        <div style={{ color: QUALITY_COLORS[upgradeQuality], fontWeight: 'bold', marginBottom: 8, animation: 'pulse 1s infinite' }}>
          等级提升 ↑↑↑
        </div>
      )}

      <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 6 }}>
        {interpolate(def.effect.descriptionTemplate, normalValue)}
        {showUpgrade && upgradeQuality && (
          <span style={{ color: QUALITY_COLORS[upgradeQuality], marginLeft: 6 }}>
            → {interpolate(def.effect.descriptionTemplate, def.effect.values[Math.min(upgradeQuality - 1, def.effect.values.length - 1)])}
          </span>
        )}
      </div>

      {def.specialEffect.descriptionTemplate && conditionText && (
        <div style={{
          fontSize: 13,
          lineHeight: 1.6,
          borderTop: '1px solid #333',
          paddingTop: 6,
          marginTop: 6,
        }}>
          <div style={{ fontSize: 12, color: specialActive ? '#ffd700' : '#999', marginBottom: 4 }}>
            条件：{conditionText}
            {specialActive && <span style={{ marginLeft: 6, color: '#4aff4a' }}>（已激活）</span>}
          </div>
          <div style={{
            color: specialActive ? '#ffd700' : '#888',
            fontWeight: specialActive ? 'bold' : 'normal',
          }}>
            {interpolate(def.specialEffect.descriptionTemplate, specialValue)}
            {showUpgrade && upgradeQuality && (
              <span style={{ color: QUALITY_COLORS[upgradeQuality], marginLeft: 6 }}>
                → {interpolate(def.specialEffect.descriptionTemplate, def.specialEffect.values[Math.min(upgradeQuality - 1, def.specialEffect.values.length - 1)])}
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
        分数：{def.baseScore[Math.min(qi, def.baseScore.length - 1)]}
        {def.specialScore > 0 && ` (+${def.specialScore})`}
      </div>
    </div>
  );
}

export { describeCondition };
