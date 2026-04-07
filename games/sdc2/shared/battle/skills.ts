import type { HeroInstance } from '../types/hero.js';
import { Faction, HeroClass } from '../types/hero.js';
import { DamageType } from '../types/battle.js';
import type { BattleContext } from './mechanics.js';
import {
  dealDamage, heal, addShield, modifyATB,
  addBuff, removeBuff,
  countByFaction, countByClass,
  getHeroAtLeft, getHeroAtRight, getHeroPosition,
} from './mechanics.js';

/** 技能函数签名 */
export type SkillFunction = (
  caster: HeroInstance,
  casterPosition: number,
  ctx: BattleContext
) => void;

/** 技能注册表 */
const skillRegistry = new Map<string, SkillFunction>();

/** 注册技能 */
export function registerSkill(skillId: string, fn: SkillFunction): void {
  skillRegistry.set(skillId, fn);
}

/** 获取技能 */
export function getSkill(skillId: string): SkillFunction | undefined {
  return skillRegistry.get(skillId);
}

/** 执行技能 */
export function executeSkill(
  skillId: string,
  caster: HeroInstance,
  casterPosition: number,
  ctx: BattleContext
): void {
  const skill = skillRegistry.get(skillId);
  if (skill) {
    skill(caster, casterPosition, ctx);
  }
}

// ── 辅助函数 ──

/** 获取武将的side标识 */
function getMySide(ctx: BattleContext): 'A' | 'B' {
  return ctx.myPlayer === ctx.playerA ? 'A' : 'B';
}

/** 获取相邻武将的position */
function getAdjacentPositions(pos: number, formationLen: number): number[] {
  const result: number[] = [];
  if (pos > 0) result.push(pos - 1);
  if (pos < formationLen - 1) result.push(pos + 1);
  return result;
}

/** 检查武将是否拥有指定buff */
function hasBuff(hero: HeroInstance, buffName: string): boolean {
  return hero.buffs.some(b => b.name === buffName);
}

/** 获取buff层数 */
function getBuffStacks(target: { buffs: { name: string; stacks: number }[] }, buffName: string): number {
  return target.buffs.find(b => b.name === buffName)?.stacks ?? 0;
}

/** 基础攻击：用 caster.attack 造成普通伤害 */
function basicAttack(caster: HeroInstance, ctx: BattleContext, multiplier = 1): number {
  // 检查是否有 BonusDamage buff
  const bonus = caster.buffs.find(b => b.name === 'BonusDamage_FromShield');
  let extra = 0;
  if (bonus) {
    extra = bonus.data?.amount ?? 0;
    // 消耗一次性buff
    const idx = caster.buffs.findIndex(b => b.name === 'BonusDamage_FromShield');
    if (idx !== -1) caster.buffs.splice(idx, 1);
  }

  // 检查暴击
  const crit = caster.buffs.find(b => b.name === 'NextCrit');
  let critMult = 1;
  if (crit) {
    critMult = 2;
    const idx = caster.buffs.findIndex(b => b.name === 'NextCrit');
    if (idx !== -1) caster.buffs.splice(idx, 1);
  }

  const amount = Math.round((caster.attack * multiplier + extra) * critMult);
  return dealDamage(ctx, ctx.enemyPlayer, amount, DamageType.Normal, caster.instanceId);
}

// ===================================================================
// 四方君主
// ===================================================================

// 曹操：每有1名魏国→20护盾；使左侧武将立即攻击，附加护盾20%额外伤害
registerSkill('skill_caocao', (caster, pos, ctx) => {
  const weiCount = countByFaction(ctx.myPlayer.formation, Faction.Wei);
  addShield(ctx, ctx.myPlayer, weiCount * 20, caster.instanceId);

  const leftHero = getHeroAtLeft(ctx.myPlayer.formation, pos);
  if (leftHero) {
    const side = getMySide(ctx);
    // 给左侧武将附加额外伤害buff
    addBuff(ctx, leftHero.instanceId, 'hero', 'BonusDamage_FromShield', 1, 0,
      { amount: Math.round(ctx.myPlayer.shield * 0.2) });
    // 使左侧立即行动
    modifyATB(ctx, leftHero, 100 - leftHero.atb, side, pos - 1);
  }
});

