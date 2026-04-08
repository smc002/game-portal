# 天机盒 — 单机演示版 技术方案

## 技术栈

| 项目 | 选型 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 样式 | CSS（全局 + 组件级） |
| 状态管理 | React Context + useReducer |
| 动画 | CSS Animations + framer-motion |
| 数据存储 | 纯内存（无持久化） |
| 后端 | 无（纯前端 SPA） |

## 目录结构

```
games/tianjiBox/
├── docs/
│   ├── game.md                # 游戏设计文档
│   ├── gearDesign.md          # 机关列表设计
│   └── tech_plan.md           # 技术方案（本文档）
├── client/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx                    # 入口
│       ├── App.tsx                     # 路由/主布局
│       ├── types/
│       │   ├── gear.ts                 # 机关相关类型
│       │   ├── game.ts                 # 游戏状态类型
│       │   └── enums.ts                # 枚举（品质、类型、评级等）
│       ├── data/
│       │   ├── gears.ts                # 全部机关配置数据
│       │   ├── treasures.ts            # 珍宝配置数据
│       │   ├── scoring.ts              # 评分阈值配置
│       │   └── progression.ts          # 槽位成长 & 珍宝上限递增配置
│       ├── context/
│       │   ├── GameContext.tsx          # 游戏状态 Provider
│       │   └── gameReducer.ts          # 状态 reducer（所有状态变更）
│       ├── engine/
│       │   ├── settlement.ts           # 结算引擎（计算效果、分数、珍宝点数）
│       │   ├── gearPool.ts             # 机关随机池（三选一、重随、排除逻辑）
│       │   └── reforge.ts              # 重铸等级计算与自选逻辑
│       ├── components/
│       │   ├── TianjiBox/
│       │   │   ├── TianjiBox.tsx       # 天机盒主界面
│       │   │   ├── Slot.tsx            # 单个槽位（空/已放置/锁定）
│       │   │   ├── NextDayButton.tsx   # 下一天按钮
│       │   │   └── TreasureBar.tsx     # 珍宝点数进度条
│       │   ├── Gear/
│       │   │   ├── GearCard.tsx        # 机关卡片（获取界面用）
│       │   │   ├── GearTooltip.tsx     # 机关效果浮窗
│       │   │   └── GearIcon.tsx        # 机关图标（品质边框 + 流光）
│       │   ├── Backpack/
│       │   │   ├── Backpack.tsx        # 背包主界面
│       │   │   └── CategoryFilter.tsx  # 分类筛选标签
│       │   ├── Reforge/
│       │   │   └── Reforge.tsx         # 重铸界面
│       │   ├── Almanac/
│       │   │   └── Almanac.tsx         # 图鉴界面
│       │   ├── Acquire/
│       │   │   ├── GearAcquire.tsx     # 机关三选一
│       │   │   ├── TreasureAcquire.tsx # 珍宝二选一
│       │   │   └── GearSelect.tsx      # 重铸后自选
│       │   ├── Operation/
│       │   │   ├── OperationAnim.tsx   # 运转传动动效
│       │   │   ├── ResultPanel.tsx     # 运转结果总览
│       │   │   └── FloatingText.tsx    # 飘字组件
│       │   ├── History/
│       │   │   └── History.tsx         # 运转记录列表
│       │   ├── Abilities/
│       │   │   └── Abilities.tsx       # 今日能力面板
│       │   └── common/
│       │       ├── Modal.tsx           # 通用弹窗
│       │       ├── ConfirmDialog.tsx   # 二次确认弹窗
│       │       └── Toast.tsx           # 飘字提示
│       └── styles/
│           ├── global.css              # 全局样式
│           └── variables.css           # CSS 变量（品质颜色等）
```

## 核心类型定义

