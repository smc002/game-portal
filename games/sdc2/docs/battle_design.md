# 三国搜打撤 Demo：全自动 ATB 战斗系统开发需求文档

## 一、 系统概述

本作的战斗系统为一个独立的、全自动运行的模块（类似于《大巴扎》The Bazaar）。战斗为 1v1 形式（玩家 vs 玩家，或玩家 vs NPC）。战斗一旦开始，玩家不可干预，系统根据双方武将的属性、站位和技能自动演算，直到一方血量归零。

**核心机制：基于速度的独立行动条（ATB - Active Time Battle）机制，以及强依赖站位（左侧/右侧/相邻）的技能联动。**

* * *

## 二、 核心数据结构设计 (Data Structures)

战斗模块接收两份对等的数据对象（Player A & Player B），双方数据结构如下：

### 1\. 参战方实体 (Combatant Entity)

-   `MaxHP` (int): 最大生命值（受基础设定、兵书影响）。
-   `CurrentHP` (int): 当前生命值。
-   `Shield` (int): 当前护盾值（默认为 0，优先于 HP 抵挡伤害，无上限）。
-   `Tomes` (List<Tome>): 携带的兵书（被动技能）列表。
-   `Buffs/Debuffs` (List<StatusEffect>): 参战方身上的全局状态（如：灼烧层数）。
-   `Formation` (Array\[5\] of Hero): 参战阵容（必须是有序数组，索引 0~4 代表从左到右的位置。空槽位记为 Null）。

### 2\. 武将实体 (Hero Entity)

-   `ID` (string): 武将唯一标识。
-   `Name` (string): 武将名称。
-   `Faction` (enum): 国别阵营 (Wei, Shu, Wu, Qun)。
-   `Class` (enum): 职业 (MengJiang, MouShi, HouQin)。
-   `StarLevel` (int): 星级 (1~5，影响基础属性的乘区)。
-   `Speed` (float): 行动速度（决定 ATB 增长快慢）。
-   `Attack` (float): 基础攻击力。
-   `SpecialPower` (float): 特殊能力强度。
-   `ATB` (float): 当前行动条进度（0.0 ~ 100.0）。
-   `ActiveSkill` (Function/Action): 该武将的主动技能逻辑。

* * *

## 三、 战斗核心逻辑与演算循环 (Combat Loop)

战斗开始后，系统进入高频 Tick（例如每 0.1 秒算作一帧）的演算循环。

### Step 1: 战斗初始化 (Initialization)

1.  结算双方携带的 `Tomes`（兵书）的“开局类”被动效果（如：开局获得护盾）。
2.  初始化场上所有 `Hero` 的 `ATB = 0.0`。

### Step 2: ATB 推进 (ATB Tick)

1.  在每一个 Tick 中，遍历场上所有存活的 `Hero`。
2.  每个 `Hero` 的 `ATB += (Hero.Speed * TickDeltaTime)`。
3.  检查是否有 `Hero` 的 `ATB >= 100.0`。
    
    -   若有**多个**武将同时满 100.0，则按超出 100 的数值大小排序，依次行动。
    -   若依然平局，则随机决定先后。

### Step 3: 武将行动结算 (Action Resolution)

当某 `Hero` 行动时（ATB >= 100.0）：

1.  **重置进度**：该 `Hero.ATB` 扣除 100.0（保留溢出部分）。
2.  **执行技能逻辑**：调用该 `Hero` 的 `ActiveSkill`。
    
    -   **站位寻址规则 (极重要)**：
        
        -   `Left()`：寻找 `Formation` 中该武将索引 **\-1** 的位置。如果该位置为空 (Null) 或越界，则该技能对左侧的联动**失效**。
        -   `Right()`：寻找索引 **+1** 的位置。如果为空或越界，则**失效**。
        -   `Adjacent()`：同时触发 `Left()` 和 `Right()` 的逻辑。
    -   **全局状态寻址**：技能可以直接修改敌方参战实体的 `CurrentHP`、`Shield` 或添加 `Buffs`。
3.  **结算 DOT (Damage Over Time)**：如果行动方或受击方身上有特定 Buff（如【灼烧】），在行动结束时结算相关伤害或效果。

### Step 4: 死亡与胜负判定 (Victory Check)

1.  每次伤害结算后，立即检查双方 `CurrentHP`。
2.  若 `CurrentHP <= 0`，触发该参战方的阵亡逻辑。
3.  停止 Tick 循环，向主系统抛出战斗结果（胜者、败者、剩余血量）。

* * *

## 四、 技能效果机制规范 (Mechanics Definitions)