// 刘备：每有1名蜀国→恢复15生命；使右侧武将增加50%ATB，永久+5攻击
registerSkill('skill_liubei', (caster, pos, ctx) => {
  const shuCount = countByFaction(ctx.myPlayer.formation, Faction.Shu);
  heal(ctx, ctx.myPlayer, shuCount * 15, caster.instanceId);

  const rightHero = getHeroAtRight(ctx.myPlayer.formation, pos);
  if (rightHero) {
    const side = getMySide(ctx);
    modifyATB(ctx, rightHero, 50, side, pos + 1);
    rightHero.attack += 5;
  }
});

// 孙权：每有1名吴国→给敌方2层灼烧；使相邻武将下次攻击附加灼烧层数×2真伤
registerSkill('skill_sunquan', (caster, pos, ctx) => {
  const wuCount = countByFaction(ctx.myPlayer.formation, Faction.Wu);
  addBuff(ctx, ctx.enemyPlayer.playerId, 'player', '灼烧', wuCount * 2);

  const burnStacks = getBuffStacks(ctx.enemyPlayer, '灼烧');
  const bonusDmg = burnStacks * 2;
  for (const adjPos of getAdjacentPositions(pos, ctx.myPlayer.formation.length)) {
    const adj = ctx.myPlayer.formation[adjPos];
    if (adj) {
      addBuff(ctx, adj.instanceId, 'hero', 'BonusTrueDamage', 1, 0, { amount: bonusDmg });
    }
  }
});

// 董卓：每有1名群雄→扣己方20生命，对敌方50真伤；使右侧武将获得100%吸血3秒
registerSkill('skill_dongzhuo', (caster, pos, ctx) => {
  const qunCount = countByFaction(ctx.myPlayer.formation, Faction.Qun);
  // 自伤
  dealDamage(ctx, ctx.myPlayer, qunCount * 20, DamageType.True, caster.instanceId);
  // 对敌方真伤
  dealDamage(ctx, ctx.enemyPlayer, qunCount * 50, DamageType.True, caster.instanceId);

  const rightHero = getHeroAtRight(ctx.myPlayer.formation, pos);
  if (rightHero) {
    addBuff(ctx, rightHero.instanceId, 'hero', '吸血', 100, 30); // 30 ticks ≈ 3s
  }
});

// ===================================================================
// 魏国
// ===================================================================

// 曹仁：提供40护盾。若右侧是猛将，额外提供20
registerSkill('skill_caoren', (caster, pos, ctx) => {
  let shieldAmt = 40;
  const rightHero = getHeroAtRight(ctx.myPlayer.formation, pos);
  if (rightHero && rightHero.heroClass === HeroClass.MengJiang) {
    shieldAmt += 20;
  }
  addShield(ctx, ctx.myPlayer, shieldAmt, caster.instanceId);
});

// 典韦：造成30伤害。若有护盾，消耗50%护盾，额外造成消耗量2倍伤害
registerSkill('skill_dianwei', (caster, pos, ctx) => {
  let dmg = 30;
  if (ctx.myPlayer.shield > 0) {
    const consumed = Math.round(ctx.myPlayer.shield * 0.5);
    ctx.myPlayer.shield -= consumed;
    ctx.emitter.emit({ type: 'shield_change', target: getMySide(ctx), amount: -consumed, sourceHeroId: caster.instanceId });
    dmg += consumed * 2;
  }
  dealDamage(ctx, ctx.enemyPlayer, dmg, DamageType.Normal, caster.instanceId);
});

// 夏侯惇：造成40伤害。获得等同伤害50%的护盾
registerSkill('skill_xiahoudun', (caster, pos, ctx) => {
  const dealt = dealDamage(ctx, ctx.enemyPlayer, 40, DamageType.Normal, caster.instanceId);
  addShield(ctx, ctx.myPlayer, Math.round(dealt * 0.5), caster.instanceId);
});

