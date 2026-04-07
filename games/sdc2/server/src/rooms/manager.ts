import type { PlayerState } from '../../../shared/types/player.js';
import { GameRoom } from './room.js';
import { stopNpcPatrol } from '../npc/patrol.js';

/** 房间管理器 */
export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  /** socketId → playerId 映射 */
  private socketToPlayer = new Map<string, string>();
  /** playerId → roomId 映射 */
  private playerToRoom = new Map<string, string>();
  /** playerId → PlayerState 映射（包含局外玩家） */
  private allPlayers = new Map<string, PlayerState>();

  private roomIdCounter = 0;

  /** 创建新房间 */
  createRoom(): GameRoom {
    const id = `room_${++this.roomIdCounter}`;
    const room = new GameRoom(id);
    this.rooms.set(id, room);
    console.log(`[房间] 创建 ${id}`);
    return room;
  }

  /** 获取或创建一个可加入的房间 */
  getAvailableRoom(): GameRoom {
    // Demo阶段：找第一个running或waiting的房间，没有则创建
    for (const room of this.rooms.values()) {
      if (room.phase !== 'ended' && room.players.size < 8) {
        return room;
      }
    }
    return this.createRoom();
  }

  /** 注册玩家（登录时） */
  registerPlayer(socketId: string, player: PlayerState): void {
    this.socketToPlayer.set(socketId, player.playerId);
    this.allPlayers.set(player.playerId, player);
  }

  /** 玩家加入房间 */
  joinRoom(playerId: string, room: GameRoom): void {
    const player = this.allPlayers.get(playerId);
    if (!player) return;
    room.addPlayer(player);
    this.playerToRoom.set(playerId, room.id);
    if (room.phase === 'waiting') {
      room.phase = 'running';
    }
    console.log(`[房间] 玩家 ${player.username} 加入 ${room.id}`);
  }

  /** 玩家离开房间（撤离/退出，但不断开连接） */
  leaveRoom(playerId: string): void {
    const roomId = this.playerToRoom.get(playerId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room && room.isEmpty()) {
        stopNpcPatrol(roomId);
        this.rooms.delete(roomId);
        console.log(`[房间] ${roomId} 已空，销毁`);
      }
      this.playerToRoom.delete(playerId);
    }
  }

  /** 移除断线玩家 */
  removePlayer(socketId: string): void {
    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return;

    const roomId = this.playerToRoom.get(playerId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.removePlayer(playerId);
        if (room.isEmpty()) {
          stopNpcPatrol(roomId);
          this.rooms.delete(roomId);
          console.log(`[房间] ${roomId} 已空，销毁`);
        }
      }
      this.playerToRoom.delete(playerId);
    }

    this.socketToPlayer.delete(socketId);
    this.allPlayers.delete(playerId);
  }

  /** 通过socketId获取玩家状态 */
  getPlayerBySocket(socketId: string): PlayerState | undefined {
    const playerId = this.socketToPlayer.get(socketId);
    return playerId ? this.allPlayers.get(playerId) : undefined;
  }

  /** 通过socketId获取玩家所在房间 */
  getRoomBySocket(socketId: string): GameRoom | undefined {
    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return undefined;
    const roomId = this.playerToRoom.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /** 通过playerId获取玩家状态 */
  getPlayerById(playerId: string): PlayerState | undefined {
    return this.allPlayers.get(playerId);
  }

  /** 通过playerId获取对应的socketId */
  getSocketByPlayerId(playerId: string): string | undefined {
    for (const [socketId, pId] of this.socketToPlayer) {
      if (pId === playerId) return socketId;
    }
    return undefined;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPlayerCount(): number {
    return this.allPlayers.size;
  }
}
