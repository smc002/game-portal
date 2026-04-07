import type { BattleInput, BattleOutput, BattleEvent, CombatantEntity } from '../types/battle.js';
import { DamageType } from '../types/battle.js';
import type { HeroInstance } from '../types/hero.js';
import { HeroClass } from '../types/hero.js';
import { BattleEventEmitter } from './events.js';
import { executeSkill } from './skills.js';
import type { BattleContext } from './mechanics.js';
import { dealDamage, heal, modifyATB } from './mechanics.js';

/** 每个Tick的时间步长（秒） */
const TICK_DELTA = 0.1;

/** 最大Tick数（防止无限循环，约300秒） */
const MAX_TICKS = 3000;

/** ATB满值 */
const ATB_FULL = 100.0;

/** 灼烧每层每Tick伤害 */
const BURN_DAMAGE_PER_STACK = 1;

/**
 * 运行一场完整的ATB战斗
 * 纯函数：输入双方数据 → 输出事件流和结果
 */
export function runBattle(input: BattleInput): BattleOutput {
  const { playerA, playerB } = input;
  const emitter = new BattleEventEmitter();

  // Step 1: 初始化
  emitter.setTick(0);
  emitter.emit({ type: 'battle_start' });

  // 初始化所有武将ATB + 貂蝉被动标记
  for (const hero of [...playerA.formation, ...playerB.formation]) {
    if (!hero) continue;
    hero.atb = 0;
    // 貂蝉被动自动挂载
    if (hero.skillId === 'skill_diaochan' && !hero.buffs.some(b => b.name === '被动_貂蝉')) {
      hero.buffs.push({ id: `buff_diaochan_${hero.instanceId}`, name: '被动_貂蝉', stacks: 1, duration: -1 });
    }
  }

  // TODO: 结算兵书开局效果

  // Step 2-4: Tick循环
  for (let tick = 1; tick <= MAX_TICKS; tick++) {
    emitter.setTick(tick);

    // ── DOT处理：灼烧（每tick对持有灼烧的玩家造成伤害） ──
    for (const [side, player] of [['A', playerA], ['B', playerB]] as const) {
      const burn = player.buffs.find(b => b.name === '灼烧');
      if (burn && burn.stacks > 0) {
        const burnDmg = burn.stacks * BURN_DAMAGE_PER_STACK;
        player.currentHp = Math.max(0, player.currentHp - burnDmg);
        // 不为每tick都发emit（太频繁），每10 tick发一次
        if (tick % 10 === 0) {
          emitter.emit({ type: 'damage', target: side, amount: burnDmg * 10, isTrueDamage: true, sourceHeroId: 'dot_burn' });
        }
      }
    }

    // ── Buff持续时间衰减 ──
    tickBuffDurations(playerA, playerB);

    // ── 胜负判定（DOT可能击杀） ──
    const dotWinner = checkVictory(playerA, playerB, emitter, tick);
    if (dotWinner) return dotWinner;

    // ── ATB推进 ──
    const readyHeroes: { hero: HeroInstance; side: 'A' | 'B'; position: number; overflow: number }[] = [];

    for (const [side, player] of [['A', playerA], ['B', playerB]] as const) {
      for (let pos = 0; pos < player.formation.length; pos++) {
        const hero = player.formation[pos];
        if (!hero) continue;
        hero.atb += hero.speed * TICK_DELTA;
        if (hero.atb >= ATB_FULL) {
          readyHeroes.push({ hero, side, position: pos, overflow: hero.atb - ATB_FULL });
        }
      }
    }

    // 按溢出量排序（大的先行动）
    readyHeroes.sort((a, b) => b.overflow - a.overflow);

    // 执行行动
    for (const { hero, side, position } of readyHeroes) {
      const owner = side === 'A' ? playerA : playerB;
      const enemy = side === 'A' ? playerB : playerA;
      if (owner.formation[position] !== hero) continue;

      // 重置ATB（保留溢出）
      hero.atb -= ATB_FULL;

      // 发出行动事件
      emitter.emit({ type: 'action_start', heroId: hero.instanceId, side, position });

      // 构建战斗上下文
      const ctx: BattleContext = {
        myPlayer: owner,
        enemyPlayer: enemy,
        playerA,
        emitter,
      };

      // 检查减伤buff
      const dmgReduction = owner.buffs.find(b => b.name === '减伤');
      const savedHp = enemy.currentHp;

      // 执行技能
      executeSkill(hero.skillId, hero, position, ctx);

      // 减伤处理：如果有减伤buff，回复部分伤害
      if (dmgReduction && dmgReduction.stacks > 0) {
        const dmgTaken = savedHp - enemy.currentHp; // 这是敌方受到的伤害，不是减伤目标
        // 减伤是对己方的，需要检查己方是否被伤害了
        // 实际上减伤应该在dealDamage时处理，这里简化为：减伤buff作用于owner
      }

      // ── 被动触发：赵云协战 ──
      triggerZhaoyunAssist(owner, hero, position, ctx);

      // ── 被动触发：庞统微控（己方猛将行动时使敌方ATB暂停） ──
      if (hero.heroClass === HeroClass.MengJiang) {
        triggerPangtongControl(owner, enemy, side, ctx);
      }

      // ── 郭嘉：治疗转护盾 ──
      // 已在heal机制中处理（简化：此处不额外处理）

      // ── 貂蝉被动：致命伤害保命 ──
      checkDiaochanPassive(owner, side, ctx);
      checkDiaochanPassive(enemy, side === 'A' ? 'B' : 'A', ctx);

      // 胜负判定
      const winner = checkVictory(playerA, playerB, emitter, tick);
      if (winner) return winner;
    }
  }

  // 超时：剩余HP多的获胜
  const winner = playerA.currentHp >= playerB.currentHp ? 'A' : 'B';
  emitter.emit({ type: 'battle_end', winner });
  return buildOutput(winner, playerA, playerB, emitter.getEvents(), MAX_TICKS);
}

