import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import { RoomManager } from '../rooms/manager.js';
import { pendingLoots } from './encounter.js';
import { tryMergeHero } from './squad.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerLootHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {
  socket.on('loot:choose', ({ choice }) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    const loot = pendingLoots.get(player.playerId);
    if (!loot) {
      socket.emit('notification', { type: 'error', message: '没有待处理的掠夺选项' });
      return;
    }

    pendingLoots.delete(player.playerId);

    if (choice === 'hero' && loot.heroOption) {
      // 尝试升星合并
      const merged = tryMergeHero(player, loot.heroOption);
      if (!merged) {
        player.bench.push(loot.heroOption);
      }
      socket.emit('notification', {
        type: 'success',
        message: merged
          ? `掠夺武将 ${loot.heroOption.name} 并升星！`
          : `掠夺武将 ${loot.heroOption.name}`,
        data: { centerFloat: true },
      });
      socket.emit('state:patch', { formation: player.formation, bench: player.bench });
      console.log(`[掠夺] ${player.username} 选择武将 ${loot.heroOption.name}`);
    } else {
      // 选择物资：直接加金币（物资已在败者身上）
      player.gold += loot.resourceAmount;
      socket.emit('notification', {
        type: 'success',
        message: `掠夺物资 ${loot.resourceAmount} 金`,
        data: { centerFloat: true },
      });
      socket.emit('state:patch', { gold: player.gold });
      console.log(`[掠夺] ${player.username} 选择物资 +${loot.resourceAmount}金`);
    }
  });
}
