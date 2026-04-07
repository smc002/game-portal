import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import { CITY_MAP, BASE_MOVE_DURATION } from '../../../shared/data/maps.js';
import { RoomManager } from '../rooms/manager.js';
import { setPlayerTimer, clearPlayerTimer } from '../state/timers.js';
import { checkArrivalEncounter } from './encounter.js';
import { hasSpeedBuff } from './explore.js';
import { checkNpcAtCity } from '../npc/patrol.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerMovementHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
): void {
  socket.on('game:move', ({ targetCityId }) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoomBySocket(socket.id);
    if (!player || !room) return;

    if (player.isMoving) {
      socket.emit('notification', { type: 'error', message: '正在移动中' });
      return;
    }
    if (player.status === 'in_battle') {
      socket.emit('notification', { type: 'error', message: '战斗中无法移动' });
      return;
    }

    const currentCity = CITY_MAP.get(player.currentCityId);
    if (!currentCity || !currentCity.connections.includes(targetCityId)) {
      socket.emit('notification', { type: 'error', message: '无法到达该城池' });
      return;
    }

    // 取消搜索/蹲守状态
    if (player.status === 'searching') {
      clearPlayerTimer(player.playerId, 'search');
    }
    if (player.status === 'ambushing') {
      const city = room.cities.get(player.currentCityId);
      if (city) {
        city.ambushPlayerIds = city.ambushPlayerIds.filter((id: string) => id !== player.playerId);
      }
    }

    // 开始移动
    player.isMoving = true;
    player.moveTarget = targetCityId;
    player.moveProgress = 0;
    player.status = 'moving';

    socket.emit('state:patch', {
      isMoving: true,
      moveTarget: targetCityId,
      moveProgress: 0,
      status: 'moving',
    });

    const speedMultiplier = hasSpeedBuff(player) ? 0.5 : 1;
    const duration = BASE_MOVE_DURATION * 1000 * speedMultiplier;
    const startTime = Date.now();

    // 进度更新（每200ms）
    const progressTimer = setInterval(() => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      player.moveProgress = progress;
      socket.emit('state:patch', { moveProgress: progress });
    }, 200);
    setPlayerTimer(player.playerId, 'move_progress', progressTimer);

    // 移动完成
    const completeTimer = setTimeout(() => {
      clearPlayerTimer(player.playerId, 'move_progress');

      // 从旧城池移除，加入新城池
      const oldCity = room.cities.get(player.currentCityId);
      const newCity = room.cities.get(targetCityId);
      if (oldCity) {
        oldCity.presentPlayerIds = oldCity.presentPlayerIds.filter((id: string) => id !== player.playerId);
      }
      if (newCity) {
        newCity.presentPlayerIds.push(player.playerId);
      }

      player.currentCityId = targetCityId;
      player.isMoving = false;
      player.moveTarget = null;
      player.moveProgress = 0;
      player.status = 'exploring';

      socket.emit('state:patch', {
        currentCityId: targetCityId,
        isMoving: false,
        moveTarget: null,
        moveProgress: 0,
        status: 'exploring',
      });

      // 广播地图更新给房间所有人
      io.to(room.id).emit('map:update', { cities: room.getMapState().cities });

      const cityName = CITY_MAP.get(targetCityId)?.name ?? targetCityId;
      socket.emit('notification', { type: 'info', message: `已到达 ${cityName}` });
      console.log(`[移动] ${player.username} 到达 ${cityName}`);

      // 到达后检测强力NPC（吕布同城立即战斗）
      checkNpcAtCity(io, room, roomManager, player.playerId, targetCityId);

      // 到达后检测PvP遭遇
      checkArrivalEncounter(io, roomManager, room, player.playerId, targetCityId);
    }, duration);
    setPlayerTimer(player.playerId, 'move', completeTimer);

    const targetName = CITY_MAP.get(targetCityId)?.name ?? targetCityId;
    console.log(`[移动] ${player.username} 开始移动 → ${targetName}`);
  });
}
