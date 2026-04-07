import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import type { CombatantEntity, BattleOutput, BattleResultPayload } from '../../../shared/types/battle.js';
import type { PlayerState } from '../../../shared/types/player.js';
import { runBattle } from '../../../shared/battle/engine.js';
import { RoomManager } from '../rooms/manager.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** 从 PlayerState 构建 CombatantEntity */
function buildCombatant(player: PlayerState): CombatantEntity {
  return {
    playerId: player.playerId,
    maxHp: player.maxHp,
    currentHp: player.hp,
    shield: player.shield,
    tomes: player.activeTomes,
    buffs: [],
    // 深拷贝编队，避免战斗修改影响原始数据
    formation: player.formation.map(h => {
      if (!h) return null;
      return {
        ...h,
        atb: 0,
        buffs: [],
      };
    }),
  };
}

/** 将战斗结果应用到玩家状态 */
function applyBattleResult(
  player: PlayerState,
  result: { remainingHp: number; shield: number }
): void {
  player.hp = Math.max(0, result.remainingHp);
  player.shield = result.shield;
}

/**
 * 执行一场战斗
 * 供 encounter handler 等外部调用
 */
export function executeBattle(
  io: IOServer,
  roomManager: RoomManager,
  attackerId: string,
  defenderId: string
): BattleOutput | null {
  const attacker = roomManager.getPlayerById(attackerId);
  const defender = roomManager.getPlayerById(defenderId);
  if (!attacker || !defender) return null;

  // 标记战斗状态
  attacker.status = 'in_battle';
  defender.status = 'in_battle';

  // 构建战斗输入
  const combatantA = buildCombatant(attacker);
  const combatantB = buildCombatant(defender);

  // 保存阵容快照（战斗前）
  const snapshotFormationA = combatantA.formation.map(h => h ? { ...h } : null);
  const snapshotFormationB = combatantB.formation.map(h => h ? { ...h } : null);

  // 运行战斗引擎
  const result = runBattle({ playerA: combatantA, playerB: combatantB });

  // 应用结果
  applyBattleResult(attacker, result.playerA);
  applyBattleResult(defender, result.playerB);

  // 恢复状态
  attacker.status = attacker.hp > 0 ? 'exploring' : 'in_lobby';
  defender.status = defender.hp > 0 ? 'exploring' : 'in_lobby';

  // 构建包含阵容快照的结果
  const resultPayload: BattleResultPayload = {
    ...result,
    formationA: snapshotFormationA,
    formationB: snapshotFormationB,
    maxHpA: combatantA.maxHp,
    maxHpB: combatantB.maxHp,
    nameA: attacker.username,
    nameB: defender.username,
  };

  // 推送战斗事件流和结果给双方
  const attackerSocket = roomManager.getSocketByPlayerId(attackerId);
  const defenderSocket = roomManager.getSocketByPlayerId(defenderId);

  if (attackerSocket) {
    io.to(attackerSocket).emit('battle:events', { events: result.events });
    io.to(attackerSocket).emit('battle:result', resultPayload);
    io.to(attackerSocket).emit('state:patch', {
      hp: attacker.hp, shield: attacker.shield, status: attacker.status,
    });
  }
  if (defenderSocket) {
    io.to(defenderSocket).emit('battle:events', { events: result.events });
    io.to(defenderSocket).emit('battle:result', resultPayload);
    io.to(defenderSocket).emit('state:patch', {
      hp: defender.hp, shield: defender.shield, status: defender.status,
    });
  }

  console.log(`[战斗] ${attacker.username} vs ${defender.username} → 胜者: ${result.winner === 'A' ? attacker.username : defender.username}`);

  return result;
}

export function registerBattleHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {
  // 战斗由 encounter 系统触发，此处预留直接触发接口（用于测试）
  // 实际战斗入口在 encounter handler 中调用 executeBattle
}
