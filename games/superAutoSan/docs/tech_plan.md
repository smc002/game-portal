# superAutoSan：技术方案文档

## 一、技术选型

| 类别 | 选型 | 说明 |
|------|------|------|
| 前端框架 | React 19 + TypeScript 5.6 | 与 sanPal/sdc2 技术栈统一 |
| 状态管理 | Zustand 5 | 轻量级，`getState()` 避免战斗动画中的闭包问题 |
| 战斗动画 | CSS transition + keyframes | 像素风撞飞/爆炸效果，无 Canvas |
| 拖拽 | HTML5 Drag and Drop API | 商店买入 + 队伍排序 + 合并 |
| 构建工具 | Vite 6 | 快速热更新 |
| 数据存储 | 内存（运行时） | 单局制，无需持久化 |

> 纯前端单机游戏，不需要后端服务器。

---

## 二、架构概览

```
┌─────────────────────────────────────┐
│            React UI 层               │
│  App.tsx (phase-based 路由)          │
│  4 个 pages/ 页面组件                │
│  components/ 通用组件                │
│  animations/ 战斗动画系统             │
├─────────────────────────────────────┤
│            Zustand Store 层          │
│  gameStore — 全局游戏状态             │
│  shopStore — 商店状态                │
│  battleStore — 战斗回放状态           │
├─────────────────────────────────────┤
│            Engine 引擎层             │
│  BattleEngine — 自动战斗结算          │
│  TriggerSystem — 触发器系统          │
│  ShopEngine — 商店刷新/购买/合并      │
│  EnemyGenerator — 敌方队伍生成        │
│  helpers — 属性计算/实例创建           │
├─────────────────────────────────────┤
│            Data 数据层               │
│  types.ts — 全部类型定义              │
│  generals.ts — 45位武将数据           │
│  items.ts — 16种道具数据             │
│  enemyWaves.ts — 敌方波次配置         │
└─────────────────────────────────────┘
```

**核心原则**：
- 引擎层纯函数，不依赖 React，可独立测试
- Store 是唯一的状态源，UI 只读取 + 调用 action
- 战斗引擎一次性计算完整战斗结果，输出动画事件序列，UI 层回放
- 拖拽交互仅在商店阶段生效

---

## 三、目录结构

