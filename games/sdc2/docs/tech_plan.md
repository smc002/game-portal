# 搜打撤 Demo：技术方案文档

## 一、技术选型

| 类别 | 选型 | 说明 |
|------|------|------|
| 前端框架 | React + TypeScript | 生态成熟，适合复杂UI状态管理 |
| 战斗演出 | 纯CSS/DOM动画 | CSS transition/animation + React状态驱动，不引入Canvas引擎 |
| 后端 | Node.js + TypeScript | 与前端共享类型和代码 |
| 实时通信 | Socket.IO | 房间机制管理全局大地图，双向实时通信 |
| 客户端状态 | Zustand | 轻量状态管理，服务端为权威源，客户端仅管理UI状态 |
| 地图渲染 | SVG/DOM | 节点连线图，CSS控制城池状态样式 |
| 构建工具 | Vite（前端）+ tsx（服务端） | 快速开发热更新 |
| 数据存储 | 内存 | Demo阶段不需要数据库，所有状态存服务端内存 |

---

## 二、架构概览

```
┌─────────────┐     WebSocket      ┌──────────────┐
│  React 客户端 │ ◄──────────────► │ Node.js 服务端 │
│  (纯UI+动画)  │                  │  (状态权威)     │
└──────┬──────┘                   └──────┬───────┘
       │                                 │
       └──────── /shared ────────────────┘
              (战斗引擎、武将数据、类型定义)
```

**核心原则：服务端权威架构**
- 所有游戏状态（玩家数据、地图物资、战斗演算）由服务端统一管理
- 客户端仅负责渲染和用户输入，不做逻辑判定
- 战斗引擎为前后端共享的纯逻辑模块，服务端演算，客户端消费事件流播放动画

---

## 三、项目目录结构