// 荀彧：玩家3秒内减伤30%。使左侧武将获得30%ATB
registerSkill('skill_xunyu', (caster, pos, ctx) => {
  addBuff(ctx, ctx.myPlayer.playerId, 'player', '减伤', 30, 30); // 30 ticks ≈ 3s, data in stacks=30%
  const leftHero = getHeroAtLeft(ctx.myPlayer.formation, pos);
  if (leftHero) {
    modifyATB(ctx, leftHero, 30, getMySide(ctx), pos - 1);
  }
});

// 许褚：造成50伤害。每10点护盾→伤害永久+1%
registerSkill('skill_xuchu', (caster, pos, ctx) => {
  const shieldBonus = Math.floor(ctx.myPlayer.shield / 10);
  // 永久提升记录在buff中
  const existingBonus = getBuffStacks(caster, 'xuchu_perm_bonus');
  const newBonus = existingBonus + shieldBonus;
  if (shieldBonus > 0) {
    addBuff(ctx, caster.instanceId, 'hero', 'xuchu_perm_bonus', shieldBonus);
  }
  const totalBonus = 1 + newBonus * 0.01;
  dealDamage(ctx, ctx.enemyPlayer, Math.round(50 * totalBonus), DamageType.Normal, caster.instanceId);
});

// 张辽：造成25伤害。若敌方ATB大于80，使其ATB后退30
registerSkill('skill_zhangliao', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.enemyPlayer, 25, DamageType.Normal, caster.instanceId);
  const enemySide: 'A' | 'B' = getMySide(ctx) === 'A' ? 'B' : 'A';
  for (let i = 0; i < ctx.enemyPlayer.formation.length; i++) {
    const enemy = ctx.enemyPlayer.formation[i];
    if (enemy && enemy.atb > 80) {
      modifyATB(ctx, enemy, -30, enemySide, i);
    }
  }
});

// 郭嘉：不造成伤害。未来4秒内，敌方所有治疗效果转化为己方护盾
registerSkill('skill_guojia', (caster, pos, ctx) => {
  addBuff(ctx, ctx.myPlayer.playerId, 'player', '治疗转护盾', 1, 40); // 40 ticks ≈ 4s
});

// 徐晃：造成30伤害。己方每有一名非魏国，额外造成15
registerSkill('skill_xuhuang', (caster, pos, ctx) => {
  const nonWei = ctx.myPlayer.formation.filter(h => h && h.faction !== Faction.Wei).length;
  dealDamage(ctx, ctx.enemyPlayer, 30 + nonWei * 15, DamageType.Normal, caster.instanceId);
});

// ===================================================================
// 蜀国
// ===================================================================

// 赵云：造成20伤害。相邻武将每次行动时赵云协战（50%伤害）— 用被动buff标记
registerSkill('skill_zhaoyun', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.enemyPlayer, 20, DamageType.Normal, caster.instanceId);
  // 赵云的协战通过引擎的被动系统触发，这里标记他有协战能力
  if (!hasBuff(caster, '协战_赵云')) {
    addBuff(ctx, caster.instanceId, 'hero', '协战_赵云', 1, -1);
  }
});

// 马超：造成35伤害。每次行动后永久+2速度
registerSkill('skill_machao', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.enemyPlayer, 35, DamageType.Normal, caster.instanceId);
  caster.speed += 2;
});

// 诸葛亮：将敌方速度最快武将ATB清零，转移给自身左侧
registerSkill('skill_zhugeliang', (caster, pos, ctx) => {
  let fastest: HeroInstance | null = null;
  let fastestPos = -1;
  const enemySide: 'A' | 'B' = getMySide(ctx) === 'A' ? 'B' : 'A';
  for (let i = 0; i < ctx.enemyPlayer.formation.length; i++) {
    const h = ctx.enemyPlayer.formation[i];
    if (h && (!fastest || h.speed > fastest.speed)) {
      fastest = h;
      fastestPos = i;
    }
  }
  if (fastest && fastestPos >= 0) {
    const stolenATB = fastest.atb;
    modifyATB(ctx, fastest, -stolenATB, enemySide, fastestPos);
    const leftHero = getHeroAtLeft(ctx.myPlayer.formation, pos);
    if (leftHero) {
      modifyATB(ctx, leftHero, stolenATB, getMySide(ctx), pos - 1);
    }
  }
});

