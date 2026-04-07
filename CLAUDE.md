# 项目开发规则

## 文档同步规则

每轮迭代开发完成后，必须将代码变更反向同步到 `games/sdc2/docs/` 下的设计文档：

- `games/sdc2/docs/game.md` — 核心系统设计（地图、遭遇概率、开局机制、UI交互等）
- `games/sdc2/docs/battle_design.md` — 战斗系统设计（ATB引擎、UI布局、事件类型等）
- `games/sdc2/docs/tech_plan.md` — 技术方案（目录结构、Socket事件协议、类型定义、开发阶段记录）
- `games/sdc2/docs/generals_design.md` — 武将设计图鉴（武将属性、技能描述）

同步要求：
1. 新增/删除的系统机制必须在对应文档中体现
2. 数值变更（概率、城池数量、阵容配置等）必须更新到文档
3. Socket事件协议变更必须同步到 `tech_plan.md` 的事件表
4. 新增文件必须更新 `tech_plan.md` 的目录结构
5. UI交互变更必须更新 `game.md` 的界面设计要点