```
sanSDC2-cc/
├── docs/                        # 设计文档
│   ├── game.md                  # 核心系统设计
│   ├── battle_design.md         # 战斗系统设计
│   ├── generals_design.md       # 武将设计图鉴
│   └── tech_plan.md             # 本文档：技术方案
│
├── shared/                      # 前后端共享代码
│   ├── types/                   # TypeScript 类型定义
│   │   ├── player.ts            # 玩家、金币、兵书类型
│   │   ├── hero.ts              # 武将实体、阵营、职业枚举
│   │   ├── battle.ts            # 战斗输入/输出、事件类型
│   │   ├── map.ts               # 城池、地图节点类型
│   │   └── items.ts             # 物资、道具类型
│   ├── battle/                  # ATB 战斗引擎（纯逻辑）
│   │   ├── engine.ts            # 战斗主循环（Tick → ATB → 行动 → 判定）
│   │   ├── mechanics.ts         # 核心机制接口（DealDamage、Heal、AddShield 等）
│   │   ├── skills.ts            # 武将技能实现
│   │   └── events.ts            # 战斗事件定义与发射器
│   └── data/                    # 静态游戏数据
│       ├── heroes.ts            # 武将图鉴数据（属性、技能引用）
│       ├── tomes.ts             # 兵书数据
│       ├── maps.ts              # 城池配置（12城不规则网状拓扑）
│       ├── items.ts             # 物资变体（4品质11种）、可使用物品定义、80/20概率分配、搜索时长
│       └── npcFormations.ts     # NPC武将阵容预设（强力NPC满星/弱NPC1星）
│
├── server/                      # Node.js 服务端
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # 入口，HTTP + Socket.IO 初始化
│       ├── rooms/               # 房间管理
│       │   ├── room.ts          # 房间实例（全局地图状态、物资池、玩家列表）
│       │   └── manager.ts       # 房间创建/匹配/销毁
│       ├── handlers/            # Socket 事件处理器
│       │   ├── lobby.ts         # 局外：兵书选择、出征
│       │   ├── movement.ts      # 移动读条、到达判定
│       │   ├── explore.ts       # 搜索、伏击、物资分配
│       │   ├── encounter.ts     # 遭遇触发、逃跑、偷袭
│       │   ├── battle.ts        # 战斗调度：调用 shared 引擎，推送事件流
│       │   ├── loot.ts          # 战后掠夺、撤离结算
│       │   └── squad.ts         # 武将管理：抽取、编队、升星
│       ├── npc/                 # NPC 系统
│       │   ├── patrol.ts        # 巡逻NPC路径与移动逻辑（延迟60秒生成）
│       │   └── npcEncounter.ts  # NPC遭遇处理（强力NPC战斗+弱NPC遭遇）
│       └── state/               # 服务端状态
│           └── player.ts        # 玩家会话状态（局外资产 + 局内状态）
│
├── client/                      # React 前端
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx             # 入口
│       ├── App.tsx              # 路由/场景切换
│       ├── hooks/               # 自定义 Hook
│       │   ├── useSocket.ts     # Socket.IO 连接管理
│       │   └── useGameState.ts  # Zustand store 封装
│       ├── stores/              # Zustand 状态
│       │   └── gameStore.ts     # 全局游戏状态（由服务端同步驱动）
│       ├── pages/               # 页面级组件
│       │   ├── Lobby.tsx        # 局外安全屋（金币、兵书、出征）
│       │   └── InGame.tsx       # 局内主界面（地图 + 底部操作区）
│       ├── components/          # UI 组件
│       │   ├── map/             # 地图相关
│       │   │   ├── GameMap.tsx   # SVG 节点连线地图
│       │   │   └── CityNode.tsx # 城池节点（资源状态、玩家标记）
│       │   ├── squad/           # 编队相关
│       │   │   ├── Formation.tsx # 5 槽编队区 + 备战席
│       │   │   ├── HeroCard.tsx # 武将卡牌（国别、职业、星级、技能tooltip）
│       │   │   └── Inventory.tsx # 背包（物资 + 道具）
│       │   ├── battle/          # 战斗演出
│       │   │   ├── BattleScene.tsx  # 战斗浮层主容器（双方阵容+ATB模拟）
│       │   │   ├── HealthBar.tsx    # 双方全局血量条
│       │   │   ├── HeroBattleCard.tsx # 战斗中武将卡（含ATB进度条+阵亡状态）
│       │   │   ├── DamageNumber.tsx  # 悬浮伤害数字
│       │   │   └── BuffIndicator.tsx # Buff/Debuff 飘字
│       │   ├── CenterFloat.tsx      # 屏幕中央飘字（关键事件醒目提示）
│       │   ├── hud/             # HUD 元素
│       │   │   ├── TopBar.tsx   # 顶部状态栏（血量、兵书、金币价值）
│       │   │   └── ActionBar.tsx # 底部操作区（搜索/伏击/道具）
│       │   └── modals/          # 弹窗
│       │       ├── EncounterModal.tsx  # 遭遇预警（迎战/退避）
│       │       ├── LootModal.tsx      # 战后掠夺二选一
│       │       └── RerollModal.tsx    # 点将台（开局武将发放与换将）
│       └── styles/              # 样式
│           ├── battle.css       # 战斗动画（冲刺、受击抖动、ATB光效）
│           └── global.css       # 全局样式
│
├── portal/                      # 游戏总览页（纯静态）
│   └── index.html               # 卡片式游戏入口页
│
├── package.json                 # 根 workspace 配置（workspaces: ["games/*"]）
├── package-lock.json            # 统一依赖锁定（所有 workspace 共享）
├── Dockerfile                   # 多阶段构建（deps → build → runtime）
├── nginx.conf                   # Nginx 反代配置（Portal + 游戏静态 + WebSocket）
├── docker-entrypoint.sh         # 容器启动脚本（Nginx + Node）
└── .dockerignore                # Docker 构建排除规则
```

---

## 四、核心模块设计

### 4.1 Socket.IO 事件协议

