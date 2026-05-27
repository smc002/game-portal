# 占城大师：技术方案与实现步骤

## 一、技术栈

| 模块 | 方案 |
| --- | --- |
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite |
| 样式 | Tailwind CSS |
| 状态管理 | demo 阶段优先 Zustand，便于 tick 循环和 UI 解耦 |
| 部署路径 | `/zhanChengMaster/` |
| 运行方式 | 单机前端模拟，无服务端 |

## 二、当前目录结构

```text
games/zhanChengMaster/
├── docs/
│   ├── game.md          # 策划设计方案
│   └── tech_plan.md     # 技术方案与实现步骤
├── src/
│   ├── App.tsx          # 当前 M0 静态入口，后续改为正式对战界面
│   ├── index.css        # 全局样式与 Tailwind 入口
│   └── main.tsx         # React 入口
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 三、目标目录结构

```text
games/zhanChengMaster/src/
├── App.tsx
├── main.tsx
├── index.css
├── components/
│   ├── BattleHud.tsx          # 金币、主城血量、时间等顶部信息
│   ├── CardDeckPanel.tsx      # 当前 6 张兵营卡展示
│   ├── FloatingTextLayer.tsx  # 幸运提示、伤害、金币不足等浮字
│   ├── HexCell.tsx            # 单个六边形格子
│   ├── HexMap.tsx             # 六边形地图渲染
│   └── EventLog.tsx           # 测试日志
├── data/
│   ├── cards.ts               # demo 双方固定兵营卡组
│   ├── buildings.ts           # 主城、金矿、防御塔、兵营基础配置
│   ├── map.ts                 # 六边形地图模板与地块类型
│   └── units.ts               # 士兵数值
├── engine/
│   ├── ai.ts                  # 敌方占地策略
│   ├── combat.ts              # 士兵、建筑、防御塔伤害结算
│   ├── economy.ts             # 金矿与主城产金
│   ├── pathfinding.ts         # 六边形寻路
│   ├── spawn.ts               # 兵营产兵
│   ├── tileReveal.ts          # 占地翻格与兵营抽选
│   └── tick.ts                # 主循环
├── store/
│   └── gameStore.ts           # 局内状态、actions、tick 调度入口
├── types/
│   └── game.ts                # Owner、Hex、Tile、Building、Unit、Card 等类型
└── utils/
    ├── hex.ts                 # axial 坐标、邻接、距离
    └── random.ts              # 权重随机与 demo seed
```

## 四、核心类型草案

```ts
type Owner = 'player' | 'enemy';
type TileKind = 'hidden' | 'question' | 'campLow' | 'campMid' | 'campHigh' | 'mine' | 'tower' | 'empty' | 'base';
type Quality = 'green' | 'blue' | 'purple' | 'orange';

type BarrackCard = {
  id: string;
  name: string;
  quality: Quality;
  unitId: string;
};

type HexCoord = {
  q: number;
  r: number;
};

type Tile = {
  id: string;
  coord: HexCoord;
  kind: TileKind;
  tint: Owner;
  occupiedBy?: Owner;
  revealedFor: Owner[];
  cost?: number;
  buildingId?: string;
};

type Building = {
  id: string;
  tileId: string;
  owner: Owner;
  kind: 'base' | 'mine' | 'tower' | 'barrack';
  hp: number;
  maxHp: number;
  cardId?: string;
  spawnCooldownMs?: number;
  attackTargetId?: string;
};

type Unit = {
  id: string;
  owner: Owner;
  unitId: string;
  tileId: string;
  fromTileId: string;
  toTileId?: string;
  moveProgress: number;
  hp: number;
  targetTileId?: string;
  attackTargetId?: string;
};

type UnitConfig = {
  id: string;
  name: string;
  icon: string;
  hp: number;
  damage: number;
  attackMs: number;
  moveSpeed: number;
  range: number;
  speedLabel: string;
};