```typescript
// ===== enums.ts =====

enum GearCategory {
  BingShu = 'bingshu',     // 兵书
  SuanChou = 'suanchou',   // 算筹
  FuJie = 'fujie',         // 符节
  QiXie = 'qixie',         // 奇械
  ZhenBao = 'zhenbao',     // 珍宝
}

enum Quality {
  White = 1,    // 白色
  Blue = 2,     // 蓝色
  Purple = 3,   // 紫色
  Orange = 4,   // 橙色
  Red = 5,      // 红色（满级）
}

enum Rating {
  Normal = '平平无奇',
  Strategic = '运筹帷幄',
  Masterful = '巧夺天工',
  Divine = '天命显化',
}

enum SpecialConditionType {
  None = 'none',                        // 无特殊条件（珍宝）
  UniqueCategory = 'unique_category',   // 同类型只有自己
  AdjacentCategory = 'adjacent_category', // 相邻指定类型
  EdgePosition = 'edge_position',       // 在边缘位置
  AdjacentEmpty = 'adjacent_empty',     // 相邻空位/边缘
  FourCategories = 'four_categories',   // 四类齐全
  SingleAdjacent = 'single_adjacent',   // 只与一个机关相邻
}

enum AbilityType {
  Passive = 'passive',         // 持续生效
  Usable = 'usable',           // 可使用指令（展示）
  Activatable = 'activatable', // 需激活（展示）
}

// ===== gear.ts =====

/** 机关静态定义（配置数据） */
interface GearDef {
  id: string;
  name: string;
  category: GearCategory;
  maxQuality: Quality;              // 珍宝为 1，其它为 5
  baseScore: number[];              // 各品质基础分数 [1级, 2级, ..., 5级]
  specialScore: number;             // 触发特殊条件的额外分数
  effect: GearEffectDef;            // 普通效果
  specialCondition: SpecialCondition;
  specialEffect: GearEffectDef;     // 特殊效果
  briefDesc: [string, string];      // [普通简略, 特殊简略]
  baseTreasurePoints: number;       // 基础珍宝点数（运转时获得）
  settlementPriority?: number;      // 结算优先级（越小越先，默认 10）
}

interface GearEffectDef {
  descriptionTemplate: string;      // 效果文字模板，如 "获得{value}木铁石"
  values: number[];                 // 各品质对应数值
  floatingTextTemplate: string;     // 飘字模板，如 "+{value}木铁石"
  abilityEntry?: AbilityEntryDef;   // 今日能力条目（可选）
}

interface SpecialCondition {
  type: SpecialConditionType;
  param?: GearCategory;             // 部分条件需要的类别参数
}

interface AbilityEntryDef {
  type: AbilityType;
  nameTemplate: string;
  descriptionTemplate: string;
}

/** 玩家持有的机关实例 */
interface GearInstance {
  instanceId: string;               // 唯一实例 ID（crypto.randomUUID）
  defId: string;                    // 对应 GearDef.id
  quality: Quality;                 // 当前品质
}

// ===== game.ts =====

interface GameState {
  day: number;                                // 当前天数
  maxSlots: number;                           // 当前已解锁槽位数
  slots: (GearInstance | null)[];             // 天机盒槽位（长度 = maxSlots）
  backpack: GearInstance[];                   // 机关背包
  hasOperatedToday: boolean;                  // 今日是否已运转
  extraOperations: number;                    // 额外运转次数（木牛流马）
  treasurePoints: number;                     // 当前珍宝点数
  treasureThreshold: number;                  // 珍宝点数上限
  treasureCount: number;                      // 已获得珍宝次数（控制上限递增）
  history: OperationRecord[];                 // 运转记录（最多 50 条）
  todayAbilities: AbilityEntry[];             // 今日能力列表
  collectedGearIds: string[];                 // 已收集过的机关 defId（图鉴用）
  pendingAcquires: number;                    // 待领取的机关次数（累积，最多 3）
  pendingTreasure: boolean;                   // 是否有待领取的珍宝
  totalAcquires: number;                      // 累计进入机关获取次数（前 2 次固定）
}

interface OperationRecord {
  day: number;
  slotSnapshot: SlotSnapshot[];               // 槽位快照
  effects: OperationEffect[];                 // 每个机关的效果
  totalScore: number;
  rating: Rating;
  treasurePointsGained: number;
}

interface SlotSnapshot {
  defId: string;
  quality: Quality;
  slotIndex: number;
}

interface OperationEffect {
  gearDefId: string;
  gearName: string;
  quality: Quality;
  effectiveQuality: Quality;                  // 生效等级（可能被放大镜提升）
  normalEffectText: string;                   // 普通效果描述
  specialTriggered: boolean;
  specialEffectText: string;                  // 特殊效果描述（未触发时为空）
  floatingTexts: string[];                    // 飘字内容列表
  score: number;
  treasurePoints: number;
}

interface AbilityEntry {
  type: AbilityType;
  name: string;
  description: string;
  uses?: number;                              // 可使用指令的剩余次数（展示用）
}

// ===== Reducer Actions =====

type GameAction =
  | { type: 'NEXT_DAY' }
  | { type: 'ACQUIRE_GEAR'; gearDefId: string }
  | { type: 'PLACE_GEAR'; instanceId: string; slotIndex: number }
  | { type: 'REMOVE_GEAR'; slotIndex: number }
  | { type: 'OPERATE'; result: OperationRecord; abilities: AbilityEntry[]; treasureGained: boolean }
  | { type: 'ACQUIRE_TREASURE'; treasureDefId: string }
  | { type: 'REFORGE_CONFIRM'; sacrificeIds: string[] }
  | { type: 'REFORGE_SELECT'; gearDefId: string }
  | { type: 'SET_PENDING_TREASURE'; value: boolean }
  | { type: 'CONSUME_PENDING_ACQUIRE' };
```