**客户端 → 服务端（请求）**

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `lobby:select_tomes` | `{tomeIds: string[]}` | 选择兵书 |
| `lobby:deploy` | `{}` | 出征入局 |
| `game:move` | `{targetCityId: string}` | 移动至目标城池 |
| `game:search_start` | `{}` | 开始搜索 |
| `game:search_stop` | `{}` | 停止搜索 |
| `game:ambush` | `{}` | 进入伏击状态 |
| `game:ambush_attack` | `{targetPlayerId: string}` | 伏击发动偷袭 |
| `encounter:fight` | `{}` | 选择迎战 |
| `encounter:flee` | `{}` | 选择退避 |
| `loot:choose` | `{choice: 'hero' \| 'resources'}` | 掠夺选择 |
| `squad:use_star` | `{filter: {type: 'faction'\|'class', value: string}}` | 使用将星 |
| `squad:update_formation` | `{formation: (string\|null)[5]}` | 更新编队排布 |
| `squad:reroll` | `{slot: number, useGold: boolean}` | 开局换将 |
| `game:use_item` | `{itemId: string}` | 使用道具 |
| `game:evacuate` | `{}` | 撤离读条 |
| `game:quit` | `{}` | 弃权退出 |

**服务端 → 客户端（推送）**

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `state:sync` | `{完整玩家可见状态}` | 全量状态同步（入局时） |
| `state:patch` | `{差量更新}` | 增量状态更新 |
| `map:update` | `{城池变更数据}` | 地图物资/玩家变化 |
| `map:npc_move` | `{npcId, from, to}` | NPC位置广播 |
| `encounter:alert` | `{敌方预估战力, 类型}` | 遭遇预警弹窗（狭路相逢/遭遇偷袭） |
| `battle:events` | `{BattleEvent[]}` | 战斗事件流（动画用） |
| `battle:result` | `BattleResultPayload{winner, playerA/B, events, formationA/B, maxHpA/B, nameA/B}` | 战斗结果（含双方阵容快照） |
| `loot:options` | `{可选武将, 可选物资}` | 掠夺选项 |
| `game:initial_heroes` | `{heroes: HeroInstance[], freeRerolls: number[]}` | 开局武将发放（per-slot免费次数数组） |
| `game:search_tick_start` | `{duration: number, rarity: 'gray'\|'green'\|'blue'\|'orange'}` | 搜索进度开始（品质决定时长） |
| `game:search_found` | `{item: Item}` | 搜索发现物品 |
| `encounter:npc_alert` | `{npcId, npcName, npcPower}` | 强力NPC遭遇预警 |
| `notification` | `{type, message, data?}` | 通用提示（data.centerFloat=true走中央飘字） |

### 4.2 ATB 战斗引擎（shared/battle）

战斗引擎为纯函数模块，不依赖任何运行时环境：

```typescript
// 输入
interface BattleInput {
  playerA: CombatantEntity;
  playerB: CombatantEntity;
}

// 输出
interface BattleOutput {
  winner: 'A' | 'B';
  playerA: { remainingHP: number; shield: number };
  playerB: { remainingHP: number; shield: number };
  events: BattleEvent[];  // 有序事件流，前端按序播放
}

// 发送给客户端的扩展结果（含阵容快照）
interface BattleResultPayload extends BattleOutput {
  formationA: (HeroInstance | null)[];
  formationB: (HeroInstance | null)[];
  maxHpA: number;
  maxHpB: number;
  nameA: string;
  nameB: string;
}

// 事件类型
type BattleEvent =
  | { type: 'action_start'; heroId: string; position: number; tick: number }
  | { type: 'damage'; target: 'A' | 'B'; amount: number; isTrueDamage: boolean; tick: number }
  | { type: 'heal'; target: 'A' | 'B'; amount: number; tick: number }
  | { type: 'shield'; target: 'A' | 'B'; amount: number; tick: number }
  | { type: 'buff_applied'; target: string; buffName: string; stacks: number; tick: number }
  | { type: 'buff_removed'; target: string; buffName: string; tick: number }
  | { type: 'atb_modified'; heroId: string; position: number; amount: number; tick: number }
  | { type: 'hero_defeated'; heroId: string; tick: number };

// 引擎主函数
function runBattle(input: BattleInput): BattleOutput;
```

