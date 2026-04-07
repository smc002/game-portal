import type { BattleEvent } from '../types/battle.js';

/** 战斗事件收集器 */
export class BattleEventEmitter {
  private events: BattleEvent[] = [];
  private currentTick = 0;

  setTick(tick: number): void {
    this.currentTick = tick;
  }

  emit(event: Omit<BattleEvent, 'tick'>): void {
    this.events.push({ ...event, tick: this.currentTick } as BattleEvent);
  }

  getEvents(): BattleEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
    this.currentTick = 0;
  }
}