// 黄月英：恢复25生命。使右侧蜀国武将下次攻击暴击
registerSkill('skill_huangyueying', (caster, pos, ctx) => {
  heal(ctx, ctx.myPlayer, 25, caster.instanceId);
  const rightHero = getHeroAtRight(ctx.myPlayer.formation, pos);
  if (rightHero && rightHero.faction === Faction.Shu) {
    addBuff(ctx, rightHero.instanceId, 'hero', 'NextCrit', 1, -1);
  }
});

// 关羽：造成50伤害。若右侧是蜀国武将，无视护盾
registerSkill('skill_guanyu', (caster, pos, ctx) => {
  const rightHero = getHeroAtRight(ctx.myPlayer.formation, pos);
  const ignoreShield = rightHero && rightHero.faction === Faction.Shu;
  dealDamage(ctx, ctx.enemyPlayer, 50,
    ignoreShield ? DamageType.True : DamageType.Normal,
    caster.instanceId);
});

// 黄忠：造成40伤害。生命低于30%时伤害×3
registerSkill('skill_huangzhong', (caster, pos, ctx) => {
  const lowHp = ctx.myPlayer.currentHp < ctx.myPlayer.maxHp * 0.3;
  dealDamage(ctx, ctx.enemyPlayer, lowHp ? 120 : 40, DamageType.Normal, caster.instanceId);
});

// 庞统：造成10伤害。己方猛将每次行动时使敌方全体ATB暂停0.2秒 — 用buff标记
registerSkill('skill_pangtong', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.enemyPlayer, 10, DamageType.Normal, caster.instanceId);
  if (!hasBuff(caster, '微控_庞统')) {
    addBuff(ctx, caster.instanceId, 'hero', '微控_庞统', 1, -1);
  }
});

// 魏延：造成40伤害+20%吸血。若场上无其他蜀国→吸血100%
registerSkill('skill_weiyan', (caster, pos, ctx) => {
  const otherShu = ctx.myPlayer.formation.filter(
    h => h && h.instanceId !== caster.instanceId && h.faction === Faction.Shu
  ).length;
  const lifestealRate = otherShu === 0 ? 1.0 : 0.2;
  const dealt = dealDamage(ctx, ctx.enemyPlayer, 40, DamageType.Normal, caster.instanceId);
  heal(ctx, ctx.myPlayer, Math.round(dealt * lifestealRate), caster.instanceId);
});

// ===================================================================
// 吴国
// ===================================================================

// 太史慈：连续造成两次20伤害
registerSkill('skill_taishici', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.enemyPlayer, 20, DamageType.Normal, caster.instanceId);
  dealDamage(ctx, ctx.enemyPlayer, 20, DamageType.Normal, caster.instanceId);
});

// 周瑜：附加3层灼烧。若左侧是吴国，额外3层
registerSkill('skill_zhouyu', (caster, pos, ctx) => {
  let stacks = 3;
  const leftHero = getHeroAtLeft(ctx.myPlayer.formation, pos);
  if (leftHero && leftHero.faction === Faction.Wu) {
    stacks += 3;
  }
  addBuff(ctx, ctx.enemyPlayer.playerId, 'player', '灼烧', stacks);
});

// 陆逊：造成20伤害。若敌方灼烧>10层，消耗所有层数，每层15真伤
registerSkill('skill_luxun', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.enemyPlayer, 20, DamageType.Normal, caster.instanceId);
  const burnStacks = getBuffStacks(ctx.enemyPlayer, '灼烧');
  if (burnStacks > 10) {
    removeBuff(ctx, ctx.enemyPlayer.playerId, 'player', '灼烧');
    dealDamage(ctx, ctx.enemyPlayer, burnStacks * 15, DamageType.True, caster.instanceId);
  }
});

// 吕蒙：造成30伤害。敌方每有1层灼烧，行动后恢复2%ATB
registerSkill('skill_lvmeng', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.enemyPlayer, 30, DamageType.Normal, caster.instanceId);
  const burnStacks = getBuffStacks(ctx.enemyPlayer, '灼烧');
  if (burnStacks > 0) {
    modifyATB(ctx, caster, burnStacks * 2, getMySide(ctx), pos);
  }
});

