import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import type { NPCPatrol } from '../../../shared/types/map.js';
import { CITY_MAP, MAP_CITIES } from '../../../shared/data/maps.js';
import { GameRoom } from '../rooms/room.js';
import { RoomManager } from '../rooms/manager.js';
import { triggerNpcEncounter } from './npcEncounter.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

/** NPC巡逻间隔（毫秒） */
const PATROL_INTERVAL = 15000;

/** NPC移动到下一城池的耗时（毫秒） */
const NPC_MOVE_DURATION = 5000;

/** 初始NPC配置（仅保留一个强力巡逻NPC） */
const NPC_CONFIGS = [
  { id: 'npc_lubu', name: '吕布', power: 99999 },
];

/** 房间NPC巡逻定时器 */
const patrolTimers = new Map<string, NodeJS.Timeout>();

/** NPC出现延迟（毫秒） */
const NPC_SPAWN_DELAY = 60000;

/** 房间NPC延迟生成定时器 */
const spawnTimers = new Map<string, NodeJS.Timeout>();

/** 初始化房间NPC巡逻（延迟60秒后出现） */
export function startNpcPatrol(io: IOServer, room: GameRoom, roomManager: RoomManager): void {
  // 先广播空NPC列表
  io.to(room.id).emit('map:update', { npcs: [] });

  // 通知玩家NPC将在60秒后出现
  io.to(room.id).emit('notification', {
    type: 'warning',
    message: '巡逻NPC将在60秒后出现，请做好准备！',
  });

  // 延迟生成NPC
  const spawnTimer = setTimeout(() => {
    spawnTimers.delete(room.id);
    if (room.phase === 'ended') return;

    const cityIds = MAP_CITIES.map(c => c.id);

    // 收集所有有玩家的城池
    const occupiedCityIds = new Set<string>();
    for (const [cityId, city] of room.cities) {
      if (city.presentPlayerIds.length > 0 || city.ambushPlayerIds.length > 0) {
        occupiedCityIds.add(cityId);
      }
    }

    for (const config of NPC_CONFIGS) {
      // 优先选择没有玩家的城池
      const safeCities = cityIds.filter(id => !occupiedCityIds.has(id));
      const pool = safeCities.length > 0 ? safeCities : cityIds;
      const startCity = pool[Math.floor(Math.random() * pool.length)];
      const npc: NPCPatrol = {
        id: config.id,
        name: config.name,
        currentCityId: startCity,
        targetCityId: pickNextCity(startCity),
        power: config.power,
      };
      room.npcs.push(npc);
    }

    // 广播NPC出现
    io.to(room.id).emit('map:update', { npcs: room.npcs });
    io.to(room.id).emit('notification', {
      type: 'error',
      message: '吕布已出现在地图上！注意规避！',
    });

    // 启动巡逻定时器
    const timer = setInterval(() => {
      tickNpcPatrol(io, room, roomManager);
    }, PATROL_INTERVAL);
    patrolTimers.set(room.id, timer);
  }, NPC_SPAWN_DELAY);

  spawnTimers.set(room.id, spawnTimer);
}

/** 停止房间NPC巡逻 */
export function stopNpcPatrol(roomId: string): void {
  const timer = patrolTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    patrolTimers.delete(roomId);
  }
  const spawnTimer = spawnTimers.get(roomId);
  if (spawnTimer) {
    clearTimeout(spawnTimer);
    spawnTimers.delete(roomId);
  }
}

/** NPC巡逻Tick：移动到下一城池 */
function tickNpcPatrol(io: IOServer, room: GameRoom, roomManager: RoomManager): void {
  if (room.phase === 'ended') {
    stopNpcPatrol(room.id);
    return;
  }

  for (const npc of room.npcs) {
    const from = npc.currentCityId;
    const to = npc.targetCityId;

    // 广播NPC移动
    io.to(room.id).emit('map:npc_move', { npcId: npc.id, from, to });

    // 延迟后NPC到达
    setTimeout(() => {
      npc.currentCityId = to;
      npc.targetCityId = pickNextCity(to, from);

      // 广播更新
      io.to(room.id).emit('map:update', { npcs: room.npcs });

      // 检查到达城池是否有玩家 → 触发NPC遭遇
      const city = room.cities.get(to);
      if (city) {
        const allPlayerIds = [...city.presentPlayerIds, ...city.ambushPlayerIds];
        for (const playerId of allPlayerIds) {
          const player = roomManager.getPlayerById(playerId);
          if (player && player.status !== 'in_battle') {
            triggerNpcEncounter(io, roomManager, player, npc);
          }
        }
      }
    }, NPC_MOVE_DURATION);
  }
}

/** 检查指定城池是否有强力NPC，若有则触发战斗 */
export function checkNpcAtCity(
  io: IOServer,
  room: GameRoom,
  roomManager: RoomManager,
  playerId: string,
  cityId: string,
): void {
  for (const npc of room.npcs) {
    if (npc.currentCityId === cityId) {
      const player = roomManager.getPlayerById(playerId);
      if (player && player.status !== 'in_battle') {
        triggerNpcEncounter(io, roomManager, player, npc);
      }
    }
  }
}

/** 选择下一个城池（避免回头路） */
function pickNextCity(currentCityId: string, previousCityId?: string): string {
  const city = CITY_MAP.get(currentCityId);
  if (!city) return currentCityId;

  const candidates = city.connections.filter(id => id !== previousCityId);
  if (candidates.length === 0) {
    return city.connections[Math.floor(Math.random() * city.connections.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