```
games/superAutoSan/
├── docs/                              # 设计文档
│   ├── game.md                           # 核心系统设计
│   ├── tech_plan.md                      # 技术方案（本文件）
│   ├── enemy_waves.md                    # 敌方波次配置
│   └── sap_reference.md                  # SAP原版数据参考
├── src/
│   ├── main.tsx                          # 入口，挂载 App 到 #root
│   ├── App.tsx                           # phase-based 路由，4个页面切换
│   │
│   ├── data/                          # 静态游戏数据（纯常量）
│   │   ├── types.ts                      # 全部 TypeScript 类型定义
│   │   ├── generals.ts                   # 45位武将定义（GeneralDef[]）
│   │   ├── items.ts                      # 16种道具定义（ItemDef[]）
│   │   └── enemyWaves.ts                # 敌方波次配置（WaveConfig[]）
│   │
│   ├── engine/                        # 游戏引擎（纯逻辑，无 React 依赖）
│   │   ├── BattleEngine.ts              # 自动战斗：输入双方队伍，输出事件序列
│   │   ├── (触发器内联在BattleEngine和ShopStore中)
│   │   ├── ShopEngine.ts                # 商店：刷新池/购买/出售/合并/冻结
│   │   ├── EnemyGenerator.ts            # 敌方生成：优先竞技场→模拟数据→随机
│   │   ├── ArenaStore.ts               # PVE竞技场：localStorage存储玩家胜利阵容（每波20套）；首次启动时从 seedArena 初始化
│   │   ├── seedArena.ts                # 阵容种子（自动生成，由 scripts/playGames.ts 产生）
│   │   ├── SimulateGame.ts              # 模拟对局：自动买牌生成各轮次快照作为敌方池
│   │   └── helpers.ts                   # 工具：实例创建/属性钳制/随机选取/getLeveledAbilityDesc
│   │
│   ├── store/                         # Zustand 状态管理
│   │   ├── gameStore.ts                 # 全局：phase/wave/lives/score/team
│   │   ├── shopStore.ts                 # 商店：slots/items/gold/frozen/tier
│   │   └── battleStore.ts              # 战斗回放：events/currentIndex/speed
│   │
│   ├── pages/                         # 页面组件（每个对应一个 GamePhase）
│   │   ├── TitleScreen.tsx              # 标题画面
│   │   ├── TutorialScreen.tsx           # 新手教学（金币/生命脉冲高亮 + 锁定示范）
│   │   ├── ShopScreen.tsx               # 商店（整区售卖 / 同名升级提示 / mergeMode 计算）
│   │   ├── BattleScreen.tsx             # 战斗回放（结算覆盖层 / 通关庆祝 / 竞技场标签）
│   │   └── GameOverScreen.tsx           # Game Over 结算
│   │
│   ├── components/                    # 通用组件
│   │   ├── GeneralCard.tsx              # 商店武将卡（折后价 / 同名升级提示徽章 / 圆形冻结按钮）
│   │   ├── ItemCard.tsx                 # 商店道具卡（折后价显示 / 圆形冻结按钮）
│   │   ├── TeamSlots.tsx                # 5槽位队伍区域（拖拽排序+合并+XP进度条+属性飘字）
│   │   ├── Tooltip.tsx                  # 通用提示组件（hover + 长按 + 自动方向翻转）
│   │   ├── StatsBar.tsx                 # 顶栏：金币/回合/生命/分数
│   │   └── BattleUnit.tsx               # 战斗中的武将单位（动画状态 + 属性飘字）
│   │
│   ├── animations/                    # 战斗动画
│   │   ├── battleAnimator.ts            # 事件序列 → CSS class 映射
│   │   └── effects.css                  # 关键帧：attack/hurt/faint/screen-shake/summon/buff-glow
│   │                                    #         + stat-float-up（属性飘字）
│   │                                    #         + tutorial-pulse（教学高亮）
│   │                                    #         + merge-glow（同名升级提示）
│   │                                    #         + fadeIn（结算覆盖层）
│   │
│   └── styles/                        # 样式
│       ├── variables.css                 # CSS变量（Tier配色、像素字体、间距）
│       ├── global.css                    # 全局样式（reset、像素风基础、按钮）
│       └── shop.css                      # 商店页专用（拖拽高亮、槽位布局）
│
├── scripts/                          # 开发工具脚本
│   └── playGames.ts                    # 模拟 5 局游戏，生成 src/engine/seedArena.ts
├── public/                            # 静态资源（像素字体等）
├── dist/                              # 构建产物
├── index.html                         # HTML入口
├── package.json                       # React 19, Zustand 5, Vite 6
├── tsconfig.json                      # strict, noUncheckedIndexedAccess
└── vite.config.ts                     # base: '/superAutoSan/', port 5175
```

---

## 四、页面路由

基于 `GameStore.phase` 字段的条件渲染（无 URL 路由）：

```typescript
type GamePhase =
  | 'title'     // → TitleScreen
  | 'tutorial'  // → TutorialScreen
  | 'shop'      // → ShopScreen
  | 'battle'    // → BattleScreen
  | 'gameOver'; // → GameOverScreen
```

**页面跳转关系**：
```
title ──开始──▶ shop ──出战──▶ battle ──胜利──▶ shop（下一关）
                                  │
                                  ├──失败(命>0)──▶ shop（下一关）
                                  │
                                  └──失败(命=0)──▶ gameOver ──再来──▶ title
```

---

## 五、状态管理

### GameStore（全局状态）

```typescript
interface GameState {
  phase: GamePhase;
  wave: number;            // 当前关卡（从1开始，=分数）
  turn: number;            // 当前回合数（决定Tier解锁）
  lives: number;           // 剩余生命（初始5）
  team: GeneralInstance[]; // 己方队伍（0~5）

  // Actions
  startGame: () => void;
  nextWave: () => void;
  loseLife: () => void;
  setPhase: (phase: GamePhase) => void;
  updateTeam: (team: GeneralInstance[]) => void;
}
```

### ShopStore（商店状态）

```typescript
interface ShopState {
  gold: number;                    // 当前金币（每回合重置为10）
  petSlots: (GeneralDef | null)[]; // 商店武将槽（3~5个）
  itemSlots: (ItemDef | null)[];   // 商店道具槽（1~2个）
  frozen: Set<number>;             // 冻结的槽位索引
  tierUnlocked: number;            // 当前解锁的最高Tier
  cannedFoodBonus: { atk: number; hp: number }; // 兵书累计加成

  // Actions
  refreshShop: () => void;         // 刷新（扣1金或免费）
  buyPet: (slotIdx: number, teamIdx: number) => void;
  buyItem: (slotIdx: number, targetIdx: number) => void;
  sellPet: (teamIdx: number) => void;
  mergePet: (fromIdx: number, toIdx: number) => void;
  toggleFreeze: (slotIdx: number) => void;
  reorderTeam: (fromIdx: number, toIdx: number) => void;
}
```