开发 Agent 需预先实现以下核心机制接口，供武将技能调用：

-   `DealDamage(target, amount, type)`: 造成伤害。
    
    -   `type` 分为：普通伤害（先扣 Shield，后扣 HP）和 真实伤害（无视 Shield，直接扣 HP）。
-   `Heal(target, amount)`: 恢复 HP，不可超过 MaxHP。
-   `AddShield(target, amount)`: 增加护盾值。
-   `ModifyATB(target, amount)`: 修改指定武将的 ATB 值（可正可负，用于“立即行动”或“退条”控制）。
-   `AddBuff/RemoveBuff(target, buff_type, stacks)`: 添加或移除参战方/武将的状态层数（如【灼烧】、【吸血】）。
-   `CountTags(target_formation, faction/class)`: 标签计数器接口。返回指定编队中，符合特定国别或职业的武将数量。

* * *

## 五、 视觉动效与 UI 事件解耦 (VFX & UI Triggers)

**底层逻辑引擎与前端表现必须解耦。** 战斗逻辑在演算时，需要向前端抛出事件（Events），前端根据接收到的事件播放相应的 UI 动画。

### 必须抛出的 UI 事件及表现要求：

1.  `OnHeroActionStart(HeroID, PositionIndex)`:
    
    -   **触发时机**：武将 ATB 满并开始施放技能时。
    -   **前端表现**：该武将的卡牌/模型及其下方的独立 ATB 进度条产生**向前冲刺/闪动**特效。
2.  `OnDamageTaken(TargetPlayer, Amount, IsTrueDamage)`:
    
    -   **触发时机**：参战实体扣除血量/护盾时。
    -   **前端表现**：对应方的全局大血量条产生**受击抖动**效果，并在受击方区域弹出悬浮伤害数字（真伤需用特殊颜色标注）。
3.  `OnBuffApplied(Target, BuffName, Stacks)` & `OnBuffRemoved(Target, BuffName)`:
    
    -   **触发时机**：状态发生改变时。
    -   **前端表现**：
        
        -   获得时：在对应目标（武将卡牌上方，或参战方全局血条上方）飘字显示 `+ [Buff名称]`（如 `+ 灼烧 x2`）。
        -   结束/清除时：飘字显示 `- [Buff名称]`。
4.  `OnATBModified(HeroID, PositionIndex, Amount)`:
    
    -   **触发时机**：因技能联动导致 ATB 暴增或暴减时。
    -   **前端表现**：对应武将的 ATB 进度条出现高亮拉伸或缩退的光效，区别于自然的随时间增长。

### UI 静态布局要求：

-   双方血量条必须位于画面醒目位置（顶端对峙或左右对峙），分别标注玩家名称。
-   **双方全部武将**必须同时可见，按编队5槽位展示。武将卡牌清晰展示：**国别标签、名称、星级**，以及底部的**独立 ATB 进度条**。
-   ATB 进度条基于武将 Speed 属性在事件间**实时模拟增长**（`ATB += Speed * 0.1 * TickDiff`），行动时重置为0。
-   阵亡武将显示**灰色半透明+删除线名称**，不再参与ATB模拟。
-   服务端通过 `BattleResultPayload` 发送双方阵容快照（`formationA/B`、`maxHpA/B`、`nameA/B`），前端无需额外请求即可渲染完整战斗界面。
-   卡牌悬浮提示 (Tooltip) 必须预留 20-40 字的空间用于展示武将的特殊技能描述。

* * *

## 六、 附录：技能样例验证逻辑

_(开发 Agent 测试用)_

以 **曹操 (魏国/谋士)** 为例，其技能逻辑应被实现为：

JavaScript

```
function CaoCaoSkill(caster, myPlayer, enemyPlayer) {
    // 1. 计数器：统计己方魏国数量
    let weiCount = CountTags(myPlayer.Formation, Faction.Wei);
    
    // 给玩家增加护盾 (数量 * 20)
    let shieldAmount = weiCount * 20;
    AddShield(myPlayer, shieldAmount);
    
    // 2. 左侧联动寻址
    let leftHero = GetHeroAtLeft(caster);
    if (leftHero != null) {
        // 使左侧立即行动 (ATB 补满)
        ModifyATB(leftHero, 100.0);
        // 此处需要实现一种机制：为 leftHero 的下一次攻击附加额外伤害 (当前护盾 * 0.2)
        // 可以通过给 leftHero 添加一个临时 Buff 来实现
        AddBuff(leftHero, "BonusDamage_FromShield", myPlayer.Shield * 0.2);
    }
}
```

