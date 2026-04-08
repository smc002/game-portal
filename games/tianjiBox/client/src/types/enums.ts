/** 机关类别 */
export enum GearCategory {
  BingShu = 'bingshu',   // 兵书
  SuanChou = 'suanchou', // 算筹
  FuJie = 'fujie',       // 符节
  QiXie = 'qixie',       // 奇械
  ZhenBao = 'zhenbao',   // 珍宝
}

/** 品质/等级 */
export enum Quality {
  White = 1,  // 白色
  Blue = 2,   // 蓝色
  Purple = 3, // 紫色
  Orange = 4, // 橙色
  Red = 5,    // 红色（满级）
}

/** 运转评级 */
export enum Rating {
  Normal = '平平无奇',
  Strategic = '运筹帷幄',
  Masterful = '巧夺天工',
  Divine = '天命显化',
}

/** 特殊条件类型 */
export enum SpecialConditionType {
  None = 'none',
  UniqueCategory = 'unique_category',
  AdjacentCategory = 'adjacent_category',
  EdgePosition = 'edge_position',
  AdjacentEmpty = 'adjacent_empty',
  FourCategories = 'four_categories',
  SingleAdjacent = 'single_adjacent',
}

/** 今日能力类型 */
export enum AbilityType {
  Passive = 'passive',
  Usable = 'usable',
  Activatable = 'activatable',
}

/** 品质对应的中文名 */
export const QUALITY_NAMES: Record<Quality, string> = {
  [Quality.White]: '白',
  [Quality.Blue]: '蓝',
  [Quality.Purple]: '紫',
  [Quality.Orange]: '橙',
  [Quality.Red]: '红',
};

/** 品质对应的 CSS 颜色 */
export const QUALITY_COLORS: Record<Quality, string> = {
  [Quality.White]: '#c0c0c0',
  [Quality.Blue]: '#4a9eff',
  [Quality.Purple]: '#b44aff',
  [Quality.Orange]: '#ff8c00',
  [Quality.Red]: '#ff3333',
};

/** 类别中文名 */
export const CATEGORY_NAMES: Record<GearCategory, string> = {
  [GearCategory.BingShu]: '兵书',
  [GearCategory.SuanChou]: '算筹',
  [GearCategory.FuJie]: '符节',
  [GearCategory.QiXie]: '奇械',
  [GearCategory.ZhenBao]: '珍宝',
};