**执行流程：**
1. 初始化 → 结算兵书开局效果，所有武将ATB归零
2. Tick循环 → 每Tick所有存活武将 `ATB += Speed * DeltaTime`
3. ATB满 → 重置ATB → 执行技能（站位寻址 + 标签计数）→ 结算DOT
4. 伤害后判定 → HP <= 0 则结束，输出事件流

### 4.3 战斗CSS动画方案

不使用Canvas，所有战斗演出通过CSS实现：

| 动效 | CSS 实现方式 |
|------|-------------|
| 武将行动冲刺 | `transform: translateX()` + `transition` |
| 受击抖动 | `@keyframes shake` 应用于血量条容器 |
| 伤害数字弹出 | `@keyframes float-up` + `opacity` 渐隐 |
| ATB条增长 | `width` 过渡 + 背景渐变色 |
| ATB异常变化 | 高亮 `box-shadow` 脉冲动画 |
| Buff飘字 | `@keyframes` 向上飘出 + 淡出 |
| 真伤特殊标记 | 不同颜色class（如紫色表示真伤） |

前端通过遍历 `BattleEvent[]`，按 `tick` 时间戳依次触发对应DOM状态变更和CSS class切换。

### 4.4 服务端状态模型

```typescript
// 房间 = 一局游戏
interface GameRoom {
  id: string;
  players: Map<string, PlayerState>;
  cities: Map<string, CityState>;       // 城池及物资
  npcPatrols: NPCPatrol[];              // 巡逻NPC
  phase: 'waiting' | 'running' | 'ended';
}

// 城池
interface CityState {
  id: string;
  name: string;
  connections: string[];                 // 相邻城池ID
  dangerLevel: number;                   // 危险度
  resources: ResourcePool;               // 剩余可搜物资（全服共享）
  depleted: boolean;                     // 是否枯竭
  hasBlackMarket: boolean;               // 是否有黑市
  isEvacPoint: boolean;                  // 是否撤离点
  presentPlayers: string[];              // 当前在场玩家
  ambushPlayers: string[];               // 伏击中玩家
}

// 玩家状态
interface PlayerState {
  // 局外资产
  gold: number;
  ownedTomes: Tome[];

  // 局内状态
  currentCityId: string;
  isMoving: boolean;
  moveTarget: string | null;
  moveProgress: number;                  // 移动读条进度

  hp: number;
  maxHp: number;
  shield: number;

  formation: (Hero | null)[];            // 上阵5槽
  bench: Hero[];                         // 备战席
  inventory: Item[];                     // 背包
  activeTomes: Tome[];                   // 本局携带兵书

  fleeCount: number;                     // 剩余逃跑次数
  starPurchaseCount: number;             // 将星购买次数（影响价格）
  status: 'exploring' | 'searching' | 'ambushing' | 'moving' | 'in_battle';
  // UI显示: 驻扎中 | 搜索中 | 伏击中 | 行军中 | 交战中
}
```

---

## 五、开发阶段规划

### 第一阶段：基础骨架
- 搭建 monorepo（根 workspace + client/server/shared）
- React + Vite 初始化，Socket.IO 连通
- shared 类型定义，前后端引用验证

### 第二阶段：局外系统
- 安全屋UI（金币显示、兵书列表、选择携带、出征按钮）
- GM指令（+10000金币）
- 出征流程 → 进入局内

### 第三阶段：大地图与探索
- SVG节点连线地图渲染
- 移动读条机制
- 搜索机制（服务端物资池消耗 → 客户端背包更新）
- 伏击状态

### 第四阶段：战斗系统
- ATB引擎核心循环实现
- 核心机制接口（DealDamage、Heal、AddShield、ModifyATB、AddBuff、CountTags）
- 四君主技能实现 + 部分武将技能
- 战斗CSS动画回放

### 第五阶段：武将与编队
- 武将数据录入（40+武将属性与技能）
- 编队UI（拖拽排序、升星合并）
- 将星抽取（阵营/职业筛选）
- 开局发放与换将（点将台）

