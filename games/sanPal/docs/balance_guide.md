# sanPal 数值平衡指南

本文档供数值调优人员参考。包含所有关键数值公式、当前参数、调参建议和测试方法。

---

## 一、核心公式

### 1.1 伤害公式

```
最终伤害 = floor(基础伤害 × 兵种克制 × 条件技能 × 暴击 × 随机波动 × 灼烧减益 × 被动加成)

基础伤害 = 技能威力 × (攻击力 / 防御力) × 伤害系数 + 保底伤害
```

**当前参数**：
| 参数 | 值 | 所在文件:行 | 调参建议 |
|------|-----|------------|---------|
| 伤害系数 | 0.25 | `BattleEngine.ts` calcDamage | 增大→战斗变快；减小→战斗变慢 |
| 保底伤害 | 5 | `BattleEngine.ts` calcDamage | 防止低攻高防时伤害为0 |
| 兵种克制(有利) | ×1.5 | `types.ts` getWeaponMultiplier | 影响兵种搭配重要性 |
| 兵种克制(不利) | ×0.67 | `types.ts` getWeaponMultiplier | — |
| 暴击倍率(普通) | ×1.5 | `BattleEngine.ts` calcDamage | — |
| 暴击倍率(武圣/无双) | ×2.0 | `BattleEngine.ts` calcDamage | — |
| 随机波动 | ×0.9~1.1 | `BattleEngine.ts` calcDamage | 影响伤害稳定性 |
| 灼烧减益(武技) | ×0.75 | `BattleEngine.ts` calcDamage | — |
| 赤壁加成(计策vs灼烧) | ×1.25 | `BattleEngine.ts` calcDamage | 周瑜专属 |

**攻防参数计算**：
```
有效属性 = 基础属性 × 星级倍率 × (1 + 等级成长 × (等级-1)) × 等级增减倍率 × 被动倍率

其中：
  武技：攻击=ATK, 防御=DEF
  计策：攻击=INT, 防御=RES
```

### 1.2 属性成长

| 参数 | 值 | 文件 |
|------|-----|------|
| 等级成长率 | 3%/级 | `helpers.ts` LEVEL_GROWTH |
| ★ 倍率 | 1.00 | `helpers.ts` STAR_MULTIPLIER |
| ★★ 倍率 | 1.12 | — |
| ★★★ 倍率 | 1.25 | — |
| ★★★★ 倍率 | 1.40 | — |
| ★★★★★ 倍率 | 1.50 | — |

**调参建议**：星级倍率直接影响 Boss 与玩家的数值差距。若 Boss 太强/太弱，优先调 ★★★★★ 的倍率。

### 1.3 属性增减表（statStages）

| 等级 | -3 | -2 | -1 | 0 | +1 | +2 | +3 |
|------|-----|-----|-----|---|------|------|------|
| 倍率 | ×0.4 | ×0.6 | ×0.8 | ×1.0 | ×1.25 | ×1.5 | ×2.0 |

切换下场时增减清零。

### 1.4 暴击率

```
暴击率 = 基础暴击率 + 被动加成 + 连携加成
```

| 来源 | 值 |
|------|-----|
| 所有武将基础 | 5% |
| 被动·霸王(孙策) | +15% |
| 被动·百发百中(黄忠) | +20% |
| 被动·无双(吕布) | +20% |
| 连携·江东双璧 | +15% |

### 1.5 能量系统

| 参数 | 值 | 文件 |
|------|-----|------|
| 初始能量 | 10 | `types.ts` MAX_ENERGY |
| 上限 | 10 | — |
| 蓄力恢复量 | 5 | `skills.ts` xuli |
| 低耗技能消耗 | 1-2 | skills.ts |
| 高耗技能消耗 | 3-5 | skills.ts |
| 防御姿态消耗 | 1 | skills.ts |
| 蓄力消耗 | 0 | skills.ts |

**能量节奏分析**：
- 开局10能量 → 用2个高耗(5+4=9) → 剩1 → 必须蓄力
- 低耗+高耗交替 → 可维持约5回合不蓄力
- 蓄力回合无攻击，是明确的弱点

---

## 二、敌方等级公式

| 遭遇类型 | 等级公式 | 当前值示例 | 文件 |
|----------|---------|-----------|------|
| 前期简单野将 | `randomInt(1, 2)` | Lv1-2 | `MapGenerator.ts` |
| 普通野将 | `1 + act×2 + random(0,2)` | Act1:3-5, Act2:5-7, Act3:7-9 | `MapScreen.tsx` |
| 精英 | `2 + act×3` | Act1:5, Act2:8, Act3:11 | `MapScreen.tsx` |
| Boss | `act×3 + 1` | Act1:4, Act2:7, Act3:10 | `MapScreen.tsx` |
| 护卫 | `act×3` | Act2:6 | `MapScreen.tsx` |

