import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import type { PlayerState } from '../../../shared/types/player.js';
import { ItemType } from '../../../shared/types/items.js';
import { RoomManager } from '../rooms/manager.js';
import { GameRoom } from '../rooms/room.js';
import { executeBattle } from './battle.js';
import { SPAWN_CITY_ID } from '../../../shared/data/maps.js';
import { clearAllPlayerTimers, clearPlayerTimer } from '../state/timers.js';
import { runBattle } from '../../../shared/battle/engine.js';
import type { CombatantEntity, BattleResultPayload } from '../../../shared/types/battle.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** 搜索时遭遇概率（每次搜索tick） */
const SEARCH_ENCOUNTER_CHANCE = 0.08;

/** 逃跑丢弃物资数量 */
const FLEE_DROP_COUNT = 2;

/** 活跃的遭遇（等待玩家选择迎战/逃离） */
interface PendingEncounter {
  attackerId: string;
  defenderId: string;
  type: 'normal' | 'ambush';
  createdAt: number;
  /** NPC遭遇数据（非空时表示PvE） */
  npcData?: {
    npcName: string;
    formation: (import('../../../shared/types/hero.js').HeroInstance | null)[];
    hp: number;
    /** 弱NPC战败不会杀死玩家 */
    isWeak: boolean;
  };
}

const pendingEncounters = new Map<string, PendingEncounter>();

/** 获取玩家真实战力 */
function getRealPower(player: PlayerState): number {
  let power = 0;
  for (const hero of player.formation) {
    if (hero) {
      power += (hero.attack + hero.speed + hero.specialPower) * hero.starLevel;
    }
  }
  return power;
}

/** 获取玩家预估战力（可被虚张声势影响） */
function estimatePower(player: PlayerState): number {
  let power = getRealPower(player);
  // 检查虚张声势Buff
  const hasBluff = player.activeBuffs?.some(b => b.type === 'bluff') ||
    player.inventory.some(i => i.type === ItemType.Bluff);
  if (hasBluff) power = Math.round(power * 2.5);
  return power;
}

/** 获取侦察后的战力（看穿虚张声势） */
function estimatePowerWithScout(target: PlayerState, viewer: PlayerState): number {
  const hasScout = (viewer as any)._scoutActive === true;
  if (hasScout) {
    // 消耗侦察状态
    delete (viewer as any)._scoutActive;
    return getRealPower(target);
  }
  return estimatePower(target);
}

/** 发起遭遇预警 */
export function triggerEncounter(
  io: IOServer,
  roomManager: RoomManager,
  attackerId: string,
  defenderId: string,
  type: 'normal' | 'ambush'
): void {
  const attacker = roomManager.getPlayerById(attackerId);
  const defender = roomManager.getPlayerById(defenderId);
  if (!attacker || !defender) return;

  // 双方不能已在战斗中
  if (attacker.status === 'in_battle' || defender.status === 'in_battle') return;

  // 停止双方搜索
  clearPlayerTimer(attackerId, 'search');
  clearPlayerTimer(defenderId, 'search');
  if (attacker.status === 'searching') attacker.status = 'exploring';
  if (defender.status === 'searching') defender.status = 'exploring';

  // 记录待处理遭遇
  const encounter: PendingEncounter = { attackerId, defenderId, type, createdAt: Date.now() };
  pendingEncounters.set(defenderId, encounter);

  // 给防守方发送遭遇预警（侦察兵可看穿虚张声势）
  const defenderSocket = roomManager.getSocketByPlayerId(defenderId);
  if (defenderSocket) {
    io.to(defenderSocket).emit('encounter:alert', {
      enemyId: attackerId,
      enemyName: attacker.username,
      estimatedPower: estimatePowerWithScout(attacker, defender),
      type,
    });
    io.to(defenderSocket).emit('state:patch', { status: 'exploring' });
  }

  // 偷袭方直接锁定
  const attackerSocket = roomManager.getSocketByPlayerId(attackerId);
  if (attackerSocket) {
    io.to(attackerSocket).emit('notification', {
      type: 'info',
      message: type === 'ambush'
        ? `偷袭 ${defender.username}！等待对方响应...`
        : `遭遇 ${defender.username}！等待对方响应...`,
    });
  }

  // 15秒超时 → 自动迎战
  setTimeout(() => {
    const pending = pendingEncounters.get(defenderId);
    if (pending && pending.createdAt === encounter.createdAt) {
      pendingEncounters.delete(defenderId);
      startBattle(io, roomManager, attackerId, defenderId);
    }
  }, 15000);

  console.log(`[遭遇] ${attacker.username} ${type === 'ambush' ? '偷袭' : '遭遇'} ${defender.username}`);
}

