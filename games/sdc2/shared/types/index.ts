export * from './hero.js';
export * from './player.js';
export * from './battle.js';
export * from './map.js';
export * from './items.js';

/** Socket 事件：客户端 → 服务端 */
export interface ClientToServerEvents {
  // 大厅
  'lobby:login': (data: { username: string }) => void;
  'lobby:select_tomes': (data: { tomeIds: string[] }) => void;
  'lobby:deploy': () => void;
  'lobby:gm_add_gold': () => void;

  // 局内行动
  'game:move': (data: { targetCityId: string }) => void;
  'game:search_start': () => void;
  'game:search_stop': () => void;
  'game:ambush': () => void;
  'game:ambush_attack': (data: { targetPlayerId: string }) => void;
  'game:use_item': (data: { itemId: string }) => void;
  'game:buy_star': () => void;
  'game:evacuate': () => void;
  'game:quit': () => void;

  // 遭遇
  'encounter:fight': () => void;
  'encounter:flee': () => void;

  // 掠夺
  'loot:choose': (data: { choice: 'hero' | 'resources' }) => void;

  // 武将管理
  'squad:use_star': (data: { filter: { type: 'faction' | 'class'; value: string } }) => void;
  'squad:update_formation': (data: { formation: (string | null)[] }) => void;
  'squad:reroll': (data: { slot: number; useGold: boolean }) => void;
  'squad:confirm_reroll': () => void;
}

/** Socket 事件：服务端 → 客户端 */
export interface ServerToClientEvents {
  // 连接
  'lobby:login_ok': (data: { playerId: string; state: import('./player.js').PlayerState }) => void;
  'lobby:error': (data: { message: string }) => void;

  // 状态同步
  'state:sync': (data: import('./player.js').PlayerState) => void;
  'state:patch': (data: Partial<import('./player.js').PlayerState>) => void;

  // 地图
  'map:init': (data: import('./map.js').GameMapState) => void;
  'map:update': (data: Partial<import('./map.js').GameMapState>) => void;
  'map:npc_move': (data: { npcId: string; from: string; to: string }) => void;

  // 遭遇
  'encounter:alert': (data: { enemyId: string; enemyName: string; estimatedPower: number; type: 'normal' | 'ambush' }) => void;

  // 战斗
  'battle:events': (data: { events: import('./battle.js').BattleEvent[] }) => void;
  'battle:result': (data: import('./battle.js').BattleResultPayload) => void;

  // 掠夺
  'loot:options': (data: { heroOption: import('./hero.js').HeroInstance | null; resourceAmount: number }) => void;

  // NPC遭遇预警
  'encounter:npc_alert': (data: { npcId: string; npcName: string; npcPower: number }) => void;

  // 通知
  'notification': (data: { type: string; message: string; data?: Record<string, unknown> }) => void;

  // 开局武将发放
  'game:initial_heroes': (data: { heroes: import('./hero.js').HeroInstance[]; freeRerolls: number[] }) => void;

  // 搜索进度（每个物品开始搜索时发送）
  'game:search_tick_start': (data: { duration: number; rarity: 'gray' | 'green' | 'blue' | 'orange' }) => void;

  // 搜索结果
  'game:search_found': (data: { item: import('./items.js').Item }) => void;
}
