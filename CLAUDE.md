# 项目开发规则

## 文档同步规则

每轮迭代开发完成后，必须将代码变更反向同步到对应游戏的 `docs/` 下的设计文档。

### sdc2 文档

- `games/sdc2/docs/game.md` — 核心系统设计（地图、遭遇概率、开局机制、UI交互等）
- `games/sdc2/docs/battle_design.md` — 战斗系统设计（ATB引擎、UI布局、事件类型等）
- `games/sdc2/docs/tech_plan.md` — 技术方案（目录结构、Socket事件协议、类型定义、开发阶段记录）
- `games/sdc2/docs/generals_design.md` — 武将设计图鉴（武将属性、技能描述）

### sanPal 文档

- `games/sanPal/docs/game.md` — 核心系统设计（Roguelike地图、捕获机制、物品系统、UI交互等）
- `games/sanPal/docs/battle_design.md` — 战斗系统设计（回合制引擎、天气、状态、连携、AI等）
- `games/sanPal/docs/tech_plan.md` — 技术方案（目录结构、类型定义、开发阶段记录）
- `games/sanPal/docs/generals_design.md` — 武将图鉴设计（武将属性、技能、连携组合）

### tianjiBox 文档

- `games/tianjiBox/docs/game.md` — 核心系统设计（机关收集、摆放、运转、评分、珍宝、重铸等）
- `games/tianjiBox/docs/gearDesign.md` — 机关列表设计（兵书、算筹、符节、奇械、珍宝的属性与效果）
- `games/tianjiBox/docs/tech_plan.md` — 技术方案（目录结构、类型定义、开发阶段记录）

### zhongyi 文档

- `games/zhongyi/docs/症状证型方剂表.md` — 症状-证型-方剂对照表
- `games/zhongyi/docs/药材属性方剂表.md` — 药材属性与方剂对照表

### rglike 文档

- `games/rglike/docs/game-design.md` — 核心系统设计（游戏流程、阶段、招募、商店等）
- `games/rglike/docs/hero-design.md` — 武将设计图鉴（武将属性、技能、被动）
- `games/rglike/docs/item-design.md` — 装备设计（装备属性、效果、价格）

### tetris 文档

- `games/tetris/docs/game.md` — 核心系统设计（棋盘、7种方块、SRS旋转、计分、等级、UI）
- `games/tetris/docs/tech_plan.md` — 技术方案（目录结构、类型定义、引擎模块、开发阶段）

### superAutoSan 文档

- `games/superAutoSan/docs/game.md` — 核心系统设计（商店、战斗、武将表、道具表、UI）
- `games/superAutoSan/docs/tech_plan.md` — 技术方案（架构、目录结构、类型定义、开发阶段）
- `games/superAutoSan/docs/enemy_waves.md` — 敌方波次配置（关卡难度递增规则）
- `games/superAutoSan/docs/sap_reference.md` — Super Auto Pets 原版数据参考

### sanPoker 文档

- `games/sanPoker/docs/game.md` — 核心规则设计（对局流程、双盲乘数下注、战场条件池、信息可见性、MTT 扩展方向）
- `games/sanPoker/docs/battle_reference.md` — 三谋战斗规则参考（战法分类、属性、状态、3 武将 + 9 战法 MVP 样本）

### 同步要求

1. 新增/删除的系统机制必须在对应文档中体现
2. 数值变更（概率、城池数量、阵容配置等）必须更新到文档
3. Socket事件协议变更必须同步到 `tech_plan.md` 的事件表（sdc2）
4. 新增文件必须更新 `tech_plan.md` 的目录结构
5. UI交互变更必须更新 `game.md` 的界面设计要点