### BattleStore（战斗回放状态）

```typescript
interface BattleState {
  events: BattleEvent[];       // 完整战斗事件序列
  currentEventIdx: number;     // 当前回放到第几个事件
  playerTeam: GeneralInstance[];  // 战斗中的玩家队伍快照
  enemyTeam: GeneralInstance[];   // 战斗中的敌方队伍快照
  speed: 1 | 2 | 3;           // 回放速度
  isPlaying: boolean;          // 是否正在回放
  result: 'win' | 'lose' | 'draw' | null;

  // Actions
  startBattle: (player: GeneralInstance[], enemy: GeneralInstance[]) => void;
  nextEvent: () => void;
  setSpeed: (speed: 1 | 2 | 3) => void;
}
```

---

## 六、引擎模块说明

### BattleEngine.ts — 自动战斗核心

战斗引擎是**纯函数**，输入双方队伍，输出完整的 `BattleEvent[]` 序列。UI 层只负责回放。

```typescript
function executeBattle(
  playerTeam: GeneralInstance[],
  enemyTeam: GeneralInstance[]
): BattleResult {
  return { events: BattleEvent[], result: 'win' | 'lose' | 'draw' };
}
```

**战斗流程**：
1. 复制队伍快照（不修改原数据）
2. 执行所有 `startOfBattle` 触发器，按 ATK 高→低排序
3. 主循环：双方前排互撞
   - 计算伤害（ATK 值直接作为伤害）
   - 应用锦囊效果（铁甲减伤、铁壁吸收、青龙偃月刀加伤等）
   - 检查阵亡 → 执行 Faint 触发器 → 可能召唤新单位
   - 检查击杀 → 执行 Knock out 触发器
   - 前移后方单位
4. 一方全灭或双方同时全灭 → 结束
5. 输出事件序列

**BattleEvent 类型**：

```typescript
type BattleEvent =
  | { type: 'attack'; attackerSide: Side; attackerIdx: number; defenderIdx: number; damage: number }
  | { type: 'hurt'; side: Side; idx: number; hpBefore: number; hpAfter: number }
  | { type: 'faint'; side: Side; idx: number; generalId: string }
  | { type: 'summon'; side: Side; idx: number; general: GeneralInstance }
  | { type: 'buff'; side: Side; idx: number; atk: number; hp: number; temporary: boolean }
  | { type: 'perk_trigger'; side: Side; idx: number; perkId: string; effect: string }
  | { type: 'ability_trigger'; side: Side; idx: number; abilityDesc: string }
  | { type: 'knockback'; side: Side; idx: number }  // 撞飞动画
  | { type: 'shift_forward'; side: Side }            // 队列前移
  | { type: 'battle_start' }
  | { type: 'battle_end'; result: 'win' | 'lose' | 'draw' };

type Side = 'player' | 'enemy';
```

### TriggerSystem.ts — 触发器系统

管理所有 trigger 类型的效果执行。每个武将的 ability 包含 `trigger` 和 `effect`：

```typescript
interface Ability {
  trigger: TriggerType;
  effect: (ctx: TriggerContext) => BattleEvent[];
  level: 1 | 2 | 3;  // 影响效果数值
}

type TriggerType =
  | 'startOfBattle'
  | 'beforeAttack'
  | 'afterAttack'
  | 'hurt'
  | 'faint'
  | 'knockOut'
  | 'friendAheadFaints'
  | 'friendAheadAttacks'
  | 'friendSummoned'
  | 'enemySummoned'
  // 商店阶段触发
  | 'buy'
  | 'sell'
  | 'levelUp'
  | 'startOfTurn'
  | 'endOfTurn'
  | 'friendSold'
  | 'friendEatsFood'
  | 'eatsFood'
  | 'summoned';
```

**触发优先级**：同类触发按 ATK 从高到低执行，ATK 相同随机。

### ShopEngine.ts — 商店逻辑

