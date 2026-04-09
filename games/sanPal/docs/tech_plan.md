# sanPal：技术方案文档

## 一、技术选型

| 类别 | 选型 | 说明 |
|------|------|------|
| 前端框架 | React 19 + TypeScript 5.6 | 与 sdc2 技术栈统一 |
| 状态管理 | Zustand 5 | 轻量级，支持 `getState()` 避免闭包问题 |
| 战斗动画 | CSS transition + React 状态驱动 | 不引入 Canvas，HP条过渡为 0.3s |
| 构建工具 | Vite 6 | 快速开发热更新 |
| 数据存储 | 内存（运行时）| 单局制，无需持久化（存档功能预留 localStorage） |

> 纯前端单机游戏，不需要后端服务器和 Socket.IO。

---

## 二、架构概览

```
┌──────────────────────────────────┐
│           React UI 层             │
│  App.tsx (phase-based 路由)       │
│  10 个 pages/ 页面组件            │
│  components/ 通用组件             │
├──────────────────────────────────┤
│           Zustand Store 层        │
│  gameStore — 全局游戏状态          │
│  battleStore — 战斗状态           │
├──────────────────────────────────┤
│           Engine 引擎层           │
│  BattleEngine — 伤害/效果/回合     │
│  PassiveSystem — 被动技能          │
│  AIController — 敌方AI            │
│  MapGenerator — 地图随机生成       │
│  CaptureCalc — 捕获概率           │
│  helpers — 属性计算/实例创建        │
├──────────────────────────────────┤
│           Data 数据层             │
│  types.ts — 全部类型定义           │
│  generals.ts — 30位武将数据        │
│  skills.ts — 34个技能数据          │
│  items.ts — 10种道具数据           │
│  synergies.ts — 9组连携数据        │
└──────────────────────────────────┘
```

**核心原则**：
- 引擎层纯函数，不依赖 React，可独立测试
- Store 是唯一的状态源，UI 层只读取 + 调用 action
- 战斗中通过 `useBattleStore.getState()` 获取最新状态，避免 React 闭包过期问题

---

## 三、目录结构

```
games/sanPal/
├── docs/                           # 设计文档
│   ├── game.md                        # 核心系统设计
│   ├── battle_design.md               # 战斗系统设计
│   ├── generals_design.md             # 武将图鉴
│   └── tech_plan.md                   # 技术方案（本文件）
├── src/
│   ├── main.tsx                       # 入口，挂载 App 到 #root
│   ├── App.tsx                        # phase-based 路由，10个页面切换
│   │
│   ├── data/                       # 静态游戏数据（纯常量）
│   │   ├── types.ts                   # 全部 TypeScript 类型 + 五行克制表 + 标签映射
│   │   ├── generals.ts                # 30位武将定义（GeneralDef[]）
│   │   ├── skills.ts                  # 34个技能定义（SkillDef[]）
│   │   ├── items.ts                   # 10种道具定义（ItemDef[]）
│   │   └── synergies.ts              # 9组连携定义（SynergyDef[]）
│   │
│   ├── engine/                     # 游戏引擎（纯逻辑，无 React 依赖）
│   │   ├── BattleEngine.ts           # 伤害计算、效果结算、回合处理、护盾/反击
│   │   ├── PassiveSystem.ts          # 被动技能系统（切换/属性/暴击/受击/技能/治疗/免疫/Boss）
│   │   ├── AIController.ts           # 敌方AI决策（评分法选技能）
│   │   ├── MapGenerator.ts           # Roguelike地图随机生成（3幕配置）
│   │   ├── CaptureCalc.ts            # 捕获概率计算
│   │   └── helpers.ts                # 属性计算、实例创建、随机工具、HP钳制
│   │
│   ├── store/                      # Zustand 状态管理
│   │   ├── gameStore.ts              # 全局状态：phase/act/party/inventory/map
│   │   └── battleStore.ts            # 战斗状态：teams/weather/log/turnNumber
│   │
│   ├── pages/                      # 页面组件（每个对应一个 GamePhase）
│   │   ├── TitleScreen.tsx            # 标题画面
│   │   ├── StarterSelect.tsx          # 开局三选一
│   │   ├── MapScreen.tsx              # 地图探索（节点渲染+队伍栏）
│   │   ├── BattleScreen.tsx           # 战斗界面（回合执行+日志+操作面板）
│   │   ├── CaptureScreen.tsx          # 捕获界面
│   │   ├── ShopScreen.tsx             # 商铺
│   │   ├── RestScreen.tsx             # 休憩（二选一）
│   │   ├── EventScreen.tsx            # 奇遇事件（4种事件×2选项）
│   │   ├── TeamScreen.tsx             # 队伍管理（排序/释放/使用道具）
│   │   └── ResultScreen.tsx           # 结算画面（胜利/失败）
│   │
│   └── styles/                     # 样式
│       ├── variables.css              # CSS变量（五行配色、星级色、阵营色、间距）
│       └── global.css                 # 全局样式（reset、容器、按钮、动画）
│
├── public/                         # 静态资源（暂无）
├── dist/                           # 构建产物
├── index.html                      # HTML入口，viewport meta 禁止缩放
├── package.json                    # React 19, Zustand 5, Vite 6
├── tsconfig.json                   # strict 模式，noUncheckedIndexedAccess
└── vite.config.ts                  # base: '/sanPal/', port 5174
```