/** 执行战斗并处理后续 */
function startBattle(
  io: IOServer,
  roomManager: RoomManager,
  attackerId: string,
  defenderId: string
): void {
  const result = executeBattle(io, roomManager, attackerId, defenderId);
  if (!result) return;

  const winnerId = result.winner === 'A' ? attackerId : defenderId;
  const loserId = result.winner === 'A' ? defenderId : attackerId;
  const winner = roomManager.getPlayerById(winnerId);
  const loser = roomManager.getPlayerById(loserId);

  if (!winner || !loser) return;

  // 败者是否死亡
  if (loser.hp <= 0) {
    handleDeath(io, roomManager, loser);
  }

  // 给胜者发送掠夺选项
  const winnerSocket = roomManager.getSocketByPlayerId(winnerId);
  if (winnerSocket && loser.hp <= 0) {
    // 随机选一个败者武将
    const loserHeroes = loser.formation.filter(h => h !== null);
    const heroOption = loserHeroes.length > 0
      ? loserHeroes[Math.floor(Math.random() * loserHeroes.length)]!
      : null;
    // 物资选项：败者背包普通物资总值的30%
    const resourceAmount = Math.round(
      loser.inventory.filter(i => i.type === ItemType.Resource).reduce((sum, i) => sum + i.goldValue, 0) * 0.3
    );

    // 记录掠夺选项
    pendingLoots.set(winnerId, { loserId, heroOption, resourceAmount });

    io.to(winnerSocket).emit('loot:options', { heroOption, resourceAmount });

    // 兵书自动掠夺
    if (loser.activeTomes.length > 0) {
      const droppedTome = loser.activeTomes.splice(
        Math.floor(Math.random() * loser.activeTomes.length), 1
      )[0];
      winner.ownedTomes.push(droppedTome);
      io.to(winnerSocket).emit('notification', {
        type: 'success',
        message: `掠夺兵书: ${droppedTome.name}`,
      });
    }
  }
}

/** 处理玩家死亡 */
function handleDeath(
  io: IOServer,
  roomManager: RoomManager,
  player: PlayerState
): void {
  const room = roomManager.getRoomBySocket(
    roomManager.getSocketByPlayerId(player.playerId) ?? ''
  );

  clearAllPlayerTimers(player.playerId);

  // 从房间移除
  if (room) {
    const city = room.cities.get(player.currentCityId);
    if (city) {
      city.presentPlayerIds = city.presentPlayerIds.filter(id => id !== player.playerId);
      city.ambushPlayerIds = city.ambushPlayerIds.filter(id => id !== player.playerId);
    }
    room.removePlayer(player.playerId);
    const playerSocket = roomManager.getSocketByPlayerId(player.playerId);
    if (playerSocket) {
      io.sockets.sockets.get(playerSocket)?.leave(room.id);
    }
    roomManager.leaveRoom(player.playerId);
    io.to(room.id).emit('map:update', { cities: room.getMapState().cities });
  }

  // 重置状态
  player.inGame = false;
  player.status = 'in_lobby';
  player.isMoving = false;
  player.moveTarget = null;
  player.moveProgress = 0;
  player.hp = player.maxHp;
  player.shield = 0;
  player.formation = [null, null, null, null, null];
  player.bench = [];
  player.inventory = [];
  player.activeBuffs = [];
  player.fleeCount = 2;
  player.starPurchaseCount = 0;
  player.currentCityId = SPAWN_CITY_ID;

  const playerSocket = roomManager.getSocketByPlayerId(player.playerId);
  if (playerSocket) {
    io.to(playerSocket).emit('state:sync', player);
    io.to(playerSocket).emit('notification', {
      type: 'error',
      message: '你已阵亡！所有武将和物资已销毁。',
    });
  }

  console.log(`[死亡] ${player.username} 阵亡`);
}

// ── 掠夺待处理 ──
interface PendingLoot {
  loserId: string;
  heroOption: import('../../../shared/types/hero.js').HeroInstance | null;
  resourceAmount: number;
}

export const pendingLoots = new Map<string, PendingLoot>();