```typescript
// 刷新商店池：根据当前 Tier 从武将/道具池中随机抽取
function rollShop(tier: number, frozen: Set<number>): ShopSlots;

// 购买武将：扣金币，放入队伍槽位或合并
function buyPet(shop: ShopState, slotIdx: number, teamIdx: number): ShopState;

// 出售武将：返还金币，触发 Sell 效果
function sellPet(team: GeneralInstance[], idx: number): { gold: number; events: ShopEvent[] };

// 合并检测：是否为同 ID 武将
function canMerge(a: GeneralInstance, b: GeneralInstance): boolean;

// 合并执行：属性取高+1，经验+1，检查升级
function mergePets(target: GeneralInstance, source: GeneralInstance): GeneralInstance;

// 使用道具：应用永久/临时/锦囊效果
function useItem(item: ItemDef, target: GeneralInstance): GeneralInstance;
```

### EnemyGenerator.ts — 敌方队伍生成

```typescript
// 根据当前关卡生成敌方队伍
function generateEnemy(wave: number): GeneralInstance[];

// 暴露最近一次生成的元信息（供 BattleScreen 显示来源标签 / 写回竞技场）
function getLastArenaIdx(): number | undefined;
function getLastArenaSavedAt(): number | undefined;
```

生成优先级（依次尝试）：
1. **PVE 竞技场**：从 `ArenaStore.getArenaTeam(wave)` 抽取真实玩家阵容；记录 `arenaIdx` 和 `savedAt`
2. **模拟对局**：从 `SimulateGame.getSimulatedEnemy(wave)` 取预模拟的快照
3. **随机生成**：根据 `enemyWaves.ts` 配置随机抽取（最终回退）

每条路径的结果都会调用 `applyEndlessBonus(team, wave)` 统一施加无尽模式加成。

```typescript
// wave 16+ 二次曲线加成，wave 20 接近 MAX_STAT 上限
function endlessBonus(wave: number): number {
  const d = Math.max(0, wave - 15);
  return d > 0 ? d * 5 + d * d : 0;
}
```

| wave | bonus |
|------|-------|
| 16 | +6 |
| 17 | +14 |
| 18 | +24 |
| 19 | +36 |
| 20 | +50 |

### ArenaStore.ts — PVE 竞技场

```typescript
interface ArenaEntry {
  team: GeneralInstance[];
  savedAt: number;  // Date.now() 写入时间
}

// localStorage 存储格式: Record<wave, ArenaEntry[]>
// 每个 wave 最多 20 套阵容
function getArenaTeam(wave): { team, arenaIdx, savedAt } | null;
function saveArenaTeam(wave, team, defeatedIdx?): void;
```

- localStorage key: `superAutoSan_arena`
- 向后兼容：旧格式（裸 `GeneralInstance[][]`）会自动包装为 `savedAt: 0`
- 取出时重新分配 `instanceId`，**保留** tempAtk/tempHp（临时增益是阵容真实强度的一部分），恢复 `hp = maxHp`
- 保存时也保留 tempAtk/tempHp，仅重置 hp = maxHp
- 满 20 套时，若有 `defeatedIdx` 则替换该位置（胜者替败者），否则随机替换
- BattleScreen 在敌方区域上方显示蓝色小标签：`⚔ 玩家阵容 · 5分钟前 / 2小时前 / 3天前 / yyyy-MM-dd`
- **首次启动种子**：localStorage 为空时，从 `seedArena.ts` 加载 `SEED_ARENA` 写入并标记 `superAutoSan_arena_seeded`，后续不会重复种子。详见"十一·五、阵容种子生成工具"

---

## 七、类型定义

### 武将定义（静态数据）

```typescript
interface GeneralDef {
  id: string;              // 如 'huangjinbing', 'dianwei'
  name: string;            // 如 '黄巾兵', '典韦'
  originalName: string;    // SAP原名如 'Ant', 'Badger'
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  baseAtk: number;
  baseHp: number;
  trigger: TriggerType;
  abilityDesc: string;     // 技能描述文本
  // 效果由 TriggerSystem 根据 id + level 查表执行
}
```

### 武将实例（运行时）

```typescript
interface GeneralInstance {
  defId: string;           // 引用 GeneralDef.id
  instanceId: string;      // 唯一实例ID（uuid）
  atk: number;             // 当前攻击
  hp: number;              // 当前生命
  maxHp: number;           // 最大生命（用于显示血条）
  level: 1 | 2 | 3;
  xp: number;              // 当前经验（0~4）
  perk: string | null;     // 携带的锦囊ID
  tempAtk: number;         // 临时攻击加成（战斗后清零）
  tempHp: number;          // 临时生命加成（战斗后清零）
}
```

### 道具定义

