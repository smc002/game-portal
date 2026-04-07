import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import { CITY_MAP, SPAWN_CITY_ID, BASE_MOVE_DURATION } from '../../../shared/data/maps.js';
import { rollLoot, MAX_INVENTORY_SIZE, generateItemId, getItemRarity, getSearchDuration } from '../../../shared/data/items.js';
import { ItemType } from '../../../shared/types/items.js';
import type { ActiveBuff } from '../../../shared/types/player.js';
import { RoomManager } from '../rooms/manager.js';
import { setPlayerTimer, clearPlayerTimer, clearAllPlayerTimers } from '../state/timers.js';
import { trySearchEncounter } from './encounter.js';
import { triggerWeakNpcEncounter, triggerMediumNpcEncounter } from '../npc/npcEncounter.js';

/** 弱NPC遭遇概率（搜索tick） */
const WEAK_NPC_ENCOUNTER_CHANCE = 0.06;

/** 中等NPC遭遇概率（搜索tick） */
const MEDIUM_NPC_ENCOUNTER_CHANCE = 0.04;

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** 撤离读条时间（秒） */
const EVACUATE_DURATION = 10;

/** 黑市将星价格：50 * 2^n */
function getBlackMarketPrice(purchaseCount: number): number {
  return Math.round(50 * Math.pow(2, purchaseCount));
}

/** 检查玩家是否有加速Buff */
export function hasSpeedBuff(player: { activeBuffs: { type: string; expiresAt: number }[] }): boolean {
  return player.activeBuffs.some(
    b => b.type === 'speed_boost' && (b.expiresAt === -1 || b.expiresAt > Date.now())
  );
}

/**
 * 单轮搜索：先roll物品→算时长→发进度→等待→发物品→启动下一轮
 */
function startSearchTick(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
  room: ReturnType<RoomManager['getRoomBySocket']>,
  player: ReturnType<RoomManager['getPlayerBySocket']>,
): void {
  if (!player || !room) return;
  if (player.status !== 'searching') return;

  const city = room.cities.get(player.currentCityId);
  if (!city || city.depleted || city.remainingResources <= 0) {
    city!.depleted = true;
    player.status = 'exploring';
    socket.emit('state:patch', { status: 'exploring' });
    socket.emit('notification', { type: 'warning', message: `${city!.name} 物资已枯竭` });
    io.to(room.id).emit('map:update', { cities: room.getMapState().cities });
    return;
  }

  // 先roll出物品，确定品质和搜索时长
  const dangerLevel = CITY_MAP.get(player.currentCityId)?.dangerLevel ?? 1;
  const item = rollLoot(dangerLevel);
  const rarity = getItemRarity(item);
  const baseDuration = getSearchDuration(rarity);
  const duration = hasSpeedBuff(player) ? baseDuration * 0.5 : baseDuration;

  // 发送搜索进度事件给客户端
  socket.emit('game:search_tick_start', { duration, rarity });

  // 等待搜索时间后发放物品
  const tickTimer = setTimeout(() => {
    // 再次检查状态（可能已被中断）
    if (player.status !== 'searching') return;

    const cityNow = room!.cities.get(player.currentCityId);
    if (!cityNow || cityNow.depleted || cityNow.remainingResources <= 0) {
      cityNow!.depleted = true;
      player.status = 'exploring';
      socket.emit('state:patch', { status: 'exploring' });
      socket.emit('notification', { type: 'warning', message: `${cityNow!.name} 物资已枯竭` });
      io.to(room!.id).emit('map:update', { cities: room!.getMapState().cities });
      return;
    }

    // 消耗城池物资
    cityNow.remainingResources--;
    if (cityNow.remainingResources <= 0) {
      cityNow.depleted = true;
    }

    // 背包处理
    if (player.inventory.length >= MAX_INVENTORY_SIZE) {
      let lowestIdx = -1;
      let lowestValue = Infinity;
      for (let i = 0; i < player.inventory.length; i++) {
        if (player.inventory[i].type === ItemType.Resource && player.inventory[i].goldValue < lowestValue) {
          lowestValue = player.inventory[i].goldValue;
          lowestIdx = i;
        }
      }
      if (lowestIdx >= 0 && (item.type !== ItemType.Resource || item.goldValue > lowestValue)) {
        const discarded = player.inventory[lowestIdx];
        player.inventory[lowestIdx] = item;
        socket.emit('notification', {
          type: 'info',
          message: `背包已满，丢弃了 ${discarded.name}(${discarded.goldValue}金)`,
        });
      } else {
        socket.emit('notification', { type: 'warning', message: '背包已满，无法拾取' });
        // 继续下一轮搜索
        startSearchTick(io, socket, roomManager, room, player);
        return;
      }
    } else {
      player.inventory.push(item);
    }

    // 推送搜索结果
    socket.emit('game:search_found', { item });
    socket.emit('state:patch', { inventory: player.inventory });

    // 广播地图物资变化（让所有人看到资源减少）
    io.to(room!.id).emit('map:update', { cities: room!.getMapState().cities });

    // 搜索时随机触发遭遇（玩家间）
    if (trySearchEncounter(io, roomManager, room!, player)) {
      clearPlayerTimer(player.playerId, 'search');
      return;
    }

    // 搜索时随机触发NPC遭遇
    const npcRoll = Math.random();
    if (npcRoll < MEDIUM_NPC_ENCOUNTER_CHANCE) {
      clearPlayerTimer(player.playerId, 'search');
      triggerMediumNpcEncounter(io, roomManager, player);
      return;
    } else if (npcRoll < MEDIUM_NPC_ENCOUNTER_CHANCE + WEAK_NPC_ENCOUNTER_CHANCE) {
      clearPlayerTimer(player.playerId, 'search');
      triggerWeakNpcEncounter(io, roomManager, player);
      return;
    }

    // 城池枯竭时广播
    if (cityNow.depleted) {
      player.status = 'exploring';
      socket.emit('state:patch', { status: 'exploring' });
      socket.emit('notification', { type: 'warning', message: `${cityNow.name} 物资已枯竭` });
      io.to(room!.id).emit('map:update', { cities: room!.getMapState().cities });
      return;
    }

    // 启动下一轮
    startSearchTick(io, socket, roomManager, room, player);
  }, duration * 1000);

  setPlayerTimer(player.playerId, 'search', tickTimer);
}