// 鲁肃：恢复30生命。将右侧武将国别临时视为吴国4秒
registerSkill('skill_lusu', (caster, pos, ctx) => {
  heal(ctx, ctx.myPlayer, 30, caster.instanceId);
  const rightHero = getHeroAtRight(ctx.myPlayer.formation, pos);
  if (rightHero) {
    // 记录原始阵营并临时改变
    if (!hasBuff(rightHero, '临时吴国')) {
      addBuff(ctx, rightHero.instanceId, 'hero', '临时吴国', 1, 40, // 40 ticks ≈ 4s
        { originalFaction: Object.values(Faction).indexOf(rightHero.faction) });
      rightHero.faction = Faction.Wu;
    }
  }
});

// 甘宁：造成30伤害。己方每有一种不同阵营，额外触发一次攻击
registerSkill('skill_ganning', (caster, pos, ctx) => {
  const factions = new Set<Faction>();
  ctx.myPlayer.formation.forEach(h => { if (h) factions.add(h.faction); });
  const attacks = factions.size;
  for (let i = 0; i < attacks; i++) {
    dealDamage(ctx, ctx.enemyPlayer, 30, DamageType.Normal, caster.instanceId);
  }
});

// 黄盖：扣己方10%生命，摧毁敌方所有护盾，将护盾值转化为灼烧层数
registerSkill('skill_huanggai', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.myPlayer, Math.round(ctx.myPlayer.maxHp * 0.1), DamageType.True, caster.instanceId);
  const enemyShield = ctx.enemyPlayer.shield;
  if (enemyShield > 0) {
    ctx.enemyPlayer.shield = 0;
    const enemySide: 'A' | 'B' = getMySide(ctx) === 'A' ? 'B' : 'A';
    ctx.emitter.emit({ type: 'shield_change', target: enemySide, amount: -enemyShield, sourceHeroId: caster.instanceId });
    // 每10点护盾=1层灼烧
    const burnStacks = Math.max(1, Math.floor(enemyShield / 10));
    addBuff(ctx, ctx.enemyPlayer.playerId, 'player', '灼烧', burnStacks);
  }
});

// 大乔：恢复20生命。若敌方处于灼烧，使其所有武将速度-20%
registerSkill('skill_daqiao', (caster, pos, ctx) => {
  heal(ctx, ctx.myPlayer, 20, caster.instanceId);
  if (getBuffStacks(ctx.enemyPlayer, '灼烧') > 0) {
    for (const enemy of ctx.enemyPlayer.formation) {
      if (enemy) {
        const reduction = Math.round(enemy.speed * 0.2);
        enemy.speed = Math.max(1, enemy.speed - reduction);
      }
    }
  }
});

// ===================================================================
// 群雄
// ===================================================================

// 吕布：造成80重击。若有吸血状态，额外一次等额伤害
registerSkill('skill_lvbu', (caster, pos, ctx) => {
  const dmg = 80;
  const dealt = dealDamage(ctx, ctx.enemyPlayer, dmg, DamageType.Normal, caster.instanceId);
  if (hasBuff(caster, '吸血')) {
    dealDamage(ctx, ctx.enemyPlayer, dmg, DamageType.Normal, caster.instanceId);
    // 吸血回血
    heal(ctx, ctx.myPlayer, Math.round(dealt * 2 * (getBuffStacks(caster, '吸血') / 100)), caster.instanceId);
  }
});

// 张角：扣己方50生命，使所有群雄武将获得40%ATB
registerSkill('skill_zhangjiao', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.myPlayer, 50, DamageType.True, caster.instanceId);
  const side = getMySide(ctx);
  for (let i = 0; i < ctx.myPlayer.formation.length; i++) {
    const hero = ctx.myPlayer.formation[i];
    if (hero && hero.faction === Faction.Qun) {
      modifyATB(ctx, hero, 40, side, i);
    }
  }
});

