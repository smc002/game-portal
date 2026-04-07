import type { PlayerState } from '../../../shared/types/player.js';
import type { CityState, GameMapState, NPCPatrol } from '../../../shared/types/map.js';
import { MAP_CITIES } from '../../../shared/data/maps.js';

/** 游戏房间：代表一局游戏 */
export class GameRoom {
  id: string;
  players = new Map<string, PlayerState>();
  cities = new Map<string, CityState>();
  npcs: NPCPatrol[] = [];
  phase: 'waiting' | 'running' | 'ended' = 'waiting';
  createdAt = Date.now();

  constructor(id: string) {
    this.id = id;
    this.initMap();
  }

  /** 初始化地图城池 */
  private initMap(): void {
    for (const config of MAP_CITIES) {
      this.cities.set(config.id, {
        id: config.id,
        name: config.name,
        remainingResources: config.maxResources,
        depleted: false,
        presentPlayerIds: [],
        ambushPlayerIds: [],
      });
    }
  }

  /** 添加玩家到房间 */
  addPlayer(player: PlayerState): void {
    this.players.set(player.playerId, player);
    // 将玩家加入出生城池
    const spawnCity = this.cities.get(player.currentCityId);
    if (spawnCity) {
      spawnCity.presentPlayerIds.push(player.playerId);
    }
  }

  /** 移除玩家 */
  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      // 从城池中移除
      for (const city of this.cities.values()) {
        city.presentPlayerIds = city.presentPlayerIds.filter(id => id !== playerId);
        city.ambushPlayerIds = city.ambushPlayerIds.filter(id => id !== playerId);
      }
      this.players.delete(playerId);
    }
  }

  /** 获取地图状态（客户端可见部分） */
  getMapState(): GameMapState {
    const cities: Record<string, CityState> = {};
    for (const [id, city] of this.cities) {
      cities[id] = {
        ...city,
        ambushPlayerIds: [],  // 蹲守信息不暴露给客户端
      };
    }
    return { cities, npcs: this.npcs };
  }

  /** 检查房间是否为空 */
  isEmpty(): boolean {
    return this.players.size === 0;
  }
}
