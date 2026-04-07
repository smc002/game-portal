import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import type { HeroInstance } from '../../../shared/types/hero.js';
import { Faction, HeroClass } from '../../../shared/types/hero.js';
import { HERO_TEMPLATES, getHeroesByFaction, getHeroesByClass } from '../../../shared/data/heroes.js';
import { ItemType } from '../../../shared/types/items.js';
import { RoomManager } from '../rooms/manager.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** 每次 Reroll 消耗金币（免费次数用完后） */
const REROLL_GOLD_COST = 50;

/** 开局发放武将数 */
export const INITIAL_HERO_COUNT = 3;

/** 每个武将的免费 Reroll 次数 */
export const FREE_REROLLS_PER_SLOT = 1;

let instanceCounter = 0;

/** 生成唯一的 instanceId */
function genInstanceId(): string {
  return `hero_${Date.now()}_${++instanceCounter}`;
}

/** 从模板创建武将实例（1星） */
export function createHeroInstance(templateId: string): HeroInstance | null {
  const tmpl = HERO_TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return null;

  return {
    instanceId: genInstanceId(),
    templateId: tmpl.id,
    name: tmpl.name,
    faction: tmpl.faction,
    heroClass: tmpl.heroClass,
    starLevel: 1,
    attack: tmpl.baseAttack,
    speed: tmpl.baseSpeed,
    specialPower: tmpl.baseSpecialPower,
    skillId: tmpl.skillId,
    atb: 0,
    buffs: [],
  };
}

/** 按星级计算属性加成（每升1星+10%） */
function applyStarBonus(base: number, starLevel: number): number {
  return Math.round(base * (1 + (starLevel - 1) * 0.1));
}

/** 从模板池中随机抽取一个（排除已有武将以增加多样性） */
function randomHeroFromPool(pool: readonly { id: string }[], excludeIds: Set<string>): string | null {
  const candidates = pool.filter(t => !excludeIds.has(t.id));
  if (candidates.length === 0) {
    // 无法排除时从全池抽
    const fallback = pool[Math.floor(Math.random() * pool.length)];
    return fallback?.id ?? null;
  }
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

/** 生成初始武将（3个不同武将） */
export function generateInitialHeroes(): HeroInstance[] {
  const heroes: HeroInstance[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < INITIAL_HERO_COUNT; i++) {
    const templateId = randomHeroFromPool(HERO_TEMPLATES, usedIds);
    if (!templateId) break;
    const hero = createHeroInstance(templateId);
    if (hero) {
      heroes.push(hero);
      usedIds.add(templateId);
    }
  }
  return heroes;
}

export function registerSquadHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {

  // ── 使用将星抽取武将 ──
  socket.on('squad:use_star', ({ filter }) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player || !player.inGame) return;
    if (player.status === 'in_battle') {
      socket.emit('notification', { type: 'error', message: '战斗中无法使用将星' });
      return;
    }

    // 检查背包中有将星
    const starIdx = player.inventory.findIndex(i => i.type === ItemType.Star);
    if (starIdx === -1) {
      socket.emit('notification', { type: 'error', message: '没有将星' });
      return;
    }

    // 按筛选条件获取候选武将
    let pool: { id: string }[];
    if (filter.type === 'faction') {
      pool = getHeroesByFaction(filter.value as Faction);
    } else {
      pool = getHeroesByClass(filter.value as HeroClass);
    }

    if (pool.length === 0) {
      socket.emit('notification', { type: 'error', message: '无匹配武将' });
      return;
    }

    // 已拥有的武将模板ID
    const ownedIds = new Set<string>();
    player.formation.forEach(h => { if (h) ownedIds.add(h.templateId); });
    player.bench.forEach(h => ownedIds.add(h.templateId));

    const templateId = randomHeroFromPool(pool, ownedIds);
    if (!templateId) {
      socket.emit('notification', { type: 'error', message: '无可抽取武将' });
      return;
    }

    const newHero = createHeroInstance(templateId);
    if (!newHero) return;

    // 消耗将星
    player.inventory.splice(starIdx, 1);

    // 检查是否可升星（同名武将）
    const merged = tryMergeHero(player, newHero);

    if (!merged) {
      // 放入备战席
      player.bench.push(newHero);
    }

    // 同步
    socket.emit('state:patch', {
      formation: player.formation,
      bench: player.bench,
      inventory: player.inventory,
    });
    socket.emit('notification', {
      type: 'success',
      message: merged
        ? `${newHero.name} 升星！`
        : `获得 ${newHero.name}`,
      data: { centerFloat: true },
    });

    console.log(`[将星] ${player.username} 抽取 ${newHero.name}${merged ? '(升星)' : ''}`);
  });

  // ── 更新编队排布 ──
  socket.on('squad:update_formation', ({ formation }) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player || !player.inGame) return;
    if (player.status === 'in_battle') {
      socket.emit('notification', { type: 'error', message: '战斗中无法调整编队' });
      return;
    }

    if (!Array.isArray(formation) || formation.length !== 5) {
      socket.emit('notification', { type: 'error', message: '编队数据无效' });
      return;
    }

    // 收集所有当前拥有的武将（formation + bench）
    const allHeroes = new Map<string, HeroInstance>();
    player.formation.forEach(h => { if (h) allHeroes.set(h.instanceId, h); });
    player.bench.forEach(h => allHeroes.set(h.instanceId, h));

    // 验证编队中的 instanceId 有效且无重复
    const usedIds = new Set<string>();
    const newFormation: (HeroInstance | null)[] = [];

    for (const id of formation) {
      if (id === null) {
        newFormation.push(null);
      } else {
        if (usedIds.has(id) || !allHeroes.has(id)) {
          socket.emit('notification', { type: 'error', message: '编队包含无效武将' });
          return;
        }
        usedIds.add(id);
        newFormation.push(allHeroes.get(id)!);
      }
    }

    // 剩余武将放入备战席
    const newBench: HeroInstance[] = [];
    allHeroes.forEach((hero, id) => {
      if (!usedIds.has(id)) {
        newBench.push(hero);
      }
    });

    player.formation = newFormation;
    player.bench = newBench;

    socket.emit('state:patch', {
      formation: player.formation,
      bench: player.bench,
    });

    console.log(`[编队] ${player.username} 更新编队`);
  });

  // ── 开局 Reroll ──
  socket.on('squad:reroll', ({ slot, useGold }) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player || !player.inGame) return;

    // reroll 状态存储在玩家 metadata 中（运行时扩展）
    const rerollState = getRerollState(player);
    if (!rerollState) {
      socket.emit('notification', { type: 'error', message: '当前不在Reroll阶段' });
      return;
    }

    if (slot < 0 || slot >= rerollState.heroes.length) {
      socket.emit('notification', { type: 'error', message: '无效的槽位' });
      return;
    }

    // 检查免费次数或金币
    const freeLeft = rerollState.freeRerolls[slot] ?? 0;
    if (freeLeft <= 0 && !useGold) {
      socket.emit('notification', { type: 'error', message: '免费次数已用完，需消耗金币' });
      return;
    }
    if (freeLeft <= 0 && useGold && player.gold < REROLL_GOLD_COST) {
      socket.emit('notification', { type: 'error', message: `金币不足，需要 ${REROLL_GOLD_COST}` });
      return;
    }

    // 生成新武将（排除当前 reroll 中的其他武将）
    const excludeIds = new Set(rerollState.heroes.map(h => h.templateId));
    const newTemplateId = randomHeroFromPool(HERO_TEMPLATES, excludeIds);
    if (!newTemplateId) {
      socket.emit('notification', { type: 'error', message: '无可替换武将' });
      return;
    }
    const newHero = createHeroInstance(newTemplateId);
    if (!newHero) return;

    // 消耗
    if (freeLeft > 0) {
      rerollState.freeRerolls[slot] = freeLeft - 1;
    } else {
      player.gold -= REROLL_GOLD_COST;
    }

    rerollState.heroes[slot] = newHero;

    // 推送更新
    socket.emit('game:initial_heroes', {
      heroes: rerollState.heroes,
      freeRerolls: [...rerollState.freeRerolls],
    });
    socket.emit('state:patch', { gold: player.gold });

    console.log(`[Reroll] ${player.username} 重随槽位${slot} → ${newHero.name}`);
  });

  // ── 确认 Reroll 完成，武将上阵 ──
  socket.on('squad:confirm_reroll', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player || !player.inGame) return;

    finalizeReroll(player);

    socket.emit('state:patch', {
      formation: player.formation,
      bench: player.bench,
    });

    console.log(`[Reroll] ${player.username} 确认编队: ${player.formation.filter(Boolean).map(h => h!.name).join(', ')}`);
  });
}