### 第六阶段：遭遇与结算
- 遭遇触发逻辑（搜索概率、伏击偷袭、黄雀在后）
- 战前预警弹窗（迎战/退避）
- 战后掠夺二选一
- 撤离读条与结算（物资→金币）
- 死亡惩罚

### 第七阶段：NPC与道具
- 巡逻NPC路径逻辑与全服广播
- 战术道具实现（血瓶、虚张声势、侦察兵、加速药水）
- 黑市系统（物资换将星，价格递增）

### 优化批次（Phase 6后）
1. 战斗UI完善：服务端发送BattleResultPayload含双方阵容快照，客户端ATB模拟，阵亡状态
2. 地图扩充：6城→12城不规则网状拓扑（viewBox 900x720），NPC减为1个（吕布）
3. NPC机制改进：延迟60秒出现，地图红色箭头显示移动目标
4. NPC战斗表现：强力NPC遭遇走真实战斗流程（npcFormations.ts预设5星阵容）
5. 坐标偏移修复：SVG和城市div统一参考系（内层position:relative容器）→ 升级为固定aspect-ratio容器 + preserveAspectRatio="none"
6. 遭遇频率提高：搜索8%/到达35%/弱NPC 6%（1星3武将可击败，获战利品）
7. 中央飘字：CenterFloat组件，notification.data.centerFloat=true触发
8. 点将台独立刷新：freeRerolls改为per-slot number[]数组
9. 战斗节奏减慢：EVENT_INTERVAL从120ms调至360ms（3倍减速）
10. 搜索系统重构：先roll物品再按品质决定搜索时长（灰1s/绿2s/蓝3s/橙5s），城池上方显示品质色进度条。物资拆分为11种具体物品（粮草/铁矿石/金锭/夜明珠等），80%概率搜到物资、20%搜到可使用物品，物资品质分布随城池危险度提升
11. UI布局重构：编队面板常驻右侧竖排（280px），移除折叠按钮
12. 背包/兵法可交互：背包按钮展开物品列表面板，兵法按钮显示tooltip描述
13. 主界面文字放大：关键文字增大约30%（用户名20px、按钮18px等）
14. 搜索飘字改进：显示具体物品名称+金额，颜色对应品质（灰/绿/蓝/橙）
15. 中等NPC系统：2星4武将400HP，4%/tick搜索触发，遭遇弹出选择界面（迎战/逃离）
16. NPC遭遇统一改为选择制：弱/中NPC遭遇均弹出EncounterModal，玩家可选迎战或逃离（消耗逃跑次数，不掉物资）

---

## 六、登录与身份

- **无账号系统**：玩家输入用户名即可登录，不需要密码或注册
- 服务端以 `socketId + username` 标识玩家会话
- 用户名仅用于局内显示，不做唯一性校验（Demo阶段）
- 断线重连：基于socketId尝试恢复会话，失败则需重新输入用户名

---

## 七、部署架构

### Monorepo 结构（npm workspaces）

根目录 `package.json` 声明 `"workspaces": ["games/*"]`，所有子项目共享依赖（vite、react、typescript 等），统一由根目录 `package-lock.json` 锁定版本。

```
sanSDC2-cc/
├── package.json          ← workspaces: ["games/*"]
├── package-lock.json     ← 统一 lock 文件
├── node_modules/         ← 依赖提升到根目录
├── games/
│   ├── sdc2/             ← workspace（含嵌套 workspaces: shared/client/server）
│   ├── sanPal/           ← workspace（纯前端）
│   ├── rglike/           ← workspace（纯前端）
│   ├── superAutoSan/     ← workspace（纯前端）
│   ├── tianjiBox/        ← 独立项目（无根 package.json，不参与 workspace）
│   └── zhongyi/          ← 纯静态 HTML，无 package.json
```

**开发命令**：
```bash
# 根目录统一安装所有依赖
npm install

# 启动指定游戏开发服务器
npm run dev -w sanpal
npm run dev -w san-sdc2
npm run dev -w superautosan
npm run dev -w rglikeproject-temp

# 或进入子目录运行
cd games/sanPal && npm run dev
```

