import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import type { PlayerState } from '../../../shared/types/player.js';
import type { NPCPatrol } from '../../../shared/types/map.js';
import type { CombatantEntity, BattleResultPayload } from '../../../shared/types/battle.js';
import { RoomManager } from '../rooms/manager.js';
import { clearPlayerTimer, clearAllPlayerTimers } from '../state/timers.js';
import { runBattle } from '../../../shared/battle/engine.js';
import { getLubuFormation, getWeakNpcFormation, getMediumNpcFormation, getRandomWeakNpcName, getRandomMediumNpcName, getNpcPower } from '../../../shared/data/npcFormations.js';
import { triggerNpcEncounterWithChoice } from '../handlers/encounter.js';
import { SPAWN_CITY_ID } from '../../../shared/data/maps.js';
import { ItemType } from '../../../shared/types/items.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

/** 构建NPC的CombatantEntity */
function buildNpcCombatant(npcName: string, formation: (import('../../../shared/types/hero.js').HeroInstance | null)[], hp: number): CombatantEntity {
  return {
    playerId: `npc_${npcName}`,
    maxHp: hp,
    currentHp: hp,
    shield: 0,
    tomes: [],
    buffs: [],
    formation: formation.map(h => h ? { ...h, atb: 0, buffs: [] } : null),
  };
}

/** 构建玩家的CombatantEntity */
function buildPlayerCombatant(player: PlayerState): CombatantEntity {
  return {
    playerId: player.playerId,
    maxHp: player.maxHp,
    currentHp: player.hp,
    shield: player.shield,
    tomes: player.activeTomes,
    buffs: [],
    formation: player.formation.map(h => h ? { ...h, atb: 0, buffs: [] } : null),
  };
}

/** 强力NPC遭遇 → 真实战斗（玩家必败） */
export function triggerNpcEncounter(
  io: IOServer,
  roomManager: RoomManager,
  player: PlayerState,
  npc: NPCPatrol,
): void {
  if (player.status === 'in_battle') return;

  // 停止搜索
  clearPlayerTimer(player.playerId, 'search');
  if (player.status === 'searching') player.status = 'exploring';

  const playerSocket = roomManager.getSocketByPlayerId(player.playerId);
  if (!playerSocket) return;

  // 标记战斗状态
  player.status = 'in_battle';

  // 发送NPC遭遇预警
  io.to(playerSocket).emit('encounter:npc_alert', {
    npcId: npc.id,
    npcName: npc.name,
    npcPower: npc.power,
  });

  // 构建战斗双方
  const playerCombatant = buildPlayerCombatant(player);
  const npcFormation = getLubuFormation();
  const npcCombatant = buildNpcCombatant(npc.name, npcFormation, 9999);

  // 保存阵容快照
  const snapshotA = playerCombatant.formation.map(h => h ? { ...h } : null);
  const snapshotB = npcCombatant.formation.map(h => h ? { ...h } : null);

  // 运行战斗引擎
  const result = runBattle({ playerA: playerCombatant, playerB: npcCombatant });

  // 构建带阵容的结果
  const resultPayload: BattleResultPayload = {
    ...result,
    formationA: snapshotA,
    formationB: snapshotB,
    maxHpA: playerCombatant.maxHp,
    maxHpB: npcCombatant.maxHp,
    nameA: player.username,
    nameB: npc.name,
  };

  // 推送战斗事件流和结果
  io.to(playerSocket).emit('battle:events', { events: result.events });
  io.to(playerSocket).emit('battle:result', resultPayload);

  // 玩家必败 → 设置HP为0
  player.hp = 0;
  io.to(playerSocket).emit('state:patch', { hp: 0, status: 'in_battle' });

  // 延迟执行死亡流程（让前端播放战斗动画）
  const estimatedDuration = Math.min(result.events.length * 120 + 4000, 15000);
  setTimeout(() => {
    const p = roomManager.getPlayerById(player.playerId);
    if (!p || !p.inGame) return;
    handleNpcDeath(io, roomManager, p);
  }, estimatedDuration);
}

/** 弱NPC遭遇 → 弹出选择界面（迎战/逃离） */
export function triggerWeakNpcEncounter(
  io: IOServer,
  roomManager: RoomManager,
  player: PlayerState,
): void {
  const npcName = getRandomWeakNpcName();
  const formation = getWeakNpcFormation();
  const power = getNpcPower(formation);

  triggerNpcEncounterWithChoice(io, roomManager, player, npcName, formation, 200, power, true);
}

/** 中等NPC遭遇 → 弹出选择界面（迎战/逃离） */
export function triggerMediumNpcEncounter(
  io: IOServer,
  roomManager: RoomManager,
  player: PlayerState,
): void {
  const npcName = getRandomMediumNpcName();
  const formation = getMediumNpcFormation();
  const power = getNpcPower(formation);

  triggerNpcEncounterWithChoice(io, roomManager, player, npcName, formation, 400, power, false);
}

/** NPC击杀后的死亡处理 */
function handleNpcDeath(
  io: IOServer,
  roomManager: RoomManager,
  player: PlayerState,
): void {
  const socketId = roomManager.getSocketByPlayerId(player.playerId);
  const room = socketId ? roomManager.getRoomBySocket(socketId) : undefined;

  clearAllPlayerTimers(player.playerId);

  if (room) {
    const city = room.cities.get(player.currentCityId);
    if (city) {
      city.presentPlayerIds = city.presentPlayerIds.filter(id => id !== player.playerId);
      city.ambushPlayerIds = city.ambushPlayerIds.filter(id => id !== player.playerId);
    }
    room.removePlayer(player.playerId);
    if (socketId) {
      io.sockets.sockets.get(socketId)?.leave(room.id);
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

  if (socketId) {
    io.to(socketId).emit('state:sync', player);
    io.to(socketId).emit('notification', {
      type: 'error',
      message: '被巡逻NPC击杀！所有武将和物资已销毁。',
    });
  }
}
