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
