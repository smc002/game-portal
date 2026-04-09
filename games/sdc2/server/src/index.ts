import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types/index.js';
import { RoomManager } from './rooms/manager.js';
import { registerLobbyHandlers } from './handlers/lobby.js';
import { registerMovementHandlers } from './handlers/movement.js';
import { registerExploreHandlers } from './handlers/explore.js';
import { registerSquadHandlers } from './handlers/squad.js';
import { registerBattleHandlers } from './handlers/battle.js';
import { registerEncounterHandlers } from './handlers/encounter.js';
import { registerLootHandlers } from './handlers/loot.js';
import { clearAllPlayerTimers } from './state/timers.js';
import { startNpcPatrol, stopNpcPatrol } from './npc/patrol.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

/** 空闲超时（毫秒）：5分钟无操作断开 */
const IDLE_TIMEOUT = 5 * 60 * 1000;
/** 断开前警告提前量（毫秒）：最后30秒发警告 */
const IDLE_WARNING_BEFORE = 30 * 1000;

const app = express();
const httpServer = createServer(app);

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: IS_PROD ? undefined : {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  },
});

// 全局房间管理器
const roomManager = new RoomManager();

// 生产环境：服务静态文件（Nginx 主要负责，这里作为 fallback）
if (IS_PROD) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use('/sdc2', express.static(clientDist));
  app.get('/sdc2/*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount(), players: roomManager.getPlayerCount() });
});

// Socket连接处理
io.on('connection', (socket) => {
  console.log(`[连接] ${socket.id}`);

  // ---- 空闲自动断开 ----
  let idleTimer: NodeJS.Timeout;
  let warningTimer: NodeJS.Timeout;

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    clearTimeout(warningTimer);
    // 4分30秒后发警告
    warningTimer = setTimeout(() => {
      socket.emit('idle:warning', { seconds: IDLE_WARNING_BEFORE / 1000 });
    }, IDLE_TIMEOUT - IDLE_WARNING_BEFORE);
    // 5分钟后断开
    idleTimer = setTimeout(() => {
      console.log(`[空闲断开] ${socket.id}`);
      socket.emit('idle:disconnect');
      socket.disconnect(true);
    }, IDLE_TIMEOUT);
  }

  // 任何客户端事件都重置空闲计时器
  socket.use((_event, next) => {
    resetIdleTimer();
    next();
  });

  resetIdleTimer();

  // 注册各模块事件处理器
  registerLobbyHandlers(io, socket, roomManager);
  registerMovementHandlers(io, socket, roomManager);
  registerExploreHandlers(io, socket, roomManager);
  registerSquadHandlers(io, socket, roomManager);
  registerBattleHandlers(io, socket, roomManager);
  registerEncounterHandlers(io, socket, roomManager);
  registerLootHandlers(io, socket, roomManager);

  socket.on('disconnect', (reason) => {
    console.log(`[断开] ${socket.id} - ${reason}`);
    clearTimeout(idleTimer);
    clearTimeout(warningTimer);
    const player = roomManager.getPlayerBySocket(socket.id);
    if (player) {
      clearAllPlayerTimers(player.playerId);
    }
    roomManager.removePlayer(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[服务端] 已启动 http://localhost:${PORT}`);
});