// ── 辅助函数 ──

/** 检查胜负 */
function checkVictory(
  playerA: CombatantEntity, playerB: CombatantEntity,
  emitter: BattleEventEmitter, tick: number
): BattleOutput | null {
  if (playerA.currentHp <= 0) {
    emitter.emit({ type: 'battle_end', winner: 'B' });
    return buildOutput('B', playerA, playerB, emitter.getEvents(), tick);
  }
  if (playerB.currentHp <= 0) {
    emitter.emit({ type: 'battle_end', winner: 'A' });
    return buildOutput('A', playerA, playerB, emitter.getEvents(), tick);
  }
  return null;
}

/** Buff持续时间衰减 */
function tickBuffDurations(playerA: CombatantEntity, playerB: CombatantEntity): void {
  for (const player of [playerA, playerB]) {
    // 玩家级buff
    player.buffs = player.buffs.filter(b => {
      if (b.duration > 0) {
        b.duration--;
        if (b.duration <= 0) {
          // 临时吴国到期恢复原阵营 — 在武将级处理
          return false;
        }
      }
      return true;
    });
    // 武将级buff
    for (const hero of player.formation) {
      if (!hero) continue;
      hero.buffs = hero.buffs.filter(b => {
        if (b.duration > 0) {
          b.duration--;
          if (b.duration <= 0) {
            // 鲁肃临时吴国到期：恢复原阵营
            if (b.name === '临时吴国' && b.data) {
              const factions = Object.values(Object.fromEntries(
                Object.entries({ wei: 0, shu: 1, wu: 2, qun: 3 })
              ));
              // 简化：存储了 originalFaction index
              const origIdx = b.data.originalFaction ?? 0;
              const factionValues = ['wei', 'shu', 'wu', 'qun'] as const;
              hero.faction = factionValues[origIdx] ?? 'wei';
            }
            return false;
          }
        }
        return true;
      });
    }
  }
}

/** 赵云协战触发 */
function triggerZhaoyunAssist(
  owner: CombatantEntity, actingHero: HeroInstance,
  actingPos: number, ctx: BattleContext
): void {
  const side = owner === ctx.playerA ? 'A' : 'B';
  // 检查相邻位置是否有赵云（带协战buff）
  for (const adjPos of [actingPos - 1, actingPos + 1]) {
    if (adjPos < 0 || adjPos >= owner.formation.length) continue;
    const adj = owner.formation[adjPos];
    if (!adj || adj === actingHero) continue;
    if (adj.buffs.some(b => b.name === '协战_赵云')) {
      // 赵云协战：50%伤害
      const assistDmg = Math.round(adj.attack * 0.5);
      dealDamage(ctx, ctx.enemyPlayer, assistDmg, DamageType.Normal, adj.instanceId);
    }
  }
}

/** 庞统微控触发：己方猛将行动时使敌方全体ATB暂停（-2 ATB） */
function triggerPangtongControl(
  owner: CombatantEntity, enemy: CombatantEntity,
  actingSide: 'A' | 'B', ctx: BattleContext
): void {
  // 检查己方是否有庞统（带微控buff）
  for (const hero of owner.formation) {
    if (!hero) continue;
    if (hero.buffs.some(b => b.name === '微控_庞统')) {
      const enemySide: 'A' | 'B' = actingSide === 'A' ? 'B' : 'A';
      for (let i = 0; i < enemy.formation.length; i++) {
        const enemyHero = enemy.formation[i];
        if (enemyHero) {
          // 0.2秒暂停 ≈ 减少2点ATB
          modifyATB(ctx, enemyHero, -2, enemySide, i);
        }
      }
      break; // 只触发一次
    }
  }
}

/** 貂蝉被动检查 */
function checkDiaochanPassive(
  player: CombatantEntity, side: 'A' | 'B', ctx: BattleContext
): void {
  if (player.currentHp > 0) return;

  // 查找编队中的貂蝉（带被动buff）
  for (let i = 0; i < player.formation.length; i++) {
    const hero = player.formation[i];
    if (!hero) continue;
    const buffIdx = hero.buffs.findIndex(b => b.name === '被动_貂蝉');
    if (buffIdx !== -1) {
      // 触发：保留1HP，生命回满，销毁貂蝉
      player.currentHp = player.maxHp;
      hero.buffs.splice(buffIdx, 1);
      player.formation[i] = null; // 销毁貂蝉
      ctx.emitter.emit({ type: 'hero_defeated', heroId: hero.instanceId, side, position: i });
      ctx.emitter.emit({ type: 'heal', target: side, amount: player.maxHp, sourceHeroId: hero.instanceId });
      break;
    }
  }
}

function buildOutput(
  winner: 'A' | 'B',
  playerA: BattleInput['playerA'],
  playerB: BattleInput['playerB'],
  events: BattleEvent[],
  totalTicks: number
): BattleOutput {
  return {
    winner,
    playerA: { remainingHp: Math.max(0, playerA.currentHp), shield: playerA.shield },
    playerB: { remainingHp: Math.max(0, playerB.currentHp), shield: playerB.shield },
    events,
    totalTicks,
  };
}