---

## 四、页面路由

基于 `GameStore.phase` 字段的条件渲染（无 URL 路由）：

```typescript
type GamePhase =
  | 'title'          // → TitleScreen
  | 'starterSelect'  // → StarterSelect
  | 'map'            // → MapScreen
  | 'battle'         // → BattleScreen
  | 'capture'        // → CaptureScreen
  | 'shop'           // → ShopScreen
  | 'rest'           // → RestScreen
  | 'event'          // → EventScreen
  | 'team'           // → TeamScreen
  | 'result';        // → ResultScreen
```

**页面跳转关系**：
```
title ──resetRun──▶ starterSelect ──confirm──▶ map
                                                │
         ┌──────────────────────────────────────┤
         │  点击节点触发                          │
         ▼                                      │
     battle ──胜利(野将)──▶ capture ──完成──▶ map │
         │   ──胜利(Boss<3)──▶ 生成新幕 ──▶ map  │
         │   ──胜利(Boss=3)──▶ result             │
         │   ──失败──▶ result                     │
         │                                      │
     shop ──离开──▶ map ◀──返回── team            │
     rest ──选择──▶ map                           │
     event ──选择──▶ map                          │
                                                │
     result ──再来一局──▶ title                    │
```

---

## 五、状态管理

### GameStore

```typescript
interface GameState {
  phase: GamePhase;               // 当前界面
  act: number;                    // 当前幕 (1~3)
  party: GeneralInstance[];       // 队伍 (0~4人)
  inventory: {
    items: { itemId: string; count: number }[];
    gold: number;
  };
  mapNodes: MapNode[];            // 当前幕地图
  currentNodeId: string | null;   // 当前位置
  won: boolean | null;            // 通关结果
}
```

初始值：phase='title', act=1, party=[], gold=100, 竹简×5, 金创药×3

### BattleStore

```typescript
interface BattleState {
  playerTeam: GeneralInstance[];  // 玩家方全队（HP可能损耗）
  enemyTeam: GeneralInstance[];   // 敌方全队
  playerActiveIdx: number;        // 当前出战玩家武将索引
  enemyActiveIdx: number;         // 当前出战敌方武将索引
  weather: WeatherState;          // { type, turnsLeft }
  turnNumber: number;             // 回合数（从1开始）
  log: BattleAction[];            // 战斗日志
  isPlayerTurn: boolean;          // UI用
  isBattleOver: boolean;          // 战斗是否结束
  playerWon: boolean | null;      // 胜负
  animating: boolean;             // 防连点
}
```

**关键设计**：BattleScreen 中的 `executeAction` 使用 `useBattleStore.getState()` 在执行过程中读取最新状态，避免 React 闭包导致的过期引用。

---

## 六、引擎模块说明

### BattleEngine.ts（13个导出函数）

| 函数 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `calcDamage` | attacker, defender, skill, weather, turnNumber | `{damage, crit, effectiveness}` | 完整伤害公式 |
| `getHitCount` | skill | number | 解析多段攻击次数 |
| `accuracyCheck` | skill, weather | boolean | 命中判定（浓雾-30%） |
| `applySkillEffects` | skill, attacker, defender | `{actions, attackerPatch, defenderPatch, weatherChange}` | 技能附加效果 |
| `processTurnStart` | general, weather | `{actions, patch, skipTurn}` | 回合开始结算 |
| `applyDamage` | target, rawDamage | `{finalDamage, shieldAbsorbed, patch}` | 护盾优先吸收 |
| `getFirstActor` | a, b, weather, turnNumber | 'a'\|'b' | 先手判定 |
| `confusionSelfDamage` | general | number | 混乱自伤 |
| `calcCounterDamage` | target, incomingDamage | number | 反击伤害 |

