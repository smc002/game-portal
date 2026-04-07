/**
 * 玩家计时器管理
 * 统一管理移动、搜索、撤离等读条计时器
 */

const timers = new Map<string, Map<string, NodeJS.Timeout>>();

/** 设置玩家计时器（自动清除同名旧计时器） */
export function setPlayerTimer(playerId: string, key: string, timer: NodeJS.Timeout): void {
  if (!timers.has(playerId)) {
    timers.set(playerId, new Map());
  }
  clearPlayerTimer(playerId, key);
  timers.get(playerId)!.set(key, timer);
}

/** 清除玩家指定计时器 */
export function clearPlayerTimer(playerId: string, key: string): void {
  const playerTimers = timers.get(playerId);
  if (!playerTimers) return;
  const timer = playerTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    clearInterval(timer);
    playerTimers.delete(key);
  }
}

/** 清除玩家所有计时器（断线/退出时） */
export function clearAllPlayerTimers(playerId: string): void {
  const playerTimers = timers.get(playerId);
  if (!playerTimers) return;
  for (const timer of playerTimers.values()) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  timers.delete(playerId);
}