**调参建议**：若玩家到 Boss 前平均等级约 Lv5（Act1），Boss Lv4 的 ★★★★★ 倍率使其有效属性约等于 Lv5 的 ★★★。这意味着 Boss 等效于一个比玩家强 1 星的对手。

---

## 三、地图结构

| 幕 | 总层数 | 前期简单层 | 中间层 | Boss层 | 野将星级池 |
|----|--------|-----------|--------|--------|-----------|
| 第一幕 | 8 | 3层(★ Lv1-2) | 4层 | 张角 | ★~★★ |
| 第二幕 | 5 | 0 | 3层 | 董卓+吕布 | ★★~★★★ |
| 第三幕 | 5 | 0 | 3层 | 吕布 | ★★★~★★★★ |

每个中间层 2-3 个节点，必有至少 1 商铺 + 1 休憩。

---

## 四、经济系统

### 收入

| 来源 | 金额 |
|------|------|
| 初始 | 100 铜钱 |
| 野将/精英胜利 | 30 + random(0-29) + 幕数×10 |
| 奇遇·路遇贵人 | +60 |
| 奇遇·搜刮供品 | +80 |

**预计单幕收入**：
- Act1（约5场战斗）: 100初始 + 5×50平均 = 350铜钱总计
- Act2（约3场战斗）: 剩余 + 3×60平均 = +180
- Act3（约3场战斗）: +3×70平均 = +210

### 支出

| 道具 | 价格 | 建议购买优先级 |
|------|------|--------------|
| 金创药 | 25 | 高（性价比最优回血） |
| 兵粮丸 | 35 | 中（战斗中回血） |
| 竹简 | 30 | 高（捕获是核心玩法） |
| 战鼓 | 40 | 中 |
| 战旗 | 40 | 中 |
| 烟雾弹 | 50 | 低 |
| 华佗膏 | 60 | 中 |
| 锦囊 | 80 | 中（高星武将必须） |
| 太平要术 | 80 | 高（全队回血） |
| 兵法书 | 120 | 高（全队升级） |

---

## 五、捕获概率

```
最终捕获率 = 道具基础率 × 星级修正
```

| 道具 / 星级 | ★ | ★★ | ★★★ | ★★★★ | ★★★★★ |
|------------|-----|------|-------|--------|---------|
| 竹简(40%) | 40% | 32% | 24% | 16% | 不可捕获 |
| 锦囊(65%) | 65% | 52% | 39% | 26% | 不可捕获 |
| 玉玺(100%) | 100% | 100% | 100% | 100% | 不可捕获 |

**调参建议**：★★★ 用竹简仅 24%，建议经济上保证玩家在 Act2 前能买到 1-2 个锦囊。

---

## 六、状态效果数值

| 状态 | 效果 | 持续 | 备注 |
|------|------|------|------|
| 灼烧 | 每回合-8%最大HP，武技-25% | 3回合 | 受祝融免疫 |
| 中毒 | 每回合-6%~16%最大HP（递增） | 持续整场 | 非常强力 |
| 冰冻 | 无法行动，33%/回合解除 | 直到解除 | 运气因素大 |
| 混乱 | 33%自伤 | 3回合 | 自伤=40×ATK/DEF×0.25 |
| 眩晕 | 跳过1次行动 | 1次 | 最弱但最稳定的控制 |

**调参建议**：中毒是唯一持续整场的状态，递增伤害非常强。若发现中毒过强，可以限制为5回合或降低递增率。

---

## 七、被动技能数值汇总

### 属性类被动

| 武将 | 被动 | 条件 | 效果 |
|------|------|------|------|
| 许褚 | 虎痴 | 始终 | DEF×1.15 |
| 于禁 | 严整 | 始终 | DEF×1.10 |
| 蒋钦 | 水军 | 始终 | SPD×1.10 |
| 董卓 | 暴虐 | HP<50% | ATK×1.50 |
| 魏延 | 反骨 | HP<40% | ATK×1.40 |
| 马超 | 西凉铁骑 | 第1回合 | ATK×1.30 |
| 张辽 | 威震逍遥津 | 第1回合 | SPD×2.00 |
| 赵云 | 浑身是胆 | HP<30% | SPD×1.50 + 先制+1 |

### 触发类被动