> tianjiBox 因目录结构为 `games/tianjiBox/client/`（无根 package.json），不参与 workspace，需在 `games/tianjiBox/client/` 下独立 `npm install`。

### 整体部署结构

```
Portal (/)            ← 静态总览页，列出所有游戏入口
  └── /sdc2/          ← 三国搜打撤（React SPA + WebSocket）
  └── /sanPal/        ← 三国武将录（纯静态前端）
  └── /tianjiBox/     ← 天机盒（纯静态前端）
  └── /rglike/        ← 三国自走棋（纯静态前端）
  └── /superAutoSan/  ← 超级自走三国（纯静态前端）
  └── /zhongyi/       ← 杏林春满（纯静态单 HTML）
```

### 容器架构（单 Docker 容器）

- **Nginx**（端口 80）：Portal 静态托管 + 各游戏静态文件 + WebSocket 反代
- **Node.js**（端口 3001）：搜打撤游戏服务端

### 路由规则

| 路径 | 处理方 | 说明 |
|------|--------|------|
| `/` | Nginx → `portal/index.html` | 游戏总览页 |
| `/sdc2/` | Nginx → `client/dist/` | 搜打撤前端 SPA |
| `/sdc2/socket.io/` | Nginx → Node:3001 | WebSocket 反代 |
| `/sanPal/` | Nginx → 静态文件 | 三国武将录 SPA |
| `/tianjiBox/` | Nginx → 静态文件 | 天机盒 SPA |
| `/rglike/` | Nginx → 静态文件 | 三国自走棋 SPA |
| `/superAutoSan/` | Nginx → 静态文件 | 超级自走三国 SPA |
| `/zhongyi/` | Nginx → 静态文件 | 杏林春满 |
| `/health` | Nginx → Node:3001 | 健康检查 |

### Docker 构建架构

Dockerfile 采用 **共享依赖 + 多阶段构建**：

```
deps stage        ← 根 workspace npm ci，安装所有依赖（可缓存）
  ├── build-sdc2       ← 继承 deps，拷贝 sdc2 源码并构建
  ├── build-sanpal     ← 继承 deps，拷贝 sanPal 源码并构建
  ├── build-rglike     ← 继承 deps，拷贝 rglike 源码并构建
  └── build-superautosan ← 继承 deps，拷贝 superAutoSan 源码并构建
build-tianjibox   ← 独立 stage（不在 workspace 中）
runtime stage     ← 收集所有构建产物 + sdc2 server 生产依赖
```

### 部署目标

- 阿里云 SAE（Serverless 应用引擎），按量付费，闲时缩容到 0
- Docker 镜像推送到 ACR（容器镜像服务）

### 关键文件

| 文件 | 用途 |
|------|------|
| `package.json` | 根 workspace 配置 |
| `package-lock.json` | 统一依赖锁定 |
| `portal/index.html` | 游戏总览页（纯静态） |
| `Dockerfile` | 多阶段构建（deps → build → runtime） |
| `nginx.conf` | 静态托管 + 反代规则 |
| `docker-entrypoint.sh` | 同时启动 Nginx + Node |

### 构建命令

```bash
npm install                        # 根目录安装所有 workspace 依赖
npm run build -w san-sdc2          # 构建 sdc2（client + server）
docker build -t san-portal .       # 构建 Docker 镜像
docker run -p 80:80 san-portal     # 本地测试
```

---

## 八、关键约定

1. **共享代码**：`shared/` 目录下的代码必须是纯逻辑，不依赖浏览器API或Node.js特有API
2. **战斗解耦**：战斗引擎只产出事件流，不关心如何渲染；前端只消费事件流，不关心如何演算
3. **服务端权威**：客户端不做任何游戏逻辑判定，所有操作发送请求等服务端确认
4. **TypeScript严格模式**：全项目启用 `strict: true`，共享类型确保前后端一致
5. **事件命名规范**：`模块:动作` 格式（如 `game:move`、`battle:events`）