export function registerEncounterHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {
  // ── 迎战 ──
  socket.on('encounter:fight', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    const encounter = pendingEncounters.get(player.playerId);
    if (!encounter) {
      socket.emit('notification', { type: 'error', message: '没有待处理的遭遇' });
      return;
    }

    pendingEncounters.delete(player.playerId);

    if (encounter.npcData) {
      // NPC遭遇 → 执行NPC战斗
      executeNpcBattle(io, roomManager, player, encounter);
    } else {
      // PvP遭遇
      startBattle(io, roomManager, encounter.attackerId, encounter.defenderId);
    }
  });

  // ── 逃离 ──
  socket.on('encounter:flee', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    const encounter = pendingEncounters.get(player.playerId);
    if (!encounter) {
      socket.emit('notification', { type: 'error', message: '没有待处理的遭遇' });
      return;
    }

    if (player.fleeCount <= 0) {
      socket.emit('notification', { type: 'error', message: '逃跑次数已用完，必须迎战！' });
      pendingEncounters.delete(player.playerId);
      if (encounter.npcData) {
        executeNpcBattle(io, roomManager, player, encounter);
      } else {
        startBattle(io, roomManager, encounter.attackerId, encounter.defenderId);
      }
      return;
    }

    pendingEncounters.delete(player.playerId);
    player.fleeCount--;

    if (encounter.npcData) {
      // NPC遭遇逃离 — 不掉落物资，仅消耗逃跑次数
      socket.emit('state:patch', { fleeCount: player.fleeCount });
      socket.emit('notification', {
        type: 'info',
        message: `成功脱离 ${encounter.npcData.npcName}！剩余逃跑次数: ${player.fleeCount}`,
      });
      console.log(`[逃跑] ${player.username} 逃离了NPC ${encounter.npcData.npcName}`);
    } else {
      // PvP逃离 — 掉落物资给攻击方
      const attacker = roomManager.getPlayerById(encounter.attackerId);
      if (attacker) {
        const resources = player.inventory.filter(i => i.type === ItemType.Resource);
        const dropCount = Math.min(FLEE_DROP_COUNT, resources.length);
        for (let i = 0; i < dropCount; i++) {
          const dropIdx = player.inventory.findIndex(item => item.type === ItemType.Resource);
          if (dropIdx >= 0) {
            const dropped = player.inventory.splice(dropIdx, 1)[0];
            attacker.inventory.push(dropped);
          }
        }

        const attackerSocket = roomManager.getSocketByPlayerId(encounter.attackerId);
        if (attackerSocket) {
          io.to(attackerSocket).emit('notification', {
            type: 'info',
            message: `${player.username} 逃跑了，掉落了 ${dropCount} 件物资`,
          });
          io.to(attackerSocket).emit('state:patch', { inventory: attacker.inventory });
        }
      }

      socket.emit('state:patch', { fleeCount: player.fleeCount, inventory: player.inventory });
      socket.emit('notification', {
        type: 'warning',
        message: `逃跑成功！掉落了物资。剩余逃跑次数: ${player.fleeCount}`,
      });
      console.log(`[逃跑] ${player.username} 逃离了 ${attacker?.username ?? '未知'}`);
    }
  });

  // ── 蹲守偷袭 ──
  socket.on('game:ambush_attack', ({ targetPlayerId }) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoomBySocket(socket.id);
    if (!player || !room) return;

    if (player.status !== 'ambushing') {
      socket.emit('notification', { type: 'error', message: '你不在蹲守状态' });
      return;
    }

    const target = roomManager.getPlayerById(targetPlayerId);
    if (!target || target.currentCityId !== player.currentCityId) {
      socket.emit('notification', { type: 'error', message: '目标不在此城池' });
      return;
    }

    // 取消蹲守状态
    const city = room.cities.get(player.currentCityId);
    if (city) {
      city.ambushPlayerIds = city.ambushPlayerIds.filter(id => id !== player.playerId);
      if (!city.presentPlayerIds.includes(player.playerId)) {
        city.presentPlayerIds.push(player.playerId);
      }
    }
    player.status = 'exploring';

    // 发起偷袭遭遇
    triggerEncounter(io, roomManager, player.playerId, targetPlayerId, 'ambush');
  });
}