## 结算引擎伪代码

```
function settle(slots: (GearInstance | null)[], gearDefs: Map<string, GearDef>):
  effectiveQualities = copy(每个slot的quality)

  // Phase 1: 优先结算放大镜类（按 settlementPriority 排序）
  for each slot sorted by priority (ascending):
    gear = slots[slot]
    if gear is 放大镜:
      for each adjacent slot:
        if adjacent has gear:
          effectiveQualities[adjacent] = min(adjacent.quality + boostLevel, 5)

  // Phase 2: 从左到右结算每个机关
  results = []
  totalScore = 0
  totalTreasurePoints = 0
  abilities = []

  for i = 0 to slots.length:
    gear = slots[i]
    if gear is null: continue
    def = gearDefs[gear.defId]
    eq = effectiveQualities[i]

    // 计算普通效果
    normalValue = def.effect.values[eq - 1]
    normalText = interpolate(def.effect.descriptionTemplate, normalValue)
    floatingTexts = [interpolate(def.effect.floatingTextTemplate, normalValue)]

    // 检查特殊条件
    specialTriggered = checkCondition(def.specialCondition, i, slots)
    specialText = ""
    if specialTriggered:
      specialValue = def.specialEffect.values[eq - 1]
      specialText = interpolate(def.specialEffect.descriptionTemplate, specialValue)
      floatingTexts.push(interpolate(def.specialEffect.floatingTextTemplate, specialValue))

    // 计算分数
    score = def.baseScore[eq - 1] + (specialTriggered ? def.specialScore : 0)
    totalScore += score

    // 珍宝点数
    tp = def.baseTreasurePoints + (条件产生的额外珍宝点数)
    totalTreasurePoints += tp

    // 收集今日能力
    if def.effect.abilityEntry:
      abilities.push(instantiate(def.effect.abilityEntry, normalValue))
    if specialTriggered and def.specialEffect.abilityEntry:
      abilities.push(instantiate(def.specialEffect.abilityEntry, specialValue))

    results.push({ gearDefId, quality, effectiveQuality: eq, normalText, specialTriggered, specialText, floatingTexts, score, tp })

  rating = calculateRating(totalScore, openSlots)
  return { effects: results, totalScore, rating, totalTreasurePoints, abilities }
```

## 配置数据结构

### 槽位成长（progression.ts）

```typescript
const SLOT_PROGRESSION: Record<number, number> = {
  1: 1,   // 第1天: 1槽
  2: 2,   // 第2天: 2槽
  4: 3,   // 第4天: 3槽
  6: 4,   // 第6天: 4槽
  8: 5,   // 第8天: 5槽
  10: 6,  // 第10天: 6槽（满）
};

function getMaxSlots(day: number): number {
  let slots = 1;
  for (const [d, s] of Object.entries(SLOT_PROGRESSION)) {
    if (day >= Number(d)) slots = s;
  }
  return slots;
}
```

### 评分阈值（scoring.ts）

```typescript
// 按已开放槽位数，不同评级的分数阈值
const RATING_THRESHOLDS: Record<number, [number, number, number]> = {
  // [运筹帷幄, 巧夺天工, 天命显化]  低于第一个为平平无奇
  1: [20, 40, 60],
  2: [40, 80, 120],
  3: [60, 120, 200],
  4: [80, 180, 300],
  5: [100, 250, 420],
  6: [120, 320, 550],
};
```

### 珍宝上限递增

```typescript
const BASE_TREASURE_THRESHOLD = 30;      // 初始上限
const TREASURE_THRESHOLD_INCREMENT = 10; // 每次获得珍宝后上限+10

function getTreasureThreshold(treasureCount: number): number {
  return BASE_TREASURE_THRESHOLD + treasureCount * TREASURE_THRESHOLD_INCREMENT;
}
```

---

## 开发阶段

### Phase 1：项目骨架与数据层

**目标**：可运行的空壳 + 完整数据定义

- 初始化 Vite + React + TypeScript 项目（`client/`）
- 配置 `vite.config.ts`（base path: `/tianjiBox/`）
- 定义所有类型（`types/`）
- 编写全部机关配置数据（`data/gears.ts`、`treasures.ts`）
- 编写评分和成长配置（`data/scoring.ts`、`progression.ts`）
- 实现 `GameContext` + `gameReducer` 基础框架
- 实现 `NEXT_DAY` action：推进天数、计算槽位解锁、累积待领取次数、清空今日能力
- 通用组件：`Modal`、`ConfirmDialog`、`Toast`

**验证**：页面渲染，点击下一天能看到天数递增和槽位数变化