### PassiveSystem.ts（8个导出函数）

| 函数 | 触发时机 | 覆盖武将数 |
|------|----------|-----------|
| `onSwitchIn` | 武将切换上场 | 3 (曹操/张飞/张郃) |
| `getPassiveStatMultiplier` | 属性计算 | 8 (许褚/于禁/董卓/魏延/马超/张辽/赵云/蒋钦) |
| `getPassiveCritBonus` | 暴击计算 | 3 (孙策/黄忠/吕布) |
| `onDamageTaken` | 受到伤害后 | 3 (典韦/黄盖/司马懿) |
| `onSkillUsed` | 使用技能后 | 3 (陆逊/庞统/徐晃) |
| `getHealMultiplier` | 治疗计算 | 1 (华佗) |
| `isStatusImmune` | 状态施加前 | 1 (祝融) |
| `processBossPassive` | 回合开始 | 1 (张角) |

### MapGenerator.ts

输入幕数(1~3)，输出 MapNode[] 数组。生成规则：
- 5层节点：起始 → 3层中间（每层2~3节点）→ Boss
- 保证每层必有路径连通
- 保证全局至少1个商铺和1个休憩

### AIController.ts

基于评分法选技能（无换将逻辑）：
- score = power × element_bonus + support_bonus + noise

---

## 七、数据统计

| 数据类型 | 数量 | 分布 |
|----------|------|------|
| 武将 | 30 | ★:5, ★★:8, ★★★:8, ★★★★:6, ★★★★★:3 |
| 技能 | 46 | 含12个debuff/exploit组合技能 |
| 道具 | 10 | 捕获:3, 恢复:3, 战斗:4 |
| 连携 | 9 | 常驻:5, 触发:4（数据定义，逻辑未实装） |
| 事件 | 4 | 各含2个选项 |
| 被动 | 30 | 已实装24个，未实装6个 |

---

## 八、部署适配

本项目作为 monorepo workspace 接入，依赖由根目录统一管理。

| 配置项 | 值 |
|--------|-----|
| URL 路径 | `/sanPal/` |
| 后端端口 | 无（纯静态） |
| Vite base | `/sanPal/` |
| 开发端口 | 5174 |
| workspace 名 | `sanpal` |

Dockerfile（继承共享 deps stage）：
```dockerfile
FROM deps AS build-sanpal
COPY games/sanPal/ games/sanPal/
RUN npm run build -w sanpal
```

nginx：
```nginx
location /sanPal/ {
    alias /app/games/sanPal/dist/;
    try_files $uri $uri/ /sanPal/index.html;
}
```

---

## 九、构建验证

```bash
# 根目录统一安装（首次或依赖变更时）
cd sanSDC2-cc
npm install

# 进入子目录开发
cd games/sanPal
npm run dev          # 开发服务器 http://localhost:5174/sanPal/
npx tsc --noEmit     # TypeScript 类型检查
npx vite build       # 生产构建

# 或从根目录启动
npm run dev -w sanpal
```

---

## 十、开发阶段记录

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | 项目初始化、文档设计 | ✅ |
| Phase 1 | 脚手架搭建、页面路由、竖版布局 | ✅ |
| Phase 2 | 武将/技能/物品/连携数据层、类型定义 | ✅ |
| Phase 3 | 战斗引擎核心（伤害/回合/克制/天气/状态） | ✅ |
| Phase 4 | 战斗UI（血条/技能面板/天气/日志） | ✅ |
| Phase 5 | 地图生成、节点系统、开局选将 | ✅ |
| Phase 6 | 捕获/商铺/休憩/奇遇/队伍管理 | ✅ |
| Phase 7 | AI系统、被动技能全面实装 | ✅ |
| Phase 8 | Bug修复（闭包/多段攻击/精英节点/崩溃） | ✅ |
| Phase 9 | 连携实装、战斗道具、视觉打磨 | 待开发 |
| Phase 10 | 音效、存档、平衡性调优 | 待开发 |