// 华雄：造成35伤害。生命低于50%时伤害翻倍
registerSkill('skill_huaxiong', (caster, pos, ctx) => {
  const lowHp = ctx.myPlayer.currentHp < ctx.myPlayer.maxHp * 0.5;
  dealDamage(ctx, ctx.enemyPlayer, lowHp ? 70 : 35, DamageType.Normal, caster.instanceId);
});

// 华佗：恢复60生命。若恢复前生命低于30%，使左侧武将获得100%ATB
registerSkill('skill_huatuo', (caster, pos, ctx) => {
  const wasLow = ctx.myPlayer.currentHp < ctx.myPlayer.maxHp * 0.3;
  heal(ctx, ctx.myPlayer, 60, caster.instanceId);
  if (wasLow) {
    const leftHero = getHeroAtLeft(ctx.myPlayer.formation, pos);
    if (leftHero) {
      modifyATB(ctx, leftHero, 100 - leftHero.atb, getMySide(ctx), pos - 1);
    }
  }
});

// 袁绍：扣己方5%最大生命。己方每有一名群雄，对敌方15伤害射击
registerSkill('skill_yuanshao', (caster, pos, ctx) => {
  dealDamage(ctx, ctx.myPlayer, Math.round(ctx.myPlayer.maxHp * 0.05), DamageType.True, caster.instanceId);
  const qunCount = countByFaction(ctx.myPlayer.formation, Faction.Qun);
  for (let i = 0; i < qunCount; i++) {
    dealDamage(ctx, ctx.enemyPlayer, 15, DamageType.Normal, caster.instanceId);
  }
});

// 高顺：造成40伤害。若为场上唯一群雄→无视护盾+50%吸血
registerSkill('skill_gaoshun', (caster, pos, ctx) => {
  const otherQun = ctx.myPlayer.formation.filter(
    h => h && h.instanceId !== caster.instanceId && h.faction === Faction.Qun
  ).length;
  const isLone = otherQun === 0;
  const dealt = dealDamage(ctx, ctx.enemyPlayer, 40,
    isLone ? DamageType.True : DamageType.Normal,
    caster.instanceId);
  if (isLone) {
    heal(ctx, ctx.myPlayer, Math.round(dealt * 0.5), caster.instanceId);
  }
});

// 左慈：清除己方所有负面状态。每清除1层，使敌方全体ATB后退10%
registerSkill('skill_zuoci', (caster, pos, ctx) => {
  // 收集负面buff（灼烧等）
  let totalCleansed = 0;
  const negativeBufNames = ['灼烧']; // 可扩展
  for (const buffName of negativeBufNames) {
    const stacks = getBuffStacks(ctx.myPlayer, buffName);
    if (stacks > 0) {
      removeBuff(ctx, ctx.myPlayer.playerId, 'player', buffName);
      totalCleansed += stacks;
    }
  }
  // 也清除武将身上的负面状态
  for (const hero of ctx.myPlayer.formation) {
    if (!hero) continue;
    for (const buffName of negativeBufNames) {
      const stacks = getBuffStacks(hero, buffName);
      if (stacks > 0) {
        removeBuff(ctx, hero.instanceId, 'hero', buffName);
        totalCleansed += stacks;
      }
    }
  }
  if (totalCleansed > 0) {
    const enemySide: 'A' | 'B' = getMySide(ctx) === 'A' ? 'B' : 'A';
    for (let i = 0; i < ctx.enemyPlayer.formation.length; i++) {
      const enemy = ctx.enemyPlayer.formation[i];
      if (enemy) {
        modifyATB(ctx, enemy, -Math.round(enemy.atb * 0.1 * totalCleansed), enemySide, i);
      }
    }
  }
});

// 貂蝉：[被动] 受致命伤时保留1HP，销毁貂蝉，生命回满（每局1次）
// 被动技能在引擎中处理，这里的主动技能只做标记
registerSkill('skill_diaochan', (caster, pos, ctx) => {
  // 貂蝉的主动效果为空（纯被动）
  // 被动标记在初始化时自动挂载
  if (!hasBuff(caster, '被动_貂蝉')) {
    addBuff(ctx, caster.instanceId, 'hero', '被动_貂蝉', 1, -1);
  }
});