/** 搜索时随机触发遭遇（供 explore handler 调用） */
export function trySearchEncounter(
  io: IOServer,
  roomManager: RoomManager,
  room: GameRoom,
  player: PlayerState
): boolean {
  if (Math.random() > SEARCH_ENCOUNTER_CHANCE) return false;

  const city = room.cities.get(player.currentCityId);
  if (!city) return false;

  // 查找同城池内其他非蹲守玩家
  const otherPlayers = city.presentPlayerIds.filter(id => id !== player.playerId);
  if (otherPlayers.length === 0) return false;

  const targetId = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
  const target = roomManager.getPlayerById(targetId);
  if (!target || target.status === 'in_battle') return false;

  triggerEncounter(io, roomManager, targetId, player.playerId, 'normal');
  return true;
}

/** 到达城池时检测遭遇（供 movement handler 调用） */
export function checkArrivalEncounter(
  io: IOServer,
  roomManager: RoomManager,
  room: GameRoom,
  arrivingPlayerId: string,
  cityId: string
): void {
  const city = room.cities.get(cityId);
  if (!city) return;

  // 检查是否有蹲守者 → 反噬机制（两个蹲守者同城强制战斗在蹲守handler处理）
  // 蹲守者可以选择发动偷袭（通过 ambush_attack 事件），这里不自动触发

  // 检查搜索中的其他玩家（20%概率触发遭遇）
  const otherSearching = city.presentPlayerIds
    .filter(id => id !== arrivingPlayerId)
    .filter(id => {
      const p = roomManager.getPlayerById(id);
      return p && (p.status === 'searching' || p.status === 'exploring');
    });

  if (otherSearching.length > 0 && Math.random() < 0.35) {
    const targetId = otherSearching[Math.floor(Math.random() * otherSearching.length)];
    setTimeout(() => {
      triggerEncounter(io, roomManager, arrivingPlayerId, targetId, 'normal');
    }, 1000); // 1秒延迟，让到达动画播完
  }
}

/** 触发NPC遭遇（弹出选择界面） */
export function triggerNpcEncounterWithChoice(
  io: IOServer,
  roomManager: RoomManager,
  player: PlayerState,
  npcName: string,
  formation: (import('../../../shared/types/hero.js').HeroInstance | null)[],
  hp: number,
  npcPower: number,
  isWeak: boolean,
): void {
  if (player.status === 'in_battle') return;

  clearPlayerTimer(player.playerId, 'search');
  if (player.status === 'searching') player.status = 'exploring';

  const playerSocket = roomManager.getSocketByPlayerId(player.playerId);
  if (!playerSocket) return;

  // 记录NPC遭遇到pending
  const npcId = `npc_${npcName}_${Date.now()}`;
  const encounter: PendingEncounter = {
    attackerId: npcId,
    defenderId: player.playerId,
    type: 'normal',
    createdAt: Date.now(),
    npcData: { npcName, formation, hp, isWeak },
  };
  pendingEncounters.set(player.playerId, encounter);

  // 发送遭遇预警
  io.to(playerSocket).emit('encounter:alert', {
    enemyId: npcId,
    enemyName: npcName,
    estimatedPower: npcPower,
    type: 'normal',
  });
  io.to(playerSocket).emit('state:patch', { status: 'exploring' });

  // 15秒超时 → 自动迎战
  setTimeout(() => {
    const pending = pendingEncounters.get(player.playerId);
    if (pending && pending.createdAt === encounter.createdAt) {
      pendingEncounters.delete(player.playerId);
      executeNpcBattle(io, roomManager, player, pending);
    }
  }, 15000);

  console.log(`[NPC遭遇] ${player.username} 遭遇 ${npcName}(战力:${npcPower}, ${isWeak ? '弱' : '中'})`);
}