```typescript
interface ItemDef {
  id: string;              // 如 'mantou', 'jinnang'
  name: string;            // 如 '馒头', '锦囊'
  originalName: string;    // SAP原名如 'Apple', 'Honey'
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  cost: number;            // 通常3，安眠药1
  type: 'stat' | 'perk' | 'special';
  // stat: 直接加属性（永久或临时）
  // perk: 赋予锦囊（覆盖旧的）
  // special: 特殊效果（安眠药、兵书、兵法等）
}
```

### 波次配置

```typescript
interface WaveConfig {
  waveRange: [number, number];  // 关卡范围 [from, to]（to = Infinity 表示无上限）
  petCount: [number, number];   // 武将数量范围
  tierRange: [number, number];  // Tier范围
  maxLevel: 1 | 2 | 3;
  levelChance: { lv2: number; lv3: number }; // Lv2/Lv3 概率
  perkChance: number;           // 锦囊概率
  availablePerks: string[];     // 可用锦囊ID列表
}
```

---

## 八、战斗动画设计

### 动画事件映射

| BattleEvent | 动画效果 | 时长 |
|-------------|---------|------|
| attack | 双方前排向中间冲撞（同时播放） | 300ms |
| hurt | 受伤单位闪红 + 震动（同时播放） | 300ms |
| faint | 单位放大 + 白闪 + 缩小消失（`forwards`保持） | 500ms |
| summon | 新单位从下方弹入 + 闪光 | 300ms |
| buff | 绿色光晕 | 400ms |
| perk_trigger | 锦囊图标闪烁 + 对应效果 | 300ms |
| shift_forward | 队列整体前移（同时播放） | 200ms |

**事件批处理**：相同类型的连续事件（如双方同时攻击、同时受伤、同时阵亡）会被批处理为一组，同时播放动画。

### 速度控制

| 速度 | 事件间隔 |
|------|---------|
| 1x | 800ms |
| 2x | 400ms |
| 3x | 200ms |

### 像素风打击感要素
- 攻击瞬间全屏微震（translateX ±2px，50ms）
- 击杀时爆炸粒子散射（8方向色块飞散）
- 伤害数字弹出（带重力抛物线下落）
- 被击飞单位向后旋转滑出画面
- 关键一击（击杀）时短暂慢动作（事件间隔 ×2，持续1个事件）

---

## 九、拖拽交互设计

### 商店阶段拖拽操作

| 操作 | 拖拽源 | 放置目标 | 效果 |
|------|--------|---------|------|
| 购买武将 | 点击商店武将 | 自动入队/合并 | 扣3金 |
| 使用道具 | 点击商店道具 → 点击队伍武将 | 两步操作 | 扣金，应用效果 |
| 队伍排序 | 拖拽队伍武将 | 队伍其他槽位 | 交换位置 |
| 出售武将 | 拖拽队伍武将 | 商店区域上方 | 返还金币 |
| 合并武将 | 拖拽同名武将 | 队伍同ID武将 | 合并升级 |

### 交互视觉反馈
- 拖拽中：卡片半透明跟随鼠标
- 有效目标：槽位边框高亮（绿色）
- 出售区域：拖到商店上方时显示红色"松开出售"提示
- 道具选择模式：道具卡青色发光 + 队伍槽位全部青色高亮 + 提示"点击使用道具"
- 队伍排序：右侧为前排（与战斗视图一致）

---

## 十、部署适配

本项目作为 monorepo workspace 接入，依赖由根目录统一管理。

| 配置项 | 值 |
|--------|-----|
| URL 路径 | `/superAutoSan/` |
| 后端端口 | 无（纯静态） |
| Vite base | `/superAutoSan/` |
| 开发端口 | 5175 |
| workspace 名 | `superautosan` |

Dockerfile（继承共享 deps stage）：
```dockerfile
FROM deps AS build-superautosan
COPY games/superAutoSan/ games/superAutoSan/
RUN npm run build -w superautosan
```

nginx：
```nginx
location /superAutoSan/ {
    alias /app/games/superAutoSan/dist/;
    try_files $uri $uri/ /superAutoSan/index.html;
}
```

---

## 十一、构建验证

```bash
# 根目录统一安装（首次或依赖变更时）
cd sanSDC2-cc
npm install

# 进入子目录开发
cd games/superAutoSan
npm run dev               # 开发服务器 http://localhost:5175/superAutoSan/
npx tsc --noEmit          # TypeScript 类型检查
npx vite build            # 生产构建

# 或从根目录启动
npm run dev -w superautosan
```