| 武将 | 被动 | 触发 | 效果 |
|------|------|------|------|
| 曹操 | 奸雄 | 上场 | 对方随机属性-1 |
| 张飞 | 暴吼 | 上场 | 30%眩晕对方 |
| 张郃 | 巧变 | 上场 | 自身DEF+1 |
| 典韦 | 恶来 | 被武技 | 反弹10%伤害 |
| 黄盖 | 苦肉 | 被攻击 | ATK+1(上限+3) |
| 司马懿 | 隐忍 | 被攻击 | INT+1(上限+3) |
| 甘宁 | 锦帆 | 击败敌人 | SPD+1 |
| 陆逊 | 火计 | 使用计策 | 额外20%灼烧 |
| 庞统 | 凤雏 | 计策命中 | 目标RES-1 |
| 徐晃 | 断粮 | 攻击 | 20%概率目标DEF-1 |

---

## 八、伤害估算速查表

以下为 Lv3 武将 1v1 无克制情况下的大致伤害范围（不含暴击/被动）：

### ★★ vs ★（简单战斗）

| 场景 | ATK→DEF | 低耗(50) | 高耗(95) |
|------|---------|---------|---------|
| 马超(65)→廖化(45) | 1.44 | 23 | 39 |
| 太史慈(60)→于禁(55) | 1.09 | 19 | 31 |

廖化HP约70 → 需3回合低耗击杀，或2回合(1高耗+1低耗)

### ★★ vs ★★（同级对战）

| 场景 | ATK→DEF | 低耗(50) | 高耗(95) |
|------|---------|---------|---------|
| 马超(65)→许褚(70) | 0.93 | 17 | 27 |

许褚HP约95 → 需5-6回合低耗，或3回合混合击杀

### ★★ vs ★★★★★ Boss（Act1 Boss）

| 场景 | ATK→DEF/RES | 低耗 | 高耗 |
|------|------------|------|------|
| 马超(65)→张角RES(75) Lv4 | 0.87 | 16 | 26 |

张角HP约150 → 单人需约6回合高耗。2人队约3-4回合。

### 结论

**当前伤害系数(0.25)下**：
- ★ vs ★：约3回合击杀 ✓
- ★★ vs ★★：约4-5回合击杀 ✓
- ★★ vs Boss：单人约6回合，需2-3人队 ✓

---

## 九、调参优先级

### 若战斗太快（<2回合结束）

1. 降低伤害系数 (`BattleEngine.ts` → 0.20)
2. 提高防御方属性（所有武将DEF/RES +10）
3. 降低高耗技能威力

### 若战斗太慢（>5回合）

1. 提高伤害系数 → 0.30
2. 提高攻击方属性
3. 增加高耗技能威力

### 若 Boss 太难

1. 降低 ★★★★★ 倍率（当前1.50 → 1.35）
2. 降低 Boss 等级公式（`act*3+1` → `act*2+2`）
3. 降低 Boss 基础属性

### 若 Boss 太简单

1. 提高 Boss 基础属性
2. 提高 Boss 等级
3. 给 Boss 更多护卫

### 若经济过剩

1. 降低战斗奖励
2. 提高商品价格

### 若经济不足

1. 提高战斗奖励基数（30 → 50）
2. 降低关键道具价格

---

## 十、数值测试方法

### 方法A：脚本模拟（推荐）

在 `games/sanPal/` 目录下创建 `test_balance.mjs`，模拟战斗跑 500 次：