/** 执行NPC战斗 */
function executeNpcBattle(
  io: IOServer,
  roomManager: RoomManager,
  player: PlayerState,
  encounter: PendingEncounter,
): void {
  if (!encounter.npcData) return;
  const { npcName, formation: npcFormation, hp: npcHp, isWeak } = encounter.npcData;

  player.status = 'in_battle';

  const playerSocket = roomManager.getSocketByPlayerId(player.playerId);
  if (!playerSocket) return;

  // 构建战斗双方
  const playerCombatant: CombatantEntity = {
    playerId: player.playerId,
    maxHp: player.maxHp,
    currentHp: player.hp,
    shield: player.shield,
    tomes: player.activeTomes,
    buffs: [],
    formation: player.formation.map(h => h ? { ...h, atb: 0, buffs: [] } : null),
  };
  const npcCombatant: CombatantEntity = {
    playerId: `npc_${npcName}`,
    maxHp: npcHp,
    currentHp: npcHp,
    shield: 0,
    tomes: [],
    buffs: [],
    formation: npcFormation.map(h => h ? { ...h, atb: 0, buffs: [] } : null),
  };

  const snapshotA = playerCombatant.formation.map(h => h ? { ...h } : null);
  const snapshotB = npcCombatant.formation.map(h => h ? { ...h } : null);

  const result = runBattle({ playerA: playerCombatant, playerB: npcCombatant });

  const resultPayload: BattleResultPayload = {
    ...result,
    formationA: snapshotA,
    formationB: snapshotB,
    maxHpA: playerCombatant.maxHp,
    maxHpB: npcCombatant.maxHp,
    nameA: player.username,
    nameB: npcName,
  };

  io.to(playerSocket).emit('battle:events', { events: result.events });
  io.to(playerSocket).emit('battle:result', resultPayload);

  if (result.winner === 'A') {
    player.hp = Math.max(1, result.playerA.remainingHp);
    player.shield = result.playerA.shield;
    player.status = 'exploring';

    // 奖励战利品：弱NPC 2-3件，中等NPC 3-5件
    const rewardCount = isWeak
      ? 2 + Math.floor(Math.random() * 2)
      : 3 + Math.floor(Math.random() * 3);
    let rewardGold = 0;
    const goldRange = isWeak ? [5, 15] : [15, 50];
    for (let i = 0; i < rewardCount; i++) {
      const goldValue = goldRange[0] + Math.floor(Math.random() * (goldRange[1] - goldRange[0]));
      rewardGold += goldValue;
      // NPC战利品品质随金额变化
      const lootRarity = goldValue >= 40 ? 'blue' : goldValue >= 20 ? 'green' : 'gray';
      const lootNames: Record<string, string[]> = {
        gray: ['粮草', '布匹', '木材'],
        green: ['铁矿石', '药材', '皮革'],
        blue: ['金锭', '玉石', '丝绸'],
      };
      const names = lootNames[lootRarity] || lootNames.gray;
      const lootName = names[Math.floor(Math.random() * names.length)];
      player.inventory.push({
        id: `loot_npc_${Date.now()}_${i}`,
        name: lootName,
        type: ItemType.Resource,
        goldValue,
        description: '击败NPC获得的物资',
        rarity: lootRarity as 'gray' | 'green' | 'blue',
      });
    }

    io.to(playerSocket).emit('state:patch', {
      hp: player.hp, shield: player.shield, status: player.status,
      inventory: player.inventory,
    });
    const delay = Math.min(result.events.length * 360 + 2000, 15000);
    setTimeout(() => {
      io.to(playerSocket).emit('notification', {
        type: 'success',
        message: `击败 ${npcName}！获得 ${rewardCount} 件战利品（${rewardGold}金）`,
        data: { centerFloat: true },
      });
    }, delay);
  } else {
    // 败北
    if (isWeak) {
      // 弱NPC不杀死玩家
      player.hp = Math.max(1, result.playerA.remainingHp);
      player.shield = result.playerA.shield;
      player.status = 'exploring';
      io.to(playerSocket).emit('state:patch', {
        hp: player.hp, shield: player.shield, status: player.status,
      });
      const delay = Math.min(result.events.length * 360 + 2000, 15000);
      setTimeout(() => {
        io.to(playerSocket).emit('notification', {
          type: 'warning', message: `被 ${npcName} 击败，侥幸逃脱...`,
        });
      }, delay);
    } else {
      // 中等NPC可以杀死玩家
      player.hp = result.playerA.remainingHp;
      player.shield = result.playerA.shield;
      io.to(playerSocket).emit('state:patch', { hp: player.hp, status: 'in_battle' });
      if (player.hp <= 0) {
        const delay = Math.min(result.events.length * 360 + 4000, 15000);
        setTimeout(() => {
          const p = roomManager.getPlayerById(player.playerId);
          if (!p || !p.inGame) return;
          handleDeath(io, roomManager, p);
        }, delay);
      } else {
        player.status = 'exploring';
        io.to(playerSocket).emit('state:patch', { status: 'exploring' });
        const delay = Math.min(result.events.length * 360 + 2000, 15000);
        setTimeout(() => {
          io.to(playerSocket).emit('notification', {
            type: 'warning', message: `被 ${npcName} 击败，侥幸保住一命...`,
          });
        }, delay);
      }
    }
  }

  console.log(`[NPC战斗] ${player.username} vs ${npcName} → ${result.winner === 'A' ? '玩家胜' : '玩家败'}`);
}
