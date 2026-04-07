import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import { TOMES, TOME_ENTRY_COSTS, MAX_TOMES_PER_GAME, TOME_MAP } from '../../../shared/data/tomes.js';
import { RoomManager } from '../rooms/manager.js';
import { createPlayerState, gmAddGold } from '../state/player.js';
import { generateInitialHeroes, initRerollState, FREE_REROLLS_PER_SLOT, INITIAL_HERO_COUNT } from './squad.js';
import { startNpcPatrol } from '../npc/patrol.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerLobbyHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {
  // 登录（仅用户名）
  socket.on('lobby:login', ({ username }) => {
    if (!username || username.trim().length === 0) {
      socket.emit('lobby:error', { message: '用户名不能为空' });
      return;
    }

    const playerId = `player_${socket.id}`;
    const player = createPlayerState(playerId, username.trim());
    roomManager.registerPlayer(socket.id, player);

    console.log(`[登录] ${username} (${playerId})`);

    socket.emit('lobby:login_ok', { playerId, state: player });
  });

  // GM指令：加10000金币
  socket.on('lobby:gm_add_gold', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    gmAddGold(player);
    socket.emit('state:patch', { gold: player.gold });
    console.log(`[GM] ${player.username} 金币 +10000 → ${player.gold}`);
  });

  // 选择兵书
  socket.on('lobby:select_tomes', ({ tomeIds }) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    if (tomeIds.length > MAX_TOMES_PER_GAME) {
      socket.emit('lobby:error', { message: `最多携带 ${MAX_TOMES_PER_GAME} 个兵书` });
      return;
    }

    // 计算入场费
    let totalCost = 0;
    for (let i = 0; i < tomeIds.length; i++) {
      totalCost += TOME_ENTRY_COSTS[i];
    }

    if (player.gold < totalCost) {
      socket.emit('lobby:error', { message: `金币不足，需要 ${totalCost}，当前 ${player.gold}` });
      return;
    }

    // 验证兵书ID有效
    const selectedTomes = tomeIds.map(id => TOME_MAP.get(id)).filter(Boolean);
    if (selectedTomes.length !== tomeIds.length) {
      socket.emit('lobby:error', { message: '包含无效的兵书' });
      return;
    }

    player.activeTomes = selectedTomes as typeof player.activeTomes;
    player.gold -= totalCost;

    socket.emit('state:patch', { activeTomes: player.activeTomes, gold: player.gold });
    console.log(`[兵书] ${player.username} 选择了 ${selectedTomes.map(t => t!.name).join(', ')}，花费 ${totalCost}`);
  });

  // 出征入局
  socket.on('lobby:deploy', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    if (player.inGame) {
      socket.emit('lobby:error', { message: '已经在局内' });
      return;
    }

    // 获取/创建房间
    const room = roomManager.getAvailableRoom();
    const isNewRoom = room.players.size === 0;
    roomManager.joinRoom(player.playerId, room);

    // 首个玩家加入时启动NPC巡逻
    if (isNewRoom) {
      startNpcPatrol(io, room, roomManager);
    }

    // 切换到局内状态
    player.inGame = true;
    player.status = 'exploring';

    // 加入Socket房间
    socket.join(room.id);

    // 发送完整状态同步
    socket.emit('state:sync', player);
    socket.emit('map:init', room.getMapState());

    // 发放初始武将
    const initialHeroes = generateInitialHeroes();
    initRerollState(player.playerId, initialHeroes);
    socket.emit('game:initial_heroes', {
      heroes: initialHeroes,
      freeRerolls: initialHeroes.map(() => FREE_REROLLS_PER_SLOT),
    });

    console.log(`[出征] ${player.username} 进入 ${room.id}，初始武将: ${initialHeroes.map(h => h.name).join(', ')}`);
  });
}