```javascript
// 核心数据（从代码复制关键参数）
const STAR_MULT = { 1: 1.0, 2: 1.12, 3: 1.25, 4: 1.4, 5: 1.5 };
const DMG_COEFF = 0.25;

function calcStat(base, star, level) {
  return Math.floor(base * STAR_MULT[star] * (1 + 0.03 * (level - 1)));
}

function simBattle(atkKey, atkLv, defKey, defLv, generals) {
  const a = generals[atkKey], d = generals[defKey];
  let aHP = calcStat(a.hp, a.star, atkLv);
  let dHP = calcStat(d.hp, d.star, defLv);
  const aMax = aHP, dMax = dHP;
  let turns = 0;

  while (aHP > 0 && dHP > 0 && turns < 50) {
    turns++;
    // Attacker hits with best skill
    const atkVal = calcStat(a.mainAtk, a.star, atkLv);
    const defVal = calcStat(d.mainDef, d.star, defLv);
    const skill = a.bestSkillPower;
    let dmg = skill * (atkVal / Math.max(1, defVal)) * DMG_COEFF + 5;
    dmg *= (0.9 + Math.random() * 0.2);
    dHP -= Math.max(1, Math.floor(dmg));
    if (dHP <= 0) break;

    // Defender hits back
    const dAtkVal = calcStat(d.mainAtk, d.star, defLv);
    const dDefVal = calcStat(a.mainDef, a.star, atkLv);
    const dSkill = d.bestSkillPower;
    let dDmg = dSkill * (dAtkVal / Math.max(1, dDefVal)) * DMG_COEFF + 5;
    dDmg *= (0.9 + Math.random() * 0.2);
    aHP -= Math.max(1, Math.floor(dDmg));
  }

  return { winner: aHP > 0 ? 'attacker' : 'defender', turns };
}

// 定义测试武将（简化数据）
const GENERALS = {
  ma_chao: { star: 2, hp: 75, mainAtk: 65, mainDef: 50, bestSkillPower: 50 },
  liao_hua: { star: 1, hp: 70, mainAtk: 50, mainDef: 45, bestSkillPower: 50 },
  // ... 补充需要测试的武将
};

// 跑 500 场
function runTest(aKey, aLv, dKey, dLv) {
  let wins = 0, totalTurns = 0;
  for (let i = 0; i < 500; i++) {
    const r = simBattle(aKey, aLv, dKey, dLv, GENERALS);
    if (r.winner === 'attacker') wins++;
    totalTurns += r.turns;
  }
  console.log(`${aKey} Lv${aLv} vs ${dKey} Lv${dLv}: WR=${(wins/5).toFixed(1)}%, avgTurns=${(totalTurns/500).toFixed(1)}`);
}

// 测试用例
console.log('=== 初始武将 vs 前期简单野将 ===');
runTest('ma_chao', 3, 'liao_hua', 1);
runTest('ma_chao', 3, 'liao_hua', 2);
```

**运行**：`node test_balance.mjs`

### 方法B：游戏内手动测试

1. `npm run dev` 启动游戏
2. 选择不同初始武将通关，记录：
   - 每场战斗回合数
   - 到 Boss 前的平均等级
   - 携带几个武将打 Boss
   - Boss 战的存活武将数
   - 铜钱剩余量
3. 目标指标：
   - 普通战斗 2-4 回合
   - Boss 战 4-8 回合（2-3 人队）
   - 通关时铜钱略有结余（50-100）

### 方法C：特定场景对照测试

| 测试场景 | 预期结果 | 不达标时调整 |
|----------|---------|-------------|
| ★★ Lv3 vs ★ Lv1 | 胜率>95%, 3回合内 | 若>5回合：伤害系数偏低 |
| ★★ Lv5 vs ★★ Lv5 | 胜率45-55%, 3-5回合 | 若胜率偏差大：属性不均衡 |
| 2人★★队 Lv5 vs Boss Lv4 | 胜率50-70% | 若<30%：Boss太强 |
| 3人混合队 Lv7 vs Act2 Boss | 胜率60-80% | 若<40%：Boss太强 |
| 4人★★★队 Lv10 vs Act3 Boss | 胜率70-90% | 考虑吕布二阶段 |
| 弓 vs 枪（克制） | 伤害约+50% | 验证1.5倍正确 |
| 弓 vs 骑（被克） | 伤害约-33% | 验证0.67倍正确 |

---

## 十一、关键文件速查

| 调什么 | 改哪个文件 | 关键变量/行 |
|--------|-----------|-----------|
| 伤害系数 | `engine/BattleEngine.ts` | `* 0.25` in calcDamage |
| 星级倍率 | `engine/helpers.ts` | STAR_MULTIPLIER |
| 等级成长 | `engine/helpers.ts` | LEVEL_GROWTH |
| 兵种克制倍率 | `data/types.ts` | getWeaponMultiplier |
| 武将属性 | `data/generals.ts` | 各武将的 baseStats |
| 技能威力/消耗 | `data/skills.ts` | power / energyCost |
| 敌方等级 | `pages/MapScreen.tsx` | wild/elite/boss level formulas |
| Boss等级 | `pages/MapScreen.tsx` | `act * 3 + 1` |
| 地图层数 | `engine/MapGenerator.ts` | ACT_CONFIGS.layers |
| 战斗奖励 | `pages/BattleScreen.tsx` | randomReward function |
| 道具价格 | `data/items.ts` | price field |
| 捕获概率 | `engine/CaptureCalc.ts` | STAR_MODIFIER |
| 初始道具/金钱 | `store/gameStore.ts` | INITIAL_INVENTORY |
| 能量上限 | `data/types.ts` | MAX_ENERGY |
| 蓄力恢复量 | `data/skills.ts` | xuli.effects.energyRestore |
| 被动倍率 | `engine/PassiveSystem.ts` | getPassiveStatMultiplier |
| 状态伤害 | `engine/BattleEngine.ts` | processTurnStart |