// ── 升星逻辑 ──

/** 尝试将新武将与已有同名武将合并升星，返回是否成功 */
export function tryMergeHero(player: { formation: (HeroInstance | null)[]; bench: HeroInstance[] }, newHero: HeroInstance): boolean {
  // 先查编队
  for (let i = 0; i < player.formation.length; i++) {
    const existing = player.formation[i];
    if (existing && existing.templateId === newHero.templateId && existing.starLevel < 5) {
      upgradeHero(existing);
      return true;
    }
  }
  // 再查备战席
  for (const existing of player.bench) {
    if (existing.templateId === newHero.templateId && existing.starLevel < 5) {
      upgradeHero(existing);
      return true;
    }
  }
  return false;
}

/** 升星：属性+10% */
function upgradeHero(hero: HeroInstance): void {
  hero.starLevel = Math.min(5, hero.starLevel + 1);
  const tmpl = HERO_TEMPLATES.find(t => t.id === hero.templateId);
  if (tmpl) {
    hero.attack = applyStarBonus(tmpl.baseAttack, hero.starLevel);
    hero.speed = applyStarBonus(tmpl.baseSpeed, hero.starLevel);
    hero.specialPower = applyStarBonus(tmpl.baseSpecialPower, hero.starLevel);
  }
}

// ── Reroll 状态管理 ──
// 用 WeakMap 存储 reroll 阶段临时状态，避免污染 PlayerState 类型

interface RerollState {
  heroes: HeroInstance[];
  freeRerolls: number[];  // 每个槽位剩余免费次数
}

const rerollStates = new Map<string, RerollState>();

/** 初始化 reroll 状态 */
export function initRerollState(playerId: string, heroes: HeroInstance[]): RerollState {
  const state: RerollState = {
    heroes,
    freeRerolls: heroes.map(() => FREE_REROLLS_PER_SLOT),
  };
  rerollStates.set(playerId, state);
  return state;
}

/** 获取 reroll 状态 */
function getRerollState(player: { playerId: string }): RerollState | undefined {
  return rerollStates.get(player.playerId);
}

/** 确认 reroll 完成，将武将放入编队/备战席 */
export function finalizeReroll(player: {
  playerId: string;
  formation: (HeroInstance | null)[];
  bench: HeroInstance[];
}): void {
  const state = rerollStates.get(player.playerId);
  if (!state) return;

  // 将 reroll 武将放入编队（最多5个，3个刚好全上阵）
  for (let i = 0; i < state.heroes.length && i < 5; i++) {
    player.formation[i] = state.heroes[i];
  }

  rerollStates.delete(player.playerId);
}