type Projectile = {
  id: string;
  owner: Owner;
  sourceTileId: string;
  target: { kind: 'unit'; id: string } | { kind: 'building'; id: string };
  targetTileId: string;
  damage: number;
  progress: number;
  speed: number;
  style: 'arrow' | 'bolt' | 'magic';
};
```

## 五、系统模块

### 地图系统

- 使用 axial 坐标表示六边形格子。
- `utils/hex.ts` 提供邻居、距离、坐标转屏幕位置。
- 初始地图按中心轴对称生成双方染色。
- 主城位于对称位置。
- 地图生成改为半径 8 的程序化对称地图。
- 主城坐标为 `q=-6,r=0` 与 `q=6,r=0`，比外圈更靠近中部。
- 固定 `q=-5,r=0` 与 `q=5,r=0` 为双方主城相邻金矿，保证开局经济地块。
- 地图渲染使用较大六边形画布和缩放后的高视角，单位作为独立小圆点覆盖在地图上。
- 地图视角状态由 `HexMap` 本地维护：`viewScale` 控制缩放，`pan` 控制平移；默认缩放为 100%。
- 默认平移到玩家开局区，保证 100% 视角和窄屏下也能直接看到主城邻接可占领格。
- 支持滚轮缩放、按钮缩放、拖拽平移和重置视角。
- 点击占领由地图层 `pointerup` 统一判定：按下和松开在同一 `data-tile-id` 且移动未超过 6px 时才路由到占领，拖拽不会触发占领。
- 玩家未相邻的格子显示格子本体和染色，但隐藏地块类型、费用与问号文本。
- 可占领条件：
  1. 地块染色为己方。
  2. 地块未占领。
  3. 与己方已占领地块相邻。
  4. 金币足够。

### 占领与翻格

- 点击地块时检查可占领条件。
- 支付费用后立即占领。
- 根据地块类型生成建筑或空地。
- 问号和兵营地块通过 `tileReveal.ts` 抽选结果。
- 抽到高品质兵营时写入 floating text 和日志。
- 占领后刷新周围地块可见性。

### 经济系统

- 双方初始金币 60。
- 主城和金矿每 5 秒产出 10 金币。
- 每个主城/金矿独立累计产金进度，金矿可在地块上展示圆形进度。

### 兵营与士兵

- 每个兵营按固定间隔生产士兵。
- 兵营完成后立即生产 1 个士兵，再进入固定间隔。
- demo 当前兵营周期产兵约 10 秒 1 个。
- 兵营在地块上展示圆形出兵进度。
- 士兵出生在兵营所在格。
- 士兵自动寻路到敌方主城。
- 士兵保存 `fromTileId`、`toTileId` 和 `moveProgress`，以连续位移方式表现，不再按整格瞬移。
- 士兵移动速度使用 `UnitConfig.moveSpeed` 表示每秒经过的格子比例。
- 士兵进入敌方染色格后改色。

### 战斗系统

- 士兵优先攻击当前格或相邻格可攻击目标。
- 没有目标时继续向敌方主城移动。
- 远程士兵、防御塔、主城箭塔攻击时创建 `Projectile`。
- 投射物按像素层连续飞行，命中后才对单位或建筑结算伤害。
- 近战士兵仍即时结算伤害。
- 建筑被摧毁后移除，并将地块改为未占领、染色改为攻击方。
- 主城 HP 为 0 时结束游戏。
- 单局时间上限为 180 秒。
- 超时后统计双方染色格数量，染色格更多的一方获胜。

### 防御塔系统

- 防御塔每次攻击前寻找范围内最近敌方士兵。
- 锁定目标后，目标死亡或离开范围前不换目标。
- 目标无效后重新寻找最近士兵。

### AI 系统

demo 阶段敌方 AI 只需要能形成压力：

- 保持与玩家相同初始金币和收入。
- 每隔固定时间尝试占领一个可占领地块。
- 优先级：金矿 > 高级兵营 > 中级兵营 > 低级兵营 > 问号 > 防御塔。
- 金币不足时等待。

后续再扩展为更接近真人的路线规划和压制策略。

## 六、demo 实现步骤

### Step 1：重构数据与类型

- 新增 `types/game.ts`。
- 新增 `utils/hex.ts`。
- 新增 `data/cards.ts`、`data/map.ts`、`data/buildings.ts`、`data/units.ts`。
- 将当前静态九城 UI 替换为六边形数据渲染。

验收标准：

- 页面显示六边形地图。
- 双方主城在对称位置。
- 可见地块显示类型和费用。
- 未相邻未知地块隐藏类型和费用。

### Step 2：实现占领与翻格

- 新增 `store/gameStore.ts`。
- 实现金币、占领、扣费、翻格。
- 实现问号/兵营品质随机。
- 实现幸运高品质浮字。

验收标准：

- 玩家初始 60 金币。
- 可点击己方染色相邻地块占领。
- 金币不足时有提示。
- 占领问号地块能随机出空地或兵营。

### Step 3：实现经济与建筑

- 实现主城默认金矿收入。
- 实现金矿建筑每 5 秒 +10 金币。
- 实现主城、防御塔、兵营 HP 展示。

验收标准：

- 金币按 5 秒节奏增长。
- 占领金矿后收入增加。
- 地图上能区分建筑类型。

### Step 4：实现兵营产兵与自动推进

- 实现兵营 spawn tick。
- 实现兵营占领完成后的即时产兵。
- 实现士兵实体渲染。
- 实现士兵向敌方主城寻路移动。
- 实现士兵进入敌方染色地块后染色。

验收标准：

- 兵营会持续产生士兵。
- 士兵能以小单位连续移动方式自动向敌方推进。
- 士兵推进会改变格子染色。

### Step 5：实现战斗与胜负

- 实现士兵攻击士兵、建筑、主城。
- 实现远程攻击投射物视觉表现与命中结算。
- 实现防御塔锁定最近士兵攻击。
- 实现建筑摧毁规则。
- 实现主城死亡后的胜负弹层。

验收标准：

- 士兵能摧毁建筑。
- 建筑摧毁后地块变未占领且归进攻方染色。
- 主城 HP 为 0 后结束游戏。

### Step 6：实现敌方 AI 与测试打磨

- 实现敌方自动占地。
- 加入事件日志。
- 调整初始地图、费用、产兵、血量和速度。
- 更新 `docs/game.md` 中的最终 demo 数值。

验收标准：

- 不操作时敌方会扩张。
- 玩家能完整打完一局。
- demo 可用于讨论卡组、概率、兵种和节奏。

## 七、M0 固定数值建议

这些数值只用于第一版 demo，后续根据手感调整。

| 项目 | 建议值 |
| --- | ---: |
| 初始金币 | 60 |
| 主城 HP | 800 |
| 主城产金 | 每 5 秒 +10 |
| 金矿产金 | 每 5 秒 +10 |
| 防御塔 HP | 220 |
| 防御塔射程 | 2 格 |
| 防御塔攻击间隔 | 1 秒 |
| 防御塔伤害 | 20 |
| 兵营 HP | 260 |
| 兵营产兵间隔 | 约 10 秒 |
| 士兵移动间隔 | 0.8 秒 / 格 |
| 单局时间上限 | 180 秒 |

注：当前实现已将 `士兵移动间隔` 调整为 `moveSpeed` 连续移动模型，具体速度按兵种配置。

## 八、开发与构建

```bash
npm install
npm run dev -w zhanchengmaster
npm run test -w zhanchengmaster
npm run build -w zhanchengmaster
```

开发地址：

```text
http://localhost:5178/zhanChengMaster/
```

## 九、开发阶段记录

### M0.1 项目骨架

- 新建 `games/zhanChengMaster/`。
- 接入根 workspace。
- 新建 `docs/game.md` 与 `docs/tech_plan.md`。
- 新建 React/Vite/Tailwind 最小可运行前端。
- 接入 portal、Nginx、Docker 构建路径。

### M0.2 设计校准

- 玩法从九城回合占领修正为 1V1 六边形占地自动战斗。
- 卡组从 8 张修正为 6 张兵营卡。
- 金矿和箭塔改为默认建筑。
- 明确初始金币 60、金矿每 5 秒 +10。
- 明确地块翻开、染色、建筑摧毁、防御塔锁定和自动士兵规则。

### M0.3 计划

- 按本技术方案 Step 1-6 实现可玩 demo。

### M0.3 实现进展

- 新增 `types/`、`data/`、`engine/`、`store/`、`components/` 目录。
- 实现六边形地图渲染与玩家可占领高亮。
- 实现占地扣费、翻格、兵营抽卡、幸运浮字。
- 实现兵营完成后即时产兵，以及周期产兵 tick。
- 实现经济 tick、士兵推进染色、战斗、防御塔锁定和主城胜负。
- 实现敌方基础 AI 自动扩张。
- `npm run build -w zhanchengmaster` 已通过。

### M0.4 体验修正

- 士兵移动从按格跳跃改为小单位连续位移。
- 降低士兵移动速度，强化战线推进可读性。
- 放大地图整体尺寸。
- 未相邻未知格隐藏类型和费用信息。
- 顶部 HUD 增加双方染色格数量、存活士兵数量。
- 增加 180 秒单局时限，超时后按染色格数量判胜。
- 更新 `BattleHud`、`HexMap`、`HexCell`、`tick`、`combat`、`Unit` 类型与单位数值。

### M0.5 远程攻击表现

- 新增 `Projectile` 类型与 `projectiles` 状态表。
- 远程单位、防御塔、主城箭塔攻击时生成投射物。
- 投射物飞行过程中由 `HexMap` 的 `ProjectileLayer` 渲染。
- 箭矢、弩矢、法球使用不同像素样式。
- 投射物命中目标后结算伤害；目标死亡或建筑摧毁走原有死亡/摧毁规则。

### M0.6 战场尺度调整

- 地图从手写半径 4 模板扩展为半径 8 程序化对称地图。
- 双方主城曾随大地图扩展到外圈，当前已调整为更靠中部的 `q=-6` 与 `q=6`。
- 初始视角改为高视角缩放，打开页面即可看到全局。
- 未暴露信息的格子仍显示格子本体和阵营染色，但隐藏类型、费用和实际内容。
- 兵营周期产兵从 4-6 秒调慢到约 10-13 秒。

### M0.7 视野与可读性修正

- 双方主城从最外圈移动到 `q=-6` 与 `q=6`，更靠近中部。
- 初始视角从 `0.55` 缩放到 `0.45`，确保能看到地图边缘。
- 地图背景和地格染色整体提亮。
- 未邻接未知地格不再显示问号文本，仅显示地格本体和染色。

### M0.8 地图视角控制

- `HexMap` 新增本地视角状态，游戏状态不受视角操作影响。
- 支持鼠标滚轮缩放地图。
- 支持按住地图拖拽平移。
- 支持 `+`、`-` 和 `重置` 控件。
- 拖拽超过阈值时不会触发格子占领，避免误操作。

### M0.9 视角控制修复

- 默认缩放从 45% 改为 100%。
- 最大缩放提高到 160%。
- 拖拽事件收窄到地图视口层，缩放控件停止事件冒泡，修复 `+/-` 点击被拖拽逻辑干扰的问题。

### M0.10 地块点击修复

- 地块自身 `pointerdown` 停止冒泡，避免触发父级地图拖拽。
- 地块 `click` 直接触发占领逻辑，非可占领格点击不执行占领。
- 可占领格标题增加 `可占领` 前缀，便于测试和区分。

### M0.13 点击/拖拽判定重构

- 地图层统一处理 `pointerdown/move/up`。
- 记录鼠标按下起点，累计位移超过 6px 后判定为拖拽并平移地图。
- 未超过阈值时，松开鼠标后根据当前位置下方的 `data-tile-id` 查找格子并执行占领。
- 移除格子层阻止拖拽的逻辑，解决只能在格子边缘拖动的问题。

### M0.14 建筑与士兵可读性

- 完成建筑使用更深的占领态颜色，避免与可点击地块高亮混淆。
- `Building` 新增/使用 `goldElapsedMs` 与 `spawnElapsedMs` 展示进度。
- 金矿显示圆形产金进度条，兵营显示圆形出兵进度条。
- `UnitConfig` 新增 `icon` 字段。
- 士兵圆点显示缩小汉字图标，用于区分步卒、弓兵、骑兵、术士、盾卫、铁骑。

### M0.15 回归测试与点击提示修复

- 接入 Vitest，新增 `npm run test -w zhanchengmaster`。
- 新增 `src/engine/actions.test.ts`，覆盖金币不足提示、不可占领提示、成功占领开局金矿。
- 新增 `src/components/HexMap.test.ts`，覆盖地图点击路由逻辑。
- 修复地图点击路由：玩家已知且未占领的格子都会进入 `tryOccupyTile`，由逻辑层统一决定成功、金币不足或不可占领提示。
- 金币不足/不可占领提示同时写入 `floatingTexts` 和 `logs`，增强可见性并方便测试断言。

### M0.16 点击占领回归修复

- 占领点击从格子 button `click` 改为地图层 `pointerup` 统一处理，避免拖拽使用 `setPointerCapture` 后吞掉格子点击。
- 新增 `getTileIdFromElement` 与 `resolvePointerUpOccupyTileId` 纯函数测试，覆盖短按占领、拖拽不占领、按下/松开不同格不占领。
- 默认 100% 视角增加初始平移，确保窄屏下玩家主城邻接金矿可见并可直接测试。

### M0.11 开局经济保障

- 新增主城相邻金矿规则。
- 玩家侧固定 `q=-5,r=0` 为金矿，敌方侧固定 `q=5,r=0` 为金矿。
- 两个金矿开局均与主城相邻，可被对应阵营优先占领。

### M0.12 HUD 对比度修正

- 中央信息块改为深色实底。
- 倒计时改为琥珀色高对比数字块，并提升字号。
- 解决亮色页面背景下倒计时不易辨认的问题。