export function registerExploreHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
): void {
  // ── 搜索开始 ──
  socket.on('game:search_start', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoomBySocket(socket.id);
    if (!player || !room) return;

    if (player.status !== 'exploring') {
      socket.emit('notification', { type: 'error', message: '当前状态无法搜索' });
      return;
    }

    const cityState = room.cities.get(player.currentCityId);
    if (!cityState || cityState.depleted) {
      socket.emit('notification', { type: 'warning', message: '该城池物资已枯竭' });
      return;
    }

    player.status = 'searching';
    socket.emit('state:patch', { status: 'searching' });
    console.log(`[搜索] ${player.username} 开始搜索 @ ${cityState.name}`);

    // 启动第一轮搜索
    startSearchTick(io, socket, roomManager, room, player);
  });

  // ── 停止搜索 ──
  socket.on('game:search_stop', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    if (player.status !== 'searching') return;

    clearPlayerTimer(player.playerId, 'search');
    player.status = 'exploring';
    socket.emit('state:patch', { status: 'exploring' });
    console.log(`[搜索] ${player.username} 停止搜索`);
  });

  // ── 蹲守 ──
  socket.on('game:ambush', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoomBySocket(socket.id);
    if (!player || !room) return;

    // 如果已经在蹲守，则取消
    if (player.status === 'ambushing') {
      const city = room.cities.get(player.currentCityId);
      if (city) {
        city.ambushPlayerIds = city.ambushPlayerIds.filter((id: string) => id !== player.playerId);
        // 重新出现在城池
        if (!city.presentPlayerIds.includes(player.playerId)) {
          city.presentPlayerIds.push(player.playerId);
        }
      }
      player.status = 'exploring';
      socket.emit('state:patch', { status: 'exploring' });
      socket.emit('notification', { type: 'info', message: '已取消蹲守' });
      io.to(room.id).emit('map:update', { cities: room.getMapState().cities });
      console.log(`[蹲守] ${player.username} 取消蹲守`);
      return;
    }

    if (player.status !== 'exploring') {
      socket.emit('notification', { type: 'error', message: '当前状态无法蹲守' });
      return;
    }

    // 停止搜索
    clearPlayerTimer(player.playerId, 'search');

    const city = room.cities.get(player.currentCityId);
    if (city) {
      city.ambushPlayerIds.push(player.playerId);
      // 从可见列表移除（隐身）
      city.presentPlayerIds = city.presentPlayerIds.filter((id: string) => id !== player.playerId);
    }

    player.status = 'ambushing';
    socket.emit('state:patch', { status: 'ambushing' });
    socket.emit('notification', { type: 'info', message: '进入蹲守状态，等待猎物...' });

    // 广播地图（该玩家从 presentPlayerIds 消失）
    io.to(room.id).emit('map:update', { cities: room.getMapState().cities });
    console.log(`[蹲守] ${player.username} 开始蹲守 @ ${city?.name}`);
  });

  // ── 撤离 ──
  socket.on('game:evacuate', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoomBySocket(socket.id);
    if (!player || !room) return;

    const city = CITY_MAP.get(player.currentCityId);
    if (!city?.isEvacPoint) {
      socket.emit('notification', { type: 'error', message: '当前城池不是撤离点' });
      return;
    }

    if (player.status !== 'exploring') {
      socket.emit('notification', { type: 'error', message: '当前状态无法撤离' });
      return;
    }

    // 停止搜索
    clearPlayerTimer(player.playerId, 'search');

    player.status = 'moving'; // 复用 moving 状态表示撤离读条
    player.isMoving = true;
    player.moveProgress = 0;

    socket.emit('state:patch', { status: 'moving', isMoving: true, moveProgress: 0 });
    socket.emit('notification', { type: 'info', message: `撤离读条中... (${EVACUATE_DURATION}秒)` });

    const startTime = Date.now();
    const duration = EVACUATE_DURATION * 1000;

    // 进度更新
    const progressTimer = setInterval(() => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      player.moveProgress = progress;
      socket.emit('state:patch', { moveProgress: progress });
    }, 200);
    setPlayerTimer(player.playerId, 'evac_progress', progressTimer);

    // 撤离完成
    const evacTimer = setTimeout(() => {
      clearPlayerTimer(player.playerId, 'evac_progress');

      // 结算物资 → 金币
      let lootGold = 0;
      for (const item of player.inventory) {
        if (item.type === ItemType.Resource) {
          lootGold += item.goldValue;
        }
      }

      player.gold += lootGold;

      // 从房间移除
      const roomCity = room.cities.get(player.currentCityId);
      if (roomCity) {
        roomCity.presentPlayerIds = roomCity.presentPlayerIds.filter((id: string) => id !== player.playerId);
        roomCity.ambushPlayerIds = roomCity.ambushPlayerIds.filter((id: string) => id !== player.playerId);
      }
      room.removePlayer(player.playerId);
      socket.leave(room.id);

      // 清空房间映射
      roomManager.leaveRoom(player.playerId);

      // 重置局内状态
      player.inGame = false;
      player.status = 'in_lobby';
      player.isMoving = false;
      player.moveTarget = null;
      player.moveProgress = 0;
      player.hp = player.maxHp;
      player.shield = 0;
      player.formation = [null, null, null, null, null];
      player.bench = [];
      player.inventory = [];
      player.activeTomes = [];
      player.activeBuffs = [];
      player.fleeCount = 2;
      player.starPurchaseCount = 0;
      player.currentCityId = SPAWN_CITY_ID;

      clearAllPlayerTimers(player.playerId);

      socket.emit('state:sync', player);
      socket.emit('notification', {
        type: 'success',
        message: `撤离成功！物资折算 ${lootGold} 金币`,
        data: { centerFloat: true },
      });

      // 广播地图更新
      io.to(room.id).emit('map:update', { cities: room.getMapState().cities });

      console.log(`[撤离] ${player.username} 撤离成功，+${lootGold}金币`);
    }, duration);
    setPlayerTimer(player.playerId, 'evacuate', evacTimer);
  });

  // ── 放弃退出 ──
  socket.on('game:quit', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoomBySocket(socket.id);
    if (!player || !room) return;

    if (!player.inGame) return;

    // 清除所有计时器
    clearAllPlayerTimers(player.playerId);

    // 从房间移除
    const city = room.cities.get(player.currentCityId);
    if (city) {
      city.presentPlayerIds = city.presentPlayerIds.filter((id: string) => id !== player.playerId);
      city.ambushPlayerIds = city.ambushPlayerIds.filter((id: string) => id !== player.playerId);
    }
    room.removePlayer(player.playerId);
    socket.leave(room.id);
    roomManager.leaveRoom(player.playerId);

    // 重置：不保留任何物资
    player.inGame = false;
    player.status = 'in_lobby';
    player.isMoving = false;
    player.moveTarget = null;
    player.moveProgress = 0;
    player.hp = player.maxHp;
    player.shield = 0;
    player.formation = [null, null, null, null, null];
    player.bench = [];
    player.inventory = [];
    player.activeTomes = [];
    player.activeBuffs = [];
    player.fleeCount = 2;
    player.starPurchaseCount = 0;
    player.currentCityId = SPAWN_CITY_ID;

    socket.emit('state:sync', player);
    socket.emit('notification', { type: 'info', message: '已放弃所有物资退出' });

    // 广播地图更新
    io.to(room.id).emit('map:update', { cities: room.getMapState().cities });

    console.log(`[退出] ${player.username} 放弃退出`);
  });

  // ── 使用道具 ──
  socket.on('game:use_item', ({ itemId }) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    const itemIdx = player.inventory.findIndex(i => i.id === itemId);
    if (itemIdx < 0) {
      socket.emit('notification', { type: 'error', message: '物品不存在' });
      return;
    }

    const item = player.inventory[itemIdx];

    switch (item.type) {
      case ItemType.Potion: {
        // 血瓶：非战斗状态恢复100生命值
        if (player.status === 'in_battle') {
          socket.emit('notification', { type: 'error', message: '战斗中无法使用血瓶' });
          return;
        }
        const healAmount = Math.min(100, player.maxHp - player.hp);
        if (healAmount <= 0) {
          socket.emit('notification', { type: 'warning', message: '生命值已满' });
          return;
        }
        player.hp += healAmount;
        player.inventory.splice(itemIdx, 1);
        socket.emit('state:patch', { hp: player.hp, inventory: player.inventory });
        socket.emit('notification', { type: 'success', message: `使用血瓶，恢复 ${healAmount} 生命值` });
        console.log(`[道具] ${player.username} 使用血瓶 +${healAmount}HP`);
        break;
      }

      case ItemType.Bluff: {
        // 虚张声势：持续性Buff，外显战力翻倍（整局有效）
        const hasBluff = player.activeBuffs.some(b => b.type === 'bluff');
        if (hasBluff) {
          socket.emit('notification', { type: 'warning', message: '虚张声势已激活' });
          return;
        }
        const buff: ActiveBuff = { type: 'bluff', expiresAt: -1 };
        player.activeBuffs.push(buff);
        player.inventory.splice(itemIdx, 1);
        socket.emit('state:patch', { activeBuffs: player.activeBuffs, inventory: player.inventory });
        socket.emit('notification', { type: 'success', message: '虚张声势已激活！外显战力大幅提升' });
        console.log(`[道具] ${player.username} 激活虚张声势`);
        break;
      }

      case ItemType.Scout: {
        // 侦察兵：看穿虚张声势 → 消耗后设置标记，遭遇时显示真实战力
        // 简化实现：使用后消除自己视角中对方虚张声势的效果（在encounter中检查）
        player.inventory.splice(itemIdx, 1);
        // 存储在inventory中已不存在，用buff标记表示侦察状态
        const hasScout = player.activeBuffs.some(b => b.type === 'bluff' && false); // not bluff
        // 用notification通知，侦察效果在遭遇时由encounter模块检查inventory
        socket.emit('state:patch', { inventory: player.inventory });
        socket.emit('notification', { type: 'success', message: '侦察兵已激活！下次遭遇将看穿敌方虚张声势' });
        // 标记：将侦察状态存在buff中（复用ActiveBuff，暂时用hack方式）
        // 改为直接在encounter模块 check 是否有scout item
        // 由于已被消耗，改为在player上加个临时标记
        (player as any)._scoutActive = true;
        console.log(`[道具] ${player.username} 使用侦察兵`);
        break;
      }

      case ItemType.SpeedBoost: {
        // 加速药水：临时缩短移动/搜索读条时间（持续60秒）
        const hasSpeed = player.activeBuffs.some(b => b.type === 'speed_boost');
        if (hasSpeed) {
          socket.emit('notification', { type: 'warning', message: '加速效果已激活' });
          return;
        }
        const speedBuff: ActiveBuff = { type: 'speed_boost', expiresAt: Date.now() + 60000 };
        player.activeBuffs.push(speedBuff);
        player.inventory.splice(itemIdx, 1);
        socket.emit('state:patch', { activeBuffs: player.activeBuffs, inventory: player.inventory });
        socket.emit('notification', { type: 'success', message: '加速药水已激活！移动和搜索速度提升60秒' });
        console.log(`[道具] ${player.username} 使用加速药水`);

        // 60秒后自动移除
        setTimeout(() => {
          player.activeBuffs = player.activeBuffs.filter(b => b.type !== 'speed_boost');
          const sock = roomManager.getSocketByPlayerId(player.playerId);
          if (sock) {
            io.to(sock).emit('state:patch', { activeBuffs: player.activeBuffs });
            io.to(sock).emit('notification', { type: 'info', message: '加速效果已过期' });
          }
        }, 60000);
        break;
      }

      default:
        socket.emit('notification', { type: 'error', message: '该物品无法直接使用' });
    }
  });

  // ── 黑市购买将星 ──
  socket.on('game:buy_star', () => {
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoomBySocket(socket.id);
    if (!player || !room) return;

    // 检查当前城池是否有黑市
    const cityConfig = CITY_MAP.get(player.currentCityId);
    if (!cityConfig?.hasBlackMarket) {
      socket.emit('notification', { type: 'error', message: '当前城池没有黑市' });
      return;
    }

    if (player.status !== 'exploring') {
      socket.emit('notification', { type: 'error', message: '当前状态无法交易' });
      return;
    }

    // 价格：指数级递增 50 * 2^n
    const price = getBlackMarketPrice(player.starPurchaseCount);

    // 检查玩家背包中的普通物资总金币价值
    const resourceValue = player.inventory
      .filter(i => i.type === ItemType.Resource)
      .reduce((sum, i) => sum + i.goldValue, 0);

    if (resourceValue < price) {
      socket.emit('notification', {
        type: 'error',
        message: `物资不足！需要 ${price} 金价值的物资，当前持有 ${resourceValue}`,
      });
      return;
    }

    // 扣除物资（从低价值开始消耗）
    let remaining = price;
    const resources = player.inventory
      .map((item, idx) => ({ item, idx }))
      .filter(e => e.item.type === ItemType.Resource)
      .sort((a, b) => a.item.goldValue - b.item.goldValue);

    const toRemove: number[] = [];
    for (const { item, idx } of resources) {
      if (remaining <= 0) break;
      remaining -= item.goldValue;
      toRemove.push(idx);
    }

    // 从后往前删除
    toRemove.sort((a, b) => b - a);
    for (const idx of toRemove) {
      player.inventory.splice(idx, 1);
    }

    // 发放将星
    const star = {
      id: generateItemId(),
      type: ItemType.Star,
      name: '将星',
      description: '使用后可抽取一名武将',
      goldValue: 0,
      rarity: 'orange' as const,
    };
    player.inventory.push(star);

    player.starPurchaseCount++;

    const nextPrice = getBlackMarketPrice(player.starPurchaseCount);
    socket.emit('state:patch', {
      inventory: player.inventory,
      starPurchaseCount: player.starPurchaseCount,
    });
    socket.emit('notification', {
      type: 'success',
      message: `黑市交易成功！获得将星，下次价格: ${nextPrice}`,
    });

    console.log(`[黑市] ${player.username} 购买将星 #${player.starPurchaseCount}，花费 ${price} 物资价值`);
  });
}