### Phase 2：天机盒主界面与机关展示

**目标**：主界面布局完成，能看到槽位和机关

- `TianjiBox` 主界面布局（槽位区 + 按钮区 + 进度条 + 天数显示）
- `Slot` 组件（三种状态：空、已放置、锁定）
- `GearIcon` 组件（品质边框颜色）
- `GearTooltip` 效果浮窗（普通效果 + 特殊效果高亮）
- `TreasureBar` 珍宝点数进度条
- `NextDayButton` 接入 reducer
- 运转按钮状态逻辑（灰色/可用/各种飘字提示）

**验证**：能看到主界面，槽位随天数解锁，按钮状态正确

### Phase 3：机关获取与背包

**目标**：能获取机关、管理背包、上阵机关

- `gearPool.ts`：随机池逻辑（排除满级、排除重复、前两次固定、重随规则）
- `GearAcquire` 三选一界面（展示、重随、升级预览、确认）
- `GearCard` 机关卡片（获取界面用，含升级动效标记）
- 点击【下一天】后自动弹出获取界面（含累积多次领取）
- `Backpack` 背包界面（机关列表、点击上阵/下阵）
- `CategoryFilter` 分类筛选（含灰色不可用状态）
- 上阵交互：点击背包中的机关 → 放入天机盒第一个空槽位；或点击已上阵机关 → 回到背包
- 特殊条件检查：上阵后实时检查每个机关是否满足激活条件，满足则加流光动效

**验证**：完整的"下一天 → 选机关 → 放入天机盒"循环可跑通

### Phase 4：运转引擎与动画

**目标**：运转核心体验完成

- `settlement.ts`：结算引擎（放大镜优先 → 逐个结算 → 分数 → 评级 → 珍宝点数）
- `OperationAnim` 传动动效：
  - 高光从左到右扫过
  - 机关图标放大跳动
  - `FloatingText` 飘字依次弹出
  - 联动连接线特效（放大镜 → 相邻机关）
- `ResultPanel` 运转结果总览：
  - 每个机关缩略图 + 点击展开效果详情
  - 总分 + 评级显示
- 珍宝点数进度条动画（运转后增长）
- `OPERATE` action 更新状态（history、todayAbilities、treasurePoints、hasOperatedToday）

**验证**：运转后能看到完整动画、飘字、结果面板、评分

### Phase 5：珍宝与重铸

**目标**：珍宝循环和重铸系统完成

- 珍宝点数溢出判定 → `pendingTreasure = true`
- `TreasureAcquire` 珍宝二选一界面（华丽特效、重随）
- 珍宝效果实现：
  - **木牛流马**：运转后 `extraOperations++`，运转按钮恢复可用
  - **百宝箱**：运转后弹窗展示 3 个随机机关，直接加入背包
  - **出师表 / 七星灯**：运转时飘字 + 加入今日能力面板展示
- `reforge.ts`：等级计算、自选次数计算
- `Reforge` 重铸界面：
  - 投入机关（最多 2 个，不含珍宝）
  - 等级不足灰色提示
  - 奇数等级二次确认
  - 确认后逐次自选
- `GearSelect` 重铸自选界面（不含珍宝/满级，升级预览）

**验证**：珍宝获取、木牛流马额外运转、百宝箱获取机关、重铸全流程可跑通

### Phase 6：图鉴、记录与今日能力

**目标**：辅助面板全部完成

- `Almanac` 图鉴界面：
  - 分类筛选
  - 灰态未收集 + 已收集当前品质
  - 当前效果 / 满级效果切换
  - 已收集计数（不含珍宝）
- `History` 运转记录：
  - 列表展示（第 X 天、摆放快照、评分）
  - 点击展开详情（每个机关的效果）
  - 翻页（最多 50 条）
- `Abilities` 今日能力面板：
  - 三种类型分别展示
  - 可使用指令点击提示"演示模式"
  - 需激活效果点击飘字展示

**验证**：图鉴正确反映收集状态，历史记录完整，今日能力面板展示正确

### Phase 7：视觉打磨与集成

**目标**：上线就绪

- UI 视觉体系：
  - 品质颜色（白/蓝/紫/橙/红）统一 CSS 变量
  - 流光动效（激活条件满足时）
  - 珍宝界面华丽特效
  - 评级结果动效
- 边界情况处理：
  - 全部满级时的获取/重铸/百宝箱提示
  - 机关池耗尽的降级处理
- 集成到 Portal：
  - 更新 `portal/index.html` 添加天机盒卡片
  - 更新 `Dockerfile` 添加 build stage
  - 更新 `nginx.conf` 添加静态文件路由（纯前端，无需 WebSocket）
  - 更新 `CONTRIBUTING.md` 端口分配表
- 整体测试