---

## 十一·五、阵容种子生成工具（playGames）

### 用途
为 PVE 竞技场 (`ArenaStore`) 生成初始阵容种子，让首次启动游戏的玩家就能遇到"模拟玩家"留下的真实风格阵容，而不是从空池子开始。

### 文件
- `scripts/playGames.ts` — Node 模拟器（依赖 tsx 直接执行 TS）
- `src/engine/seedArena.ts` — **自动生成**的种子数据文件，包含 `SEED_ARENA: Record<wave, SeededArenaEntry[]>`
- `src/engine/ArenaStore.ts` — 首次启动时检测 localStorage 为空，自动用 `SEED_ARENA` 初始化并写入；用 `superAutoSan_arena_seeded` 标志位避免重复种子

### 工作原理
1. 模拟器内置一个 AI 玩家：每回合刷新商店、合并同名武将、买装备/食物（含 `酒` 临时增益）
2. 每回合战斗使用真实的 `executeBattle` + `generateEnemy` 引擎，结果与游戏一致
3. **每次胜利**都把 *战前* 阵容快照（保留全部 tempAtk/tempHp）按 wave 索引保存
4. 跑完 5 局后，把所有快照按关卡分组写入 `seedArena.ts`，每条带 `savedAt` 时间戳和注释

### 用法
```bash
cd games/superAutoSan
npx tsx scripts/playGames.ts
```

输出示例：
```
正在模拟 5 局游戏，每局最多 15 回合...
第 1 局：通关 5/15 关，最终阵容力量 128
  最终阵容: 商贾(L2 11/8+铁骨), 刺客(L2 9/9+铁骨), ...
...
已写入 src/engine/seedArena.ts
关卡 1: 1 套阵容
关卡 2: 1 套阵容
...
总共 31 套阵容写入种子
```

### AI 策略概览
- **购买**：每回合最多 5 次刷新；优先合并同名武将，否则按 Tier 高→低买入新武将
- **道具**：锦囊装备给最厚血肉盾；属性食物加给最强单位；`酒` 给最强单位 +3/+3 临时
- **出售**：4 阶后若队伍已满且持有低 Tier Lv1 武将，出售腾位
- **战斗**：使用真实战斗引擎，胜利计入通关数，失败扣命，归零退出

### 重新生成时机
- 数据层有重大调整（武将数值、道具效果、波次配置）后
- 想刷新种子池子让玩家遇到不同风格阵容时
- 调整 AI 策略后

种子文件直接 commit 到 git，玩家加载时无需额外网络请求。

---

## 十二、开发阶段计划

| 阶段 | 内容 | 预估文件数 | 状态 |
|------|------|-----------|------|
| Phase 0 | 项目初始化、文档设计 | — | ✅ |
| Phase 1 | 脚手架搭建：Vite + React + Zustand + 页面路由 + 像素风基础样式 | ~10 | ✅ |
| Phase 2 | 数据层：45武将 + 16道具 + 波次配置 + 类型定义 | ~4 | ✅ |
| Phase 3 | 商店引擎：刷新/购买/出售/合并/冻结/Tier解锁 | ~3 | ✅ |
| Phase 4 | 商店UI：武将卡片 + 道具卡片 + 5槽位 + 拖拽交互 + 顶栏 + 悬停提示 + XP进度条 | ~7 | ✅ |
| Phase 5 | 战斗引擎：触发器系统 + 自动战斗 + 事件序列 + 事件批处理 | ~3 | ✅ |
| Phase 6 | 战斗UI：回放系统 + 动画效果（爆炸/打击感） + 速度控制 | ~4 | ✅ |
| Phase 7 | 敌方生成 + 关卡流转 + 生命/计分 + Game Over + 战后复活 | ~2 | ✅ |
| Phase 8 | 全触发器实装：战斗触发45个 + 商店触发21个 + 姜维 | ~2 | ✅ |
| Phase 9 | 难度系统（SimulateGame模拟对局）+ 攻击动画方向 + 升级奖励 + 郭嘉被动 | ~3 | ✅ |
| Phase 10 | Portal 接入 + 部署 | ~3 | 待开发 |
| Phase 11 | PVE竞技场（localStorage 玩家阵容池、时间戳、来源标识） | ~2 | ✅ |
| Phase 12 | 体验优化：飘字动画 / 长按 Tooltip / 整区售卖 / 结算覆盖层 / 同名升级提示 / 折后价 / 通关庆祝 / 无尽模式 | ~10 | ✅ |
