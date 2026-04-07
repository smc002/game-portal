/** 城池静态配置 */
export interface CityConfig {
  id: string;
  name: string;
  connections: string[];        // 相邻城池ID列表
  dangerLevel: number;          // 1-5 危险等级
  maxResources: number;         // 初始物资总量
  hasBlackMarket: boolean;
  isEvacPoint: boolean;
  position: { x: number; y: number };  // 地图上的显示坐标
}

/** 城池运行时状态 */
export interface CityState {
  id: string;
  name: string;
  remainingResources: number;   // 剩余可搜物资
  depleted: boolean;
  presentPlayerIds: string[];   // 当前可见玩家
  ambushPlayerIds: string[];    // 蹲守中的玩家（仅服务端可见）
}

/** 巡逻NPC */
export interface NPCPatrol {
  id: string;
  name: string;
  currentCityId: string;
  targetCityId: string;
  power: number;                // 战力值
}

/** 地图全局状态 */
export interface GameMapState {
  cities: Record<string, CityState>;
  npcs: NPCPatrol[];
}
