// 可玩 demo — 玩家交互式单仓拍卖
// 流程：选将 → 拍卖（5 轮内）→ 结算 → (再来 / 换将)
//
// 4 名玩家：1 人 + 3 AI（性格固定为 激进/诈唬/保守）
// AI 使用其它 2 名武将 + 1 名重复武将（与玩家同 general）
// 信息隔离：仓库视图只显示玩家自己的揭示集

import { CONFIG } from '../config.ts';
import { GENERALS } from '../data/characters.ts';
import { ITEM_POOL, type ItemPrototype } from '../data/items.ts';
import { generateWarehouse } from '../core/warehouse.ts';
import { createAuction, settle, submitRoundBids } from '../core/auction.ts';
import {
  applyStakePayouts,
  settleStakes,
  type BettingSettlement,
} from '../core/betting.ts';
import { decideAi } from '../core/ai.ts';
import { renderWarehouseView } from './warehouseView.ts';
import type {
  AuctionState,
  Bid,
  BidderSkill,
  Item,
  Player,
  Rarity,
  Shape,
  Stake,
  Warehouse,
} from '../core/types.ts';

/** 影桌（非玩家桌）— 用简单 MC 模拟存活变化 */
interface GhostTable {
  id: number;          // 1..15
  alive: number;       // 4 → 0/1
  totalChips: number;  // 该桌剩余总筹码
}

interface SessionState {
  phase: 'setup' | 'auction' | 'settlement' | 'tournament-ended';
  /** 拍卖已经结束但仍停留在 auction 屏（让玩家先看完末轮报价再进结算）*/
  awaitingSettlement?: boolean;
  selectedGeneralId?: string;

  // 锦标赛级（跨手持久）
  tournamentStartMs?: number;        // 开赛时间戳
  handNumber: number;                 // 第 N 手 (1-based)
  blindIdx: number;                   // 当前盲注档位 idx
  persistentPlayers?: Player[];       // 各手之间持久化的筹码状态
  eliminatedAtHand: Map<string, number>; // playerId → 在第几手被淘汰
  ghostTables: GhostTable[];          // 15 张影桌（玩家桌 + 影桌 = 16 桌 = 64 人）
  finalRanking?: Array<{ id: string; name: string; rank: number; chipsAtElim: number; eliminatedAtHand: number | null }>;

  // 当前手
  warehouse?: Warehouse;
  auction?: AuctionState;
  finalPlayers?: Player[];           // 本手结算后的玩家筹码
  stakeSettlement?: BettingSettlement;
  winnerProfit?: number;
  sellbackValue?: number;

  // 静态参数
  initialChips: number;
  log: string[];
}

/** demo 阶段：盲注每 60 秒升一档（生产 CONFIG 是 900s/档），让一场锦标赛 9~10 分钟跑完 */
const DEMO_BLIND_DURATION_SEC = 60;

const STYLE_ID = 'sanbid-play-session-styles';

const CSS = `
.sb-play {
  background: #2a1f17;
  border: 1px solid #d4a553;
  border-radius: 4px;
  padding: 24px;
  position: relative;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
}
.sb-play::before, .sb-play::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  border: 1px solid #d4a553;
}
.sb-play::before { top: 6px; left: 6px; border-right: none; border-bottom: none; }
.sb-play::after { bottom: 6px; right: 6px; border-left: none; border-top: none; }

.sb-play-h {
  text-align: center;
  color: #f4c97a;
  letter-spacing: 6px;
  font-size: 22px;
  font-weight: normal;
  margin-bottom: 18px;
}

/* 选将 */
.sb-general-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  max-width: 900px;
  margin: 0 auto;
}
.sb-general-card {
  background: linear-gradient(135deg, #3a2d22, #2e2218);
  border: 2px solid #d4a553;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.sb-general-card:hover {
  background: linear-gradient(135deg, #4a3a2c, #3a2c22);
  box-shadow: 0 0 16px rgba(244,201,122,0.4);
  transform: translateY(-2px);
}
.sb-general-card .gn { color: #f4c97a; font-size: 24px; letter-spacing: 4px; margin-bottom: 6px; }
.sb-general-card .gf { color: #a89880; font-size: 12px; letter-spacing: 2px; margin-bottom: 12px; }
.sb-general-card .gs-name {
  color: #d4a553;
  font-size: 14px;
  letter-spacing: 2px;
  border: 1px solid #d4a553;
  padding: 4px 12px;
  display: inline-block;
  margin-bottom: 8px;
}
.sb-general-card .gs-desc { color: #ede0c8; font-size: 12px; line-height: 1.6; }

/* 顶栏 */
.sb-play-top {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  background: #1a0e08;
  padding: 12px;
  border: 1px solid rgba(212,165,83,0.3);
  margin-bottom: 16px;
}
.sb-top-cell { text-align: center; }
.sb-top-cell .l { font-size: 11px; color: #a89880; letter-spacing: 2px; margin-bottom: 4px; }
.sb-top-cell .v { font-size: 20px; color: #f4c97a; font-family: monospace; }
.sb-top-cell .v.danger { color: #e85050; }

/* 主体 */
.sb-play-body {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: start;
}

/* 玩家列表 */
.sb-players {
  background: #1a0e08;
  border: 1px solid rgba(212,165,83,0.3);
  margin-bottom: 14px;
}
.sb-player-row {
  display: grid;
  grid-template-columns: minmax(120px, auto) 1fr auto;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(212,165,83,0.15);
  font-size: 12px;
  align-items: center;
  gap: 8px;
}
.sb-player-row:last-child { border-bottom: none; }
.sb-player-row.me { background: rgba(244,201,122,0.08); color: #f4c97a; }
.sb-player-row .pn { letter-spacing: 1px; }
.sb-player-row .pn .badge {
  display: inline-block;
  padding: 1px 5px;
  margin-left: 3px;
  font-size: 9px;
  border: 1px solid currentColor;
  letter-spacing: 1px;
}
.sb-player-row .pc { font-family: monospace; color: #d4a553; font-size: 14px; }

/* 每位玩家的轮次报价条（紧贴名字之后） */
.sb-bid-strip {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.sb-bid-cell {
  display: inline-block;
  min-width: 38px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 11px;
  text-align: center;
  border: 1px solid rgba(212,165,83,0.25);
  background: rgba(0,0,0,0.25);
  color: #a89880;
  border-radius: 2px;
  position: relative;
}
.sb-bid-cell .r-tag {
  display: block;
  font-size: 8px;
  color: #6e6258;
  letter-spacing: 1px;
}
.sb-bid-cell.lead {
  background: rgba(244,201,122,0.18);
  border-color: #f4c97a;
  color: #f4c97a;
  font-weight: bold;
  box-shadow: 0 0 6px rgba(244,201,122,0.4);
}
.sb-bid-cell.passed {
  color: #6e6258;
  font-style: italic;
}

/* 揭露动画：cells 出现时由暗到亮 */
@keyframes revealBid {
  0%   { opacity: 0; transform: scale(0.4); background: #d4a553; color: #1a0e08; box-shadow: 0 0 16px #f4c97a; }
  60%  { opacity: 1; transform: scale(1.25); background: #f4c97a; color: #1a0e08; box-shadow: 0 0 18px #f4c97a; }
  100% { opacity: 1; transform: scale(1); }
}
.sb-bid-cell.fresh { animation: revealBid 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

/* 公共信息 banner — 累积显示历史，最新一条最醒目 */
.sb-public-stack { margin-bottom: 14px; }
.sb-public-info {
  background: linear-gradient(90deg, rgba(74,142,184,0.18), rgba(74,142,184,0.04));
  border: 1px solid #4a8eb8;
  border-left-width: 4px;
  color: #ede0c8;
  padding: 10px 14px;
  margin-bottom: 6px;
  font-size: 13px;
  letter-spacing: 1px;
  border-radius: 2px;
  position: relative;
}
.sb-public-info .tag {
  display: inline-block;
  background: #4a8eb8;
  color: #1a0e08;
  padding: 2px 8px;
  margin-right: 10px;
  font-size: 11px;
  letter-spacing: 2px;
  border-radius: 2px;
  font-weight: bold;
}
.sb-public-info.fresh-info {
  animation: pulseInfo 1.0s ease-out both;
}
/* 历史轮次的公共信息：淡化但仍可读 */
.sb-public-info.historical {
  background: rgba(74,142,184,0.06);
  border-color: rgba(74,142,184,0.4);
  border-left-width: 3px;
  padding: 6px 12px;
  font-size: 12px;
  color: #a8b8c8;
  opacity: 0.85;
}
.sb-public-info.historical .tag {
  background: rgba(74,142,184,0.5);
  color: #ede0c8;
  font-size: 10px;
  padding: 1px 6px;
}
@keyframes pulseInfo {
  0%   { box-shadow: 0 0 0 0 rgba(74,142,184,0.7); transform: scale(0.98); }
  50%  { box-shadow: 0 0 24px 4px rgba(74,142,184,0.5); transform: scale(1.01); }
  100% { box-shadow: 0 0 0 0 rgba(74,142,184,0); transform: scale(1); }
}

/* 报价控件 */
.sb-controls {
  background: #1a0e08;
  border: 1px solid #d4a553;
  padding: 14px;
  margin-bottom: 14px;
}
.sb-controls h3 {
  color: #f4c97a;
  font-weight: normal;
  letter-spacing: 3px;
  font-size: 14px;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(212,165,83,0.3);
  padding-bottom: 6px;
}
.sb-bid-row {
  display: grid;
  grid-template-columns: 1fr 100px 60px;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}
.sb-bid-row input[type="range"] { width: 100%; accent-color: #d4a553; }
.sb-bid-row input[type="number"] {
  background: #2a1f17;
  border: 1px solid #d4a553;
  color: #f4c97a;
  font-family: monospace;
  padding: 4px 6px;
  font-size: 14px;
  text-align: right;
}
.sb-bid-row button {
  background: #2a1f17;
  border: 1px solid #d4a553;
  color: #ede0c8;
  padding: 5px 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
}
.sb-bid-row button:hover { background: rgba(212,165,83,0.2); }

.sb-bid-helpers {
  display: flex;
  gap: 6px;
  margin: 6px 0 8px;
}
.sb-bid-helpers button {
  flex: 1;
  background: rgba(74,142,184,0.12);
  border: 1px solid #4a8eb8;
  color: #ede0c8;
  padding: 5px 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 1px;
  border-radius: 2px;
  transition: all 0.15s;
}
.sb-bid-helpers button:hover {
  background: rgba(74,142,184,0.3);
  box-shadow: 0 0 8px rgba(74,142,184,0.4);
}
.sb-bid-helpers button .hint {
  display: block;
  font-size: 9px;
  color: #6e8ea0;
  letter-spacing: 0;
  margin-top: 1px;
}

.sb-stake-row {
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 6px;
  align-items: center;
  margin: 8px 0;
  padding: 8px;
  background: rgba(107,142,78,0.08);
  border-left: 2px solid #6b8e4e;
}
.sb-stake-row label { color: #ede0c8; font-size: 12px; cursor: pointer; }
.sb-stake-row label .mul { color: #9bc878; font-family: monospace; margin-left: 4px; }
.sb-stake-row input[type="number"] {
  background: #2a1f17;
  border: 1px solid #6b8e4e;
  color: #9bc878;
  font-family: monospace;
  padding: 4px 6px;
  font-size: 13px;
  text-align: right;
}
.sb-stake-row input:disabled { opacity: 0.4; }

.sb-submit {
  width: 100%;
  background: #d4a553;
  color: #1a0e08;
  border: none;
  padding: 10px;
  cursor: pointer;
  letter-spacing: 4px;
  font-family: inherit;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.15s;
}
.sb-submit:hover { background: #f4c97a; box-shadow: 0 0 12px rgba(244,201,122,0.5); }

.sb-hint {
  color: #a89880;
  font-size: 11px;
  margin-top: 8px;
  font-style: italic;
}
.sb-warn {
  color: #e85050;
  font-size: 12px;
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(232,80,80,0.1);
  border-left: 2px solid #e85050;
}

/* 历史 / 日志 */
.sb-section {
  background: rgba(0,0,0,0.3);
  border: 1px dashed rgba(212,165,83,0.2);
  padding: 10px 12px;
  margin-bottom: 14px;
  font-size: 12px;
  max-height: 220px;
  overflow-y: auto;
}
.sb-section h4 {
  color: #d4a553;
  font-weight: normal;
  letter-spacing: 2px;
  font-size: 12px;
  margin-bottom: 6px;
}
.sb-section .row {
  padding: 3px 0;
  border-bottom: 1px dotted rgba(212,165,83,0.1);
  color: #a89880;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.6;
}
.sb-section .row:last-child { border-bottom: none; }
.sb-section .row.lead { color: #f4c97a; font-weight: bold; }
.sb-section .row.win { color: #5cb85c; }
.sb-section .row.lose { color: #e85050; }

/* 结算 */
.sb-settle-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  background: #1a0e08;
  padding: 14px;
  margin-bottom: 16px;
  border: 1px solid #d4a553;
}
.sb-settle-summary > div { text-align: center; }
.sb-settle-summary .l { font-size: 11px; color: #a89880; letter-spacing: 2px; margin-bottom: 4px; }
.sb-settle-summary .v { font-size: 20px; color: #f4c97a; font-family: monospace; }
.sb-settle-summary .v.win { color: #5cb85c; }

.sb-settle-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #ede0c8;
  margin-bottom: 14px;
}
.sb-settle-table th, .sb-settle-table td {
  padding: 6px 10px;
  text-align: right;
  border-bottom: 1px solid rgba(212,165,83,0.15);
}
.sb-settle-table th {
  color: #a89880;
  font-weight: normal;
  letter-spacing: 1px;
  font-size: 11px;
}
.sb-settle-table td:first-child, .sb-settle-table th:first-child { text-align: left; }
.sb-settle-table tr.me { background: rgba(244,201,122,0.08); }
.sb-settle-table tr.winner { background: rgba(92,184,92,0.12); }
.sb-settle-table .pos { color: #5cb85c; font-family: monospace; }
.sb-settle-table .neg { color: #e85050; font-family: monospace; }

.sb-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}
.sb-actions button {
  background: #2a1f17;
  border: 1px solid #d4a553;
  color: #ede0c8;
  padding: 10px 20px;
  cursor: pointer;
  letter-spacing: 3px;
  font-family: inherit;
  font-size: 13px;
}
.sb-actions button:hover {
  background: #d4a553;
  color: #1a0e08;
}

/* MTT 顶部信息栏（常驻） */
.sb-mtt-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 1px;
  background: #d4a553;
  border: 1px solid #d4a553;
  margin-bottom: 16px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(212,165,83,0.25);
}
.sb-mtt-bar .mtt-cell {
  background: #1a0e08;
  padding: 10px 8px;
  text-align: center;
}
.sb-mtt-bar .mtt-cell.mtt-cell-me {
  background: linear-gradient(135deg, rgba(244,201,122,0.15), #1a0e08);
}
.sb-mtt-bar .mtt-cell .lbl {
  font-size: 10px;
  color: #a89880;
  letter-spacing: 2px;
  margin-bottom: 4px;
}
.sb-mtt-bar .mtt-cell .val {
  font-size: 18px;
  color: #f4c97a;
  font-family: monospace;
  font-weight: bold;
}
.sb-mtt-bar .mtt-cell .val .lvl {
  display: inline-block;
  font-size: 10px;
  background: #4a8eb8;
  color: #1a0e08;
  padding: 1px 4px;
  margin-left: 4px;
  border-radius: 2px;
  vertical-align: middle;
}
.sb-mtt-bar .mtt-cell .val .cd {
  display: inline-block;
  font-size: 12px;
  color: #9bc878;
  margin-left: 4px;
}
.sb-mtt-bar .mtt-cell .val .muted {
  font-size: 12px; color: #6e6258; font-style: italic;
}

/* 中标突出 */
.sb-trophy-banner {
  background: linear-gradient(90deg, rgba(244,201,122,0.20), rgba(244,201,122,0.05));
  border: 2px solid #f4c97a;
  padding: 18px 24px;
  margin-bottom: 18px;
  text-align: center;
  border-radius: 4px;
  box-shadow: 0 0 24px rgba(244,201,122,0.25);
}
.sb-trophy-banner .crown { font-size: 28px; margin-right: 8px; }
.sb-trophy-banner .winner {
  color: #f4c97a;
  font-size: 22px;
  letter-spacing: 4px;
  font-weight: bold;
}
.sb-trophy-banner .price {
  color: #ede0c8;
  font-size: 14px;
  letter-spacing: 2px;
  margin-top: 8px;
}
.sb-trophy-banner .price strong {
  color: #f4c97a;
  font-size: 26px;
  font-family: monospace;
  margin: 0 6px;
}
.sb-trophy-banner.voided {
  background: linear-gradient(90deg, rgba(232,80,80,0.18), rgba(232,80,80,0.04));
  border-color: #e85050;
  box-shadow: 0 0 24px rgba(232,80,80,0.25);
}
.sb-trophy-banner.voided .winner { color: #e85050; }

/* 中标的 bid cell 加皇冠 */
.sb-bid-cell.winning-bid {
  background: linear-gradient(135deg, #f4c97a, #d4a553);
  color: #1a0e08;
  border-color: #f4c97a;
  font-weight: bold;
  box-shadow: 0 0 14px rgba(244,201,122,0.7);
  animation: winnerPulse 1.2s ease-in-out infinite;
}
.sb-bid-cell.winning-bid::after {
  content: '👑';
  position: absolute;
  top: -10px;
  right: -6px;
  font-size: 14px;
}
@keyframes winnerPulse {
  0%, 100% { box-shadow: 0 0 14px rgba(244,201,122,0.5); }
  50%      { box-shadow: 0 0 22px rgba(244,201,122,0.95); }
}

/* 押注规则提示 */
.sb-stake-rule {
  font-size: 11px;
  color: #9bc878;
  margin-left: 4px;
  font-style: italic;
}

/* 图鉴按钮 */
.sb-codex-btn {
  position: absolute;
  top: 18px;
  right: 22px;
  background: rgba(74,142,184,0.15);
  border: 1px solid #4a8eb8;
  color: #ede0c8;
  padding: 6px 14px;
  cursor: pointer;
  letter-spacing: 2px;
  font-family: inherit;
  font-size: 12px;
  border-radius: 2px;
}
.sb-codex-btn:hover {
  background: #4a8eb8;
  color: #1a0e08;
}

/* 图鉴 modal */
.sb-codex-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}
.sb-codex {
  background: #2a1f17;
  border: 2px solid #d4a553;
  width: min(960px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.7);
}
.sb-codex-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(212,165,83,0.4);
}
.sb-codex-head h3 {
  color: #f4c97a;
  font-weight: normal;
  letter-spacing: 4px;
  font-size: 18px;
}
.sb-codex-head .filter-tag {
  background: #4a8eb8;
  color: #1a0e08;
  padding: 4px 10px;
  font-size: 12px;
  letter-spacing: 1px;
  border-radius: 2px;
}
.sb-codex-head .close {
  background: transparent;
  border: 1px solid #d4a553;
  color: #d4a553;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 16px;
  border-radius: 50%;
}
.sb-codex-head .close:hover { background: #d4a553; color: #1a0e08; }
.sb-codex-body {
  padding: 16px 20px;
  overflow-y: auto;
}
/* 图鉴：按实际格数显示（1×1 小 / 4×4 大 / 1×6 长卷）
 * 网格 12 列 × 每格 56px（基本单位与仓库视图同尺寸感）
 * 每张卡用 grid-column / grid-row span 占据其形状
 * grid-auto-flow: dense 让小卡填补大卡留下的空隙，类似俄罗斯方块
 */
.sb-codex-grid {
  display: grid;
  grid-template-columns: repeat(12, 56px);
  grid-auto-rows: 56px;
  grid-auto-flow: dense;
  gap: 4px;
  justify-content: center;
}
.sb-codex-card {
  background: linear-gradient(135deg, #3a2d22, #2e2218);
  border: 2px solid var(--rar);
  text-align: center;
  border-radius: 2px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 2px;
  box-shadow: inset 0 0 8px rgba(0,0,0,0.3);
  cursor: default;
}
.sb-codex-card:hover {
  box-shadow: 0 0 12px var(--rar), inset 0 0 8px rgba(0,0,0,0.3);
  z-index: 2;
}
.sb-codex-card .rar-dot {
  position: absolute;
  top: 3px; left: 3px;
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--rar);
  box-shadow: 0 0 6px var(--rar);
}
.sb-codex-card .icon { font-size: 18px; line-height: 1; color: #ede0c8; }
.sb-codex-card .name {
  color: #f4c97a;
  font-size: 11px;
  letter-spacing: 1px;
  margin: 2px 0;
}
.sb-codex-card .meta {
  color: #a89880;
  font-size: 9px;
  letter-spacing: 1px;
  line-height: 1.3;
}
.sb-codex-card .value {
  color: #f4c97a;
  font-family: monospace;
  font-weight: bold;
  font-size: 14px;
}
.sb-codex-card .value-range {
  color: #6e6258;
  font-size: 9px;
  font-family: monospace;
  margin-top: 1px;
}

/* 大件（>= 4 格）允许更大字号 */
.sb-codex-card.lg .icon { font-size: 28px; }
.sb-codex-card.lg .name { font-size: 13px; margin: 4px 0; }
.sb-codex-card.lg .value { font-size: 20px; }
.sb-codex-card.xl .icon { font-size: 36px; }
.sb-codex-card.xl .name { font-size: 14px; }
.sb-codex-card.xl .value { font-size: 26px; }

/* 1×1 微件：只显图标和价值（最重要） */
.sb-codex-card.tiny .icon { font-size: 14px; line-height: 0.8; }
.sb-codex-card.tiny .value { font-size: 11px; line-height: 1; }

/* 长卷型（1×N 或 N×1，N >= 4）名字纵向显示更优雅 */
.sb-codex-card.scroll-v .name {
  writing-mode: vertical-rl;
  letter-spacing: 4px;
  margin: 0;
}
.sb-codex-empty {
  text-align: center;
  color: #6e6258;
  padding: 40px;
  font-style: italic;
}

/* 6 档稀有度色（图鉴卡用） */
.sb-codex-card[data-rarity="white"]   { --rar: #e0d8c8; }
.sb-codex-card[data-rarity="green"]   { --rar: #5cb85c; }
.sb-codex-card[data-rarity="blue"]    { --rar: #4a8eb8; }
.sb-codex-card[data-rarity="purple"]  { --rar: #a855c7; }
.sb-codex-card[data-rarity="gold"]    { --rar: #f4c97a; }
.sb-codex-card[data-rarity="red"]     { --rar: #e85050; }
`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

const RAR_LABEL = {
  white: '普通', green: '优良', blue: '稀有',
  purple: '史诗', gold: '传说', red: '神话',
} as const;

const RAR_COLOR = {
  white: '#e0d8c8', green: '#5cb85c', blue: '#4a8eb8',
  purple: '#a855c7', gold: '#f4c97a', red: '#e85050',
} as const;

function describeSkill(skill: BidderSkill): string {
  const trigger =
    skill.trigger === 'after-bid' ? '每次出价后'
    : `第 ${skill.triggerRound} 轮开始时`;
  const what =
    skill.revealKind === 'quality' ? '揭品质（左上角色点）'
    : skill.revealKind === 'silhouette' ? '揭轮廓（占位染色）'
    : '揭品质 + 轮廓';
  const count = skill.revealCount === Infinity ? '所有' : `${skill.revealCount} 件`;
  return `${trigger}，${what} ${count}藏品`;
}

// ---------- 入口 ----------
export function startPlaySession(container: HTMLElement) {
  injectStyles();

  const state: SessionState = {
    phase: 'setup',
    initialChips: 24000,  // 3× 提升，让玩家能压过较高仓位
    handNumber: 0,
    blindIdx: 0,
    eliminatedAtHand: new Map(),
    ghostTables: [],
    log: [],
  };

  let topBarTimer: number | null = null;

  function log(line: string) {
    state.log.push(line);
  }

  function render() {
    container.innerHTML = '';
    // 锦标赛开赛后，顶部信息栏常驻
    if (state.phase !== 'setup') {
      const bar = document.createElement('div');
      bar.id = 'sb-mtt-bar';
      bar.className = 'sb-mtt-bar';
      container.appendChild(bar);
      renderMttBar();
    }
    if (state.phase === 'setup') renderSetup();
    else if (state.phase === 'auction') renderAuction();
    else if (state.phase === 'settlement') renderSettlement();
    else if (state.phase === 'tournament-ended') renderTournamentEnded();
  }

  /** 顶部锦标赛信息栏 — 由 setInterval 每秒刷新 */
  function renderMttBar() {
    const bar = document.getElementById('sb-mtt-bar');
    if (!bar || !state.tournamentStartMs) return;

    const elapsedMs = Date.now() - state.tournamentStartMs;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const levels = CONFIG.tournament.blindLevels;

    // 自动推进盲注档位（在 auction 阶段也推进，但实际生效要在下一手 startNextHand 时）
    const calcIdx = Math.min(
      Math.floor(elapsedSec / DEMO_BLIND_DURATION_SEC),
      levels.length - 1
    );
    const isFinalLevel = calcIdx >= levels.length - 1;

    const currentBlind = levels[state.blindIdx]; // 本手实际入场费（startNextHand 时锁定）
    const nextBlind = isFinalLevel ? null : levels[Math.max(state.blindIdx, calcIdx) + 1];
    const nextChangeAt = isFinalLevel
      ? null
      : (Math.max(state.blindIdx, calcIdx) + 1) * DEMO_BLIND_DURATION_SEC;
    const remainSec = nextChangeAt ? Math.max(0, nextChangeAt - elapsedSec) : 0;

    const all = state.persistentPlayers ?? [];
    const me = all.find((p) => p.id === 'me');
    const totalAlive = countTotalAlive();
    const totalCapacity = 4 + state.ghostTables.length * 4; // 16 桌 × 4 = 64
    const avgChipsAll = avgChipsAlive();
    // 我桌情况
    const myTableAlive = all.filter((p) => p.chips > 0).length;

    bar.innerHTML = `
      <div class="mtt-cell">
        <div class="lbl">当前手</div>
        <div class="val">#${state.handNumber}</div>
      </div>
      <div class="mtt-cell">
        <div class="lbl">入场费</div>
        <div class="val">${currentBlind} <span class="lvl">L${state.blindIdx + 1}</span></div>
      </div>
      <div class="mtt-cell">
        <div class="lbl">下档</div>
        <div class="val">${
          isFinalLevel
            ? '<span class="muted">已最末档</span>'
            : `${nextBlind} <span class="cd">${formatMs(remainSec)}</span>`
        }</div>
      </div>
      <div class="mtt-cell">
        <div class="lbl">全场存活</div>
        <div class="val">${totalAlive} / ${totalCapacity} <span class="lvl" style="background:#6b8e4e">我桌 ${myTableAlive}</span></div>
      </div>
      <div class="mtt-cell">
        <div class="lbl">平均筹码</div>
        <div class="val">${avgChipsAll}</div>
      </div>
      <div class="mtt-cell mtt-cell-me">
        <div class="lbl">我的筹码</div>
        <div class="val">${me?.chips ?? 0}</div>
      </div>
    `;
  }

  function formatMs(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function startTopBarTimer() {
    if (topBarTimer !== null) clearInterval(topBarTimer);
    topBarTimer = window.setInterval(() => renderMttBar(), 1000);
  }

  // ===== 锦标赛结束屏 =====
  function renderTournamentEnded() {
    const ranking = state.finalRanking ?? [];
    const wrap = document.createElement('div');
    wrap.className = 'sb-play';
    wrap.innerHTML = `
      <div class="sb-play-h">锦 标 赛 结 束</div>

      <div class="sb-trophy-banner">
        <div class="winner"><span class="crown">🏆</span>${ranking[0]?.name ?? '-'}</div>
        <div class="price">夺得本场冠军 ・ 共 ${state.handNumber} 手</div>
      </div>

      <h3 style="color:#f4c97a;font-weight:normal;letter-spacing:3px;font-size:14px;border-bottom:1px solid #d4a553;padding-bottom:6px;margin:14px 0 10px;">最 终 名 次</h3>
      <table class="sb-settle-table">
        <thead>
          <tr><th>名次</th><th>玩家</th><th>结局</th><th>剩余筹码</th></tr>
        </thead>
        <tbody>
          ${ranking.map((r, i) => {
            const cls = `${r.id === 'me' ? 'me' : ''} ${i === 0 ? 'winner' : ''}`.trim();
            const ending = r.eliminatedAtHand !== null
              ? `第 ${r.eliminatedAtHand} 手淘汰`
              : '存活到最后';
            return `<tr class="${cls}">
              <td>#${r.rank}</td>
              <td>${r.name}</td>
              <td>${ending}</td>
              <td class="${r.chipsAtElim > 0 ? 'pos' : ''}">${r.chipsAtElim}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="sb-section" style="margin-top:14px;max-height:280px;">
        <h4>赛 事 完 整 日 志</h4>
        ${state.log.map((l) => `<div class="row">${escapeHtml(l)}</div>`).join('')}
      </div>

      <div class="sb-actions">
        <button id="new-tourney-btn">↻ 再来一场（同武将）</button>
        <button id="back-setup-btn">← 重选武将</button>
      </div>
    `;
    container.appendChild(wrap);
    document.getElementById('new-tourney-btn')!.addEventListener('click', () => startTournament());
    document.getElementById('back-setup-btn')!.addEventListener('click', () => {
      state.phase = 'setup';
      state.handNumber = 0;
      state.tournamentStartMs = undefined;
      render();
    });
  }

  // ===== Setup =====
  function renderSetup() {
    const wrap = document.createElement('div');
    wrap.className = 'sb-play';
    const generals = Object.values(GENERALS);
    wrap.innerHTML = `
      <div class="sb-play-h">选 择 你 的 武 将</div>
      <div style="text-align:center;color:#a89880;font-size:13px;margin-bottom:18px;letter-spacing:1px;">
        每名武将绑定一项独门竞拍人技能 ・ 信息严格仅自己可见
      </div>
      <div class="sb-general-cards">
        ${generals.map((g) => `
          <div class="sb-general-card" data-id="${g.id}">
            <div class="gn">${g.name}</div>
            <div class="gf">${({ wei: '魏', shu: '蜀', wu: '吴', qun: '群' } as Record<string, string>)[g.faction] ?? g.faction}</div>
            <div class="gs-name">${g.skill.name}</div>
            <div class="gs-desc">${describeSkill(g.skill)}</div>
          </div>
        `).join('')}
      </div>
      <div style="text-align:center;color:#6e6258;font-size:11px;margin-top:18px;">
        4 人桌 ・ 初始 ${state.initialChips} 筹码 ・ 起始入场费 ${CONFIG.tournament.blindLevels[0]}（每 ${DEMO_BLIND_DURATION_SEC} 秒升一档，最高 ${CONFIG.tournament.blindLevels[CONFIG.tournament.blindLevels.length - 1]}）
      </div>
    `;
    container.appendChild(wrap);
    wrap.querySelectorAll('.sb-general-card').forEach((card) => {
      card.addEventListener('click', () => {
        state.selectedGeneralId = (card as HTMLElement).dataset.id!;
        startTournament();
      });
    });
  }

  // ===== 启动锦标赛（一场完整的 N 手赛事） =====
  function startTournament() {
    const userGeneral = GENERALS[state.selectedGeneralId!];
    const otherGenerals = Object.values(GENERALS).filter(
      (g) => g.id !== userGeneral.id
    );
    // 4 名玩家：1 人 + 3 AI（去掉激进 AI；2 保守 + 1 诈唬）
    const players: Player[] = [
      {
        id: 'me', name: '我', isHuman: true,
        general: userGeneral, chips: state.initialChips,
      },
      {
        id: 'ai1', name: otherGenerals[0].name, isHuman: false,
        general: otherGenerals[0], chips: state.initialChips,
        personality: 'conservative',
      },
      {
        id: 'ai2', name: otherGenerals[1].name, isHuman: false,
        general: otherGenerals[1], chips: state.initialChips,
        personality: 'bluffer',
      },
      {
        id: 'ai3', name: userGeneral.name + '·影',  isHuman: false,
        general: userGeneral, chips: state.initialChips,
        personality: 'conservative',
      },
    ];
    state.persistentPlayers = players;
    state.tournamentStartMs = Date.now();
    state.handNumber = 0;
    state.blindIdx = 0;
    state.eliminatedAtHand = new Map();
    state.finalRanking = undefined;
    // 初始化 15 张影桌（每桌 4 人 × 24000 筹码 = 96000 总筹码）
    state.ghostTables = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      alive: 4,
      totalChips: 4 * state.initialChips,
    }));
    state.log = [
      `【锦标赛开始】共 16 张桌 ・ 64 名玩家入场 ・ 初始筹码 ${state.initialChips} 各 ・ 入场费 ${CONFIG.tournament.blindLevels[0]}`,
      `你坐在 #1 桌（含 3 AI），其余 15 张影桌后台模拟。`,
      `你选了 ${userGeneral.name}（${userGeneral.skill.name}）。`,
    ];
    startTopBarTimer();
    startNextHand();
  }

  /** 进入下一手（或开赛第一手） */
  function startNextHand() {
    // 1. 推进盲注档位（基于实际经过时间）
    const elapsedSec = (Date.now() - state.tournamentStartMs!) / 1000;
    const newIdx = Math.min(
      Math.floor(elapsedSec / DEMO_BLIND_DURATION_SEC),
      CONFIG.tournament.blindLevels.length - 1
    );
    if (newIdx > state.blindIdx) {
      log(`【盲注递增】升至第 ${newIdx + 1} 档：入场费 ${CONFIG.tournament.blindLevels[newIdx]}`);
      state.blindIdx = newIdx;
    }
    const entryFee = CONFIG.tournament.blindLevels[state.blindIdx];

    // 2. 推进影桌（玩家手数 = 影桌手数节奏，简化）
    if (state.handNumber > 0) simulateGhostTablesOneHand(entryFee);

    // 3. 筛存活玩家（chips > 0 视为存活）
    const alive = state.persistentPlayers!.filter((p) => p.chips > 0);
    if (alive.length <= 1) {
      endTournament();
      return;
    }

    // 4. 开新手
    state.handNumber++;
    state.warehouse = generateWarehouse({});
    state.auction = createAuction(state.warehouse, alive, { entryFee });
    state.awaitingSettlement = false;
    state.finalPlayers = undefined;
    state.stakeSettlement = undefined;
    state.winnerProfit = undefined;
    state.sellbackValue = undefined;
    state.phase = 'auction';
    log(`【第 ${state.handNumber} 手】仓库已封缄，存活 ${alive.length} / 我桌 ・ 全场 ${countTotalAlive()} / 64`);
    render();
  }

  /**
   * 影桌一手简单模拟：
   *   - 每位活人付入场费 → totalChips -= entryFee × alive
   *   - 按当前剩余筹码与入场费的比例触发淘汰：比例越大越易死人
   *   - 淘汰一人时该桌 alive--；该桌 alive ≤ 1 后冻结
   */
  function simulateGhostTablesOneHand(entryFee: number): void {
    for (const t of state.ghostTables) {
      if (t.alive <= 1) continue;
      // 入场费沉没（按存活人数）
      t.totalChips = Math.max(0, t.totalChips - entryFee * t.alive);
      // 平均剩余筹码
      const avg = t.totalChips / Math.max(1, t.alive);
      // 淘汰概率：avg 越接近 entryFee 越易出局
      // 公式：clamp((entryFee × 6) / avg, 0, 0.55)
      const elimProb = Math.min(0.55, (entryFee * 6) / Math.max(avg, 1));
      if (Math.random() < elimProb) {
        t.alive -= 1;
        // 被淘汰者筹码已耗尽（已扣完入场费），totalChips 不需调整
      }
    }
  }

  /** 全场存活总数（玩家桌 + 影桌） */
  function countTotalAlive(): number {
    const myTableAlive = (state.persistentPlayers ?? []).filter((p) => p.chips > 0).length;
    const ghostAlive = state.ghostTables.reduce((s, t) => s + t.alive, 0);
    return myTableAlive + ghostAlive;
  }

  /** 全场存活筹码均值 */
  function avgChipsAlive(): number {
    const myTablePlayers = (state.persistentPlayers ?? []).filter((p) => p.chips > 0);
    const myTableSum = myTablePlayers.reduce((s, p) => s + p.chips, 0);
    const ghostSum = state.ghostTables.reduce((s, t) => s + t.totalChips, 0);
    const total = countTotalAlive();
    return total > 0 ? Math.round((myTableSum + ghostSum) / total) : 0;
  }

  /** 锦标赛结束：根据淘汰顺序计算名次 */
  function endTournament() {
    if (topBarTimer !== null) {
      clearInterval(topBarTimer);
      topBarTimer = null;
    }
    const all = state.persistentPlayers!;
    // 排名：仍存活者 chips 越多越高 → 然后按淘汰顺序倒序
    const aliveSorted = all.filter((p) => p.chips > 0).sort((a, b) => b.chips - a.chips);
    const eliminated = all.filter((p) => p.chips === 0);
    eliminated.sort((a, b) => (state.eliminatedAtHand.get(b.id) ?? 0) - (state.eliminatedAtHand.get(a.id) ?? 0));
    const ranked = [...aliveSorted, ...eliminated];
    state.finalRanking = ranked.map((p, i) => ({
      id: p.id,
      name: p.name,
      rank: i + 1,
      chipsAtElim: p.chips,
      eliminatedAtHand: state.eliminatedAtHand.get(p.id) ?? null,
    }));
    log(`【锦标赛结束】共 ${state.handNumber} 手，冠军：${ranked[0].name}`);
    state.phase = 'tournament-ended';
    render();
  }

  // ===== Auction =====
  function renderAuction() {
    const a = state.auction!;
    // round 计算：未成交时是"下一轮"；已成交时（含 R5 落锤）固定为成交轮，避免越界
    const round = a.closed ? a.closed.closingRound : a.rounds.length + 1;
    const threshold = CONFIG.auction.thresholdMultipliers[round - 1];
    const stakeMul = CONFIG.betting.payoutMultipliers[round - 1];
    const me = a.players.find((p) => p.id === 'me')!;
    const maxStake = Math.floor(me.chips * CONFIG.betting.maxStakeRatio);

    const wrap = document.createElement('div');
    wrap.className = 'sb-play';

    wrap.innerHTML = `
      <button class="sb-codex-btn" id="open-codex-btn">📖 藏品图鉴</button>
      <div class="sb-play-h">第 ${round} / 5 轮 ・ 仓 库 竞 拍</div>

      <div class="sb-play-top">
        <div class="sb-top-cell">
          <div class="l">本轮阈值</div>
          <div class="v ${threshold >= 1.5 ? 'danger' : ''}">×${threshold.toFixed(1)}</div>
        </div>
        <div class="sb-top-cell">
          <div class="l">押对返利</div>
          <div class="v">×${stakeMul.toFixed(1)}</div>
        </div>
        <div class="sb-top-cell">
          <div class="l">入场费 (已扣)</div>
          <div class="v">${a.entryFee}</div>
        </div>
        <div class="sb-top-cell">
          <div class="l">我的筹码</div>
          <div class="v">${me.chips}</div>
        </div>
        <div class="sb-top-cell">
          <div class="l">我的武将</div>
          <div class="v" style="font-size:14px;letter-spacing:1px;">${me.general.name}</div>
        </div>
      </div>

      <div id="sb-public-info-slot"></div>

      <div class="sb-play-body">
        <div id="sb-warehouse-slot"></div>
        <div>
          <div class="sb-players" id="sb-players-slot"></div>
          <div class="sb-controls" id="sb-controls-slot"></div>
          <div class="sb-section" id="sb-history-slot"></div>
          <div class="sb-section" id="sb-log-slot"></div>
        </div>
      </div>
    `;
    container.appendChild(wrap);

    // 公共信息（累积全部历史轮次，最新一条带 fresh 动画）
    const publicEl = document.getElementById('sb-public-info-slot')!;
    if (a.publicInfo.length > 0) {
      const sorted = [...a.publicInfo].sort((x, y) => x.round - y.round);
      const latestRound = sorted[sorted.length - 1].round;
      publicEl.innerHTML = `
        <div class="sb-public-stack">
          ${sorted.map((info) => {
            const isLatest = info.round === latestRound;
            return `
              <div class="sb-public-info ${isLatest ? 'fresh-info' : 'historical'}">
                <span class="tag">R${info.round} 公共情报</span>${escapeHtml(info.text)}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // 仓库视图（合并：我的揭示 + 公共揭示）
    const myReveals = a.reveals.get('me')!;
    const merged = {
      quality: new Set([...myReveals.quality, ...a.publicReveals]),
      silhouette: new Set([...myReveals.silhouette, ...a.publicReveals]),
    };
    renderWarehouseView(
      state.warehouse!,
      {
        mode: 'custom',
        revealed: merged,
        cellSize: 30,
        showRulers: false,
        title: `本仓 · 我的视角 (R${round})`,
        onItemClick: (it) => onWarehouseItemClick(it),
      },
      document.getElementById('sb-warehouse-slot')!
    );

    // 玩家列表（含每轮报价 bid strip）
    const playersEl = document.getElementById('sb-players-slot')!;
    playersEl.innerHTML = a.players.map((p) => {
      const me = p.id === 'me';
      const personalityLabel = p.personality
        ? ({ conservative: '保守', aggressive: '激进', bluffer: '诈唬' } as const)[p.personality]
        : '';
      // 渲染每轮报价 cell
      const cells: string[] = [];
      const closed = a.closed;
      for (const r of a.rounds) {
        const b = r.bids.get(p.id);
        const amt = b?.kind === 'bid' ? b.amount : 0;
        const passed = b?.kind === 'pass';
        // 找出本轮 1st 是谁
        const bidsArr = Array.from(r.bids.entries()).map(([id, x]) => ({
          id, amt: x.kind === 'bid' ? x.amount : 0,
        }));
        bidsArr.sort((a, b) => b.amt - a.amt);
        const isLead = bidsArr[0]?.amt > 0 && bidsArr[0].id === p.id;
        const isFresh = r.round === a.rounds.length; // 最新轮高亮揭露动画
        // 中标 cell：成交那一轮 + 中标者
        const isWinningBid =
          closed && closed.winnerId === p.id && r.round === closed.closingRound;
        const rowIdx = a.players.indexOf(p);
        const animDelay = isFresh ? `${rowIdx * 280}ms` : '0ms';
        const cls = `sb-bid-cell${isLead ? ' lead' : ''}${passed ? ' passed' : ''}${isFresh ? ' fresh' : ''}${isWinningBid ? ' winning-bid' : ''}`;
        const label = passed ? '过' : String(amt);
        cells.push(`<span class="${cls}" style="animation-delay:${animDelay}"><span class="r-tag">R${r.round}</span>${label}</span>`);
      }
      return `
        <div class="sb-player-row ${me ? 'me' : ''}">
          <div class="pn">${p.name}<span class="badge">${personalityLabel || '人类'}</span><span class="badge" style="color:#6e6258;border-color:#6e6258;">${p.general.name}</span></div>
          <div class="sb-bid-strip">${cells.join('')}</div>
          <div class="pc">${p.chips}</div>
        </div>
      `;
    }).join('');

    // 控件 — 拍卖中 vs 已成交（待结算）两种状态
    const ctrl = document.getElementById('sb-controls-slot')!;
    if (state.awaitingSettlement) {
      // 已成交：显示成交概要 + 进入结算按钮
      ctrl.innerHTML = renderClosingPanel();
      document.getElementById('to-settlement-btn')!.addEventListener('click', () => {
        state.phase = 'settlement';
        state.awaitingSettlement = false;
        render();
      });
    } else {
      const stakeFixed = a.entryFee * 5;
      const canAffordStake = stakeFixed <= maxStake;

      // 我上一轮的报价（用于"上轮出价"快捷键）
      const myLastRound = a.rounds[a.rounds.length - 1];
      const myLastBid = myLastRound?.bids.get('me');
      const myLastBidAmount = myLastBid?.kind === 'bid' ? myLastBid.amount : 0;
      const hasLastBid = round >= 2 && myLastBidAmount > 0;
      // 当前轮阈值（×按钮用；R5=1.0 不显示）
      const showMultBtn = round >= 2 && round <= 4;
      const multValue = threshold;

      ctrl.innerHTML = `
        <h3>本 轮 报 价</h3>
        <div class="sb-bid-row">
          <input type="range" id="bid-slider" min="0" max="${me.chips}" value="0">
          <input type="number" id="bid-amount" min="0" max="${me.chips}" value="0">
          <button id="bid-pass">过</button>
        </div>
        ${hasLastBid || showMultBtn ? `
          <div class="sb-bid-helpers">
            ${hasLastBid ? `<button id="bid-prev" type="button">上轮出价 ${myLastBidAmount}</button>` : ''}
            ${showMultBtn ? `<button id="bid-mult" type="button">× ${multValue.toFixed(1)} <span class="hint">本轮成交阈值</span></button>` : ''}
          </div>
        ` : ''}
        <div class="sb-stake-row">
          <label>
            <input type="checkbox" id="stake-toggle" ${canAffordStake ? '' : 'disabled'}>
            押 ±10% （猜本轮报价 ±10% 含真实总值）
          </label>
          <span style="text-align:right;font-family:monospace;color:#9bc878;font-size:13px;">
            ${stakeFixed} <span class="sb-stake-rule">= 5× 入场费</span>
          </span>
        </div>
        <div class="sb-hint">命中返 <strong style="color:#9bc878">×${stakeMul.toFixed(1)}</strong>；未成交那轮的押注本仓终局原额退回${canAffordStake ? '' : '<br>⚠ 你筹码不足，无法押注'}</div>
        <div id="warn-slot"></div>
        <button class="sb-submit" id="submit-btn" style="margin-top:10px;">提 交 报 价</button>
      `;
      wireBidControls(me.chips, stakeFixed, myLastBidAmount, multValue);
    }

    // 历史
    const histEl = document.getElementById('sb-history-slot')!;
    histEl.innerHTML = formatHistory(a);

    // 事件日志
    const logEl = document.getElementById('sb-log-slot')!;
    logEl.innerHTML = `
      <h4>事 件 日 志</h4>
      ${state.log.slice(-8).map((l) => `<div class="row">${escapeHtml(l)}</div>`).join('')}
    `;

    // 图鉴按钮
    document.getElementById('open-codex-btn')?.addEventListener('click', () => {
      openCodex({});
    });
  }

  // ----- 图鉴 modal -----
  function onWarehouseItemClick(item: Item) {
    const a = state.auction!;
    const myReveals = a.reveals.get('me')!;
    const isPublic = a.publicReveals.has(item.id);
    const qK = myReveals.quality.has(item.id) || isPublic;
    const sK = myReveals.silhouette.has(item.id) || isPublic;
    if (isPublic) {
      // 公共揭示已知精确价值 → 把实际 Item 一并传入，覆盖 baseValue
      openCodex({ specificItem: item });
    } else if (qK && sK) {
      openCodex({ rarity: item.rarity, shape: item.shape });
    } else if (qK) {
      openCodex({ rarity: item.rarity });
    } else if (sK) {
      openCodex({ shape: item.shape });
    } else {
      // 完全未知 → 直接打开全图鉴
      openCodex({});
    }
  }

  function openCodex(filter: {
    rarity?: Rarity;
    shape?: Shape;
    specificName?: string;
    specificItem?: Item;
  }) {
    // 先移除已有 modal
    document.getElementById('sb-codex-overlay')?.remove();

    let candidates: ItemPrototype[] = [...ITEM_POOL];
    const filterParts: string[] = [];
    // specificItem: 优先按实际藏品名过滤；展示时用 item.value 替代 baseValue
    const actualValueByName = new Map<string, number>();
    if (filter.specificItem) {
      const it = filter.specificItem;
      candidates = candidates.filter((p) => p.name === it.name);
      actualValueByName.set(it.name, it.value);
      filterParts.push(`本仓实例 = ${it.name}（实际值 ${it.value}）`);
    } else if (filter.specificName) {
      candidates = candidates.filter((p) => p.name === filter.specificName);
      filterParts.push(`名称 = ${filter.specificName}`);
    }
    if (filter.rarity) {
      candidates = candidates.filter((p) => p.rarity === filter.rarity);
      filterParts.push(`稀有度 = ${RAR_LABEL[filter.rarity]}`);
    }
    if (filter.shape) {
      candidates = candidates.filter((p) =>
        p.preferredShapes.some(([w, h]) => w === filter.shape!.w && h === filter.shape!.h)
      );
      filterParts.push(`形状 = ${filter.shape.w}×${filter.shape.h}`);
    }
    // 按价值降序（最重要信息在前）
    candidates.sort((a, b) => b.baseValue - a.baseValue);

    const filterText = filterParts.length > 0
      ? filterParts.join(' / ') + ` (${candidates.length} 件)`
      : `全图鉴 (${candidates.length} 件)`;

    const overlay = document.createElement('div');
    overlay.id = 'sb-codex-overlay';
    overlay.className = 'sb-codex-overlay';
    overlay.innerHTML = `
      <div class="sb-codex" onclick="event.stopPropagation()">
        <div class="sb-codex-head">
          <h3>📖 藏 品 图 鉴</h3>
          <div class="filter-tag">${filterText}</div>
          <button class="close" id="codex-close">×</button>
        </div>
        <div class="sb-codex-body">
          ${candidates.length === 0
            ? '<div class="sb-codex-empty">无符合条件的藏品</div>'
            : `<div class="sb-codex-grid">${candidates.map((p) => renderCodexCard(p, actualValueByName.get(p.name))).join('')}</div>`
          }
        </div>
      </div>
    `;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
    document.getElementById('codex-close')!.addEventListener('click', () => overlay.remove());
  }

  function renderCodexCard(p: ItemPrototype, actualValue?: number): string {
    const cat = ({ weapon: '兵器', book: '典籍', treasure: '异宝', horse: '战马', ritual: '礼器', stationery: '文房' } as Record<string, string>)[p.cat] ?? p.cat;
    const cfg = CONFIG.warehouse.rarities[p.rarity];

    // 用第一个 preferredShape 作为图鉴展示形状
    const [w, h] = p.preferredShapes[0];
    const area = w * h;
    const isScrollV = (w === 1 && h >= 4);   // 长卷竖版，名字也竖排
    const isTiny = area === 1;
    const sizeClass = area >= 9 ? 'xl' : area >= 4 ? 'lg' : '';

    // 内容按面积可见性
    const showName = !isTiny;
    const showCatLine = area >= 4;
    const showRange = area >= 6;

    const classes = ['sb-codex-card', sizeClass, isTiny ? 'tiny' : '', isScrollV ? 'scroll-v' : '']
      .filter(Boolean).join(' ');

    // 价值显示：有实际值用实际值；否则展示典型值（±15% 噪声）
    const valueShown = actualValue ?? p.baseValue;
    const valueLabel = actualValue !== undefined
      ? `本仓实际`
      : `典型 ±15%`;
    const titleVal = actualValue !== undefined
      ? `本仓实际值 ${actualValue}`
      : `典型 ${p.baseValue}（实际 ±15%）`;

    return `
      <div class="${classes}" data-rarity="${p.rarity}"
           style="grid-column: span ${w}; grid-row: span ${h};"
           title="${p.name} ・ ${cat} ・ ${RAR_LABEL[p.rarity]} ・ ${w}×${h} ・ ${titleVal}">
        <div class="rar-dot"></div>
        <div class="icon">${p.icon}</div>
        ${showName ? `<div class="name">${p.name}</div>` : ''}
        ${showCatLine ? `<div class="meta">${cat} ・ ${RAR_LABEL[p.rarity]}</div>` : ''}
        <div class="value">${valueShown}</div>
        ${showRange ? `<div class="value-range">${valueLabel} ・ 档 ${cfg.valueRange[0]}~${cfg.valueRange[1]}</div>` : ''}
      </div>
    `;
  }

  function wireBidControls(
    maxBid: number,
    fixedStakeAmount: number,
    prevBidAmount: number = 0,
    multFactor: number = 1
  ) {
    const slider = document.getElementById('bid-slider') as HTMLInputElement;
    const amount = document.getElementById('bid-amount') as HTMLInputElement;
    const pass = document.getElementById('bid-pass') as HTMLButtonElement;
    const stakeToggle = document.getElementById('stake-toggle') as HTMLInputElement;
    const warnSlot = document.getElementById('warn-slot')!;
    const submit = document.getElementById('submit-btn') as HTMLButtonElement;
    const prevBtn = document.getElementById('bid-prev') as HTMLButtonElement | null;
    const multBtn = document.getElementById('bid-mult') as HTMLButtonElement | null;

    function setBid(v: number) {
      const clamped = Math.min(Math.max(0, Math.round(v)), maxBid);
      amount.value = String(clamped);
      slider.value = String(clamped);
    }

    slider.addEventListener('input', () => { amount.value = slider.value; });
    amount.addEventListener('input', () => {
      const v = Math.min(Math.max(0, parseInt(amount.value || '0', 10)), maxBid);
      amount.value = String(v);
      slider.value = String(v);
    });
    pass.addEventListener('click', () => { slider.value = '0'; amount.value = '0'; });

    // 快捷按钮
    if (prevBtn && prevBidAmount > 0) {
      prevBtn.addEventListener('click', () => setBid(prevBidAmount));
    }
    if (multBtn && multFactor > 1) {
      multBtn.addEventListener('click', () => {
        const cur = parseInt(amount.value, 10) || 0;
        if (cur === 0) {
          // 空值时把"上轮出价 × 阈值"作为合理默认
          if (prevBidAmount > 0) setBid(prevBidAmount * multFactor);
          return;
        }
        setBid(cur * multFactor);
      });
    }

    submit.addEventListener('click', () => {
      const bidVal = parseInt(amount.value, 10) || 0;
      const stakeOn = stakeToggle?.checked ?? false;
      const stakeVal = stakeOn ? fixedStakeAmount : 0;
      // 校验
      const errs: string[] = [];
      if (stakeVal > 0 && bidVal === 0) errs.push('过的时候不能押注');
      if (bidVal > maxBid) errs.push('报价超过你的筹码');
      if (errs.length) {
        warnSlot.innerHTML = `<div class="sb-warn">${errs.join('；')}</div>`;
        return;
      }
      submit.disabled = true;
      submit.textContent = 'AI 思考中...';
      setTimeout(() => doSubmit(bidVal, stakeVal), 300);
    });
  }

  /** 拍卖结束（成交或流拍）后的过渡面板 — 仍在 auction 屏，让玩家先看完末轮报价 */
  function renderClosingPanel(): string {
    const a = state.auction!;
    const c = a.closed!;
    if (c.winnerId === null) {
      return `
        <div class="sb-trophy-banner voided">
          <div class="winner">本 仓 流 拍</div>
          <div class="price">所有玩家入场费已沉没</div>
        </div>
        <button class="sb-submit" id="to-settlement-btn">查 看 完 整 结 算 →</button>
      `;
    }
    const winner = a.players.find((p) => p.id === c.winnerId)!;
    return `
      <div class="sb-trophy-banner">
        <div class="winner"><span class="crown">👑</span>${winner.name}</div>
        <div class="price">以 <strong>${c.price}</strong> 筹码 中标 (R${c.closingRound})</div>
      </div>
      <button class="sb-submit" id="to-settlement-btn">查 看 完 整 结 算 →</button>
    `;
  }

  function doSubmit(myBid: number, myStake: number) {
    const a = state.auction!;
    const round = a.rounds.length + 1;

    // 收集所有玩家的 bid + stake
    const bids = new Map<string, Bid>();
    const stakes = new Map<string, Stake | null>();
    bids.set('me', myBid > 0 ? { kind: 'bid', amount: myBid } : { kind: 'pass' });
    stakes.set('me', myStake > 0 ? { amount: myStake, basisBid: myBid } : null);

    // AI 决策
    for (const p of a.players) {
      if (p.id === 'me') continue;
      const d = decideAi(a, p);
      bids.set(p.id, d.bid);
      stakes.set(p.id, d.stake);
    }

    // 提交
    const result = submitRoundBids(a, bids, Math.random, stakes);
    state.auction = result.state;

    // 日志：明码报价（按报价从高到低）
    const sorted = Array.from(bids.entries())
      .map(([id, b]) => ({
        id,
        amount: b.kind === 'bid' ? b.amount : 0,
        passed: b.kind === 'pass',
        stake: stakes.get(id),
        name: a.players.find((p) => p.id === id)!.name,
      }))
      .sort((x, y) => y.amount - x.amount);

    log(`[R${round}] 明码 ↓`);
    sorted.forEach((x, idx) => {
      const stakeStr = x.stake ? ` 押 ${x.stake.amount}` : '';
      const tag = idx === 0 && !x.passed ? '★1st' : (idx === 1 && !x.passed ? ' 2nd' : '    ');
      const bidLabel = x.passed ? '过' : String(x.amount);
      log(`  ${tag} ${x.name}: ${bidLabel}${stakeStr}`);
    });

    // 触发的技能（仅 my own 提示，对手只提示触发不揭内容）
    if (!result.isClosed) {
      for (const p of a.players) {
        const skill = p.general.skill;
        if (skill.trigger === 'after-bid') {
          const subject = p.id === 'me' ? '你' : p.name;
          log(`  ⊙ ${subject} 触发 ${skill.name}`);
        }
        if (skill.trigger === 'round-start' && skill.triggerRound === round + 1) {
          const subject = p.id === 'me' ? '你' : p.name;
          log(`  ⊙ ${subject} 触发 ${skill.name}（开局型）`);
        }
      }
    }

    // 结束判定
    if (result.isClosed) {
      const c = result.state.closed!;
      if (c.winnerId === null) {
        log(`【流拍】本仓作废，所有入场费沉没。`);
      } else {
        const winner = result.state.players.find((p) => p.id === c.winnerId)!;
        log(`【成交】${winner.name} 以 ${c.price} 中标 (R${c.closingRound})`);
      }
      // 结算（已计算好但暂不切屏，让玩家先看末轮报价）
      const main = settle(result.state);
      const stakeSettle = settleStakes(result.state);
      const finalPlayers = applyStakePayouts(main.players, stakeSettle);
      state.finalPlayers = finalPlayers;
      state.stakeSettlement = stakeSettle;
      state.winnerProfit = main.winnerProfit;
      state.sellbackValue = main.sellbackValue;

      // 把本手最终筹码写回 persistentPlayers（保留未参赛者）
      const updated = new Map(finalPlayers.map((p) => [p.id, p]));
      state.persistentPlayers = state.persistentPlayers!.map((p) => updated.get(p.id) ?? p);
      // 标记本手新淘汰者
      for (const p of state.persistentPlayers!) {
        if (p.chips === 0 && !state.eliminatedAtHand.has(p.id)) {
          state.eliminatedAtHand.set(p.id, state.handNumber);
          log(`【淘汰】${p.name} 在第 ${state.handNumber} 手出局`);
        }
      }

      // 关键：留在 auction 屏，标记为"待结算"
      state.awaitingSettlement = true;
    }

    render();
  }

  // ===== Settlement =====
  function renderSettlement() {
    const a = state.auction!;
    const c = a.closed!;
    const wh = state.warehouse!;
    const isVoided = c.winnerId === null;
    const winner = isVoided ? null : state.finalPlayers!.find((p) => p.id === c.winnerId)!;
    const me = state.finalPlayers!.find((p) => p.id === 'me')!;

    const wrap = document.createElement('div');
    wrap.className = 'sb-play';
    wrap.innerHTML = `
      <button class="sb-codex-btn" id="open-codex-btn-settle">📖 藏品图鉴</button>
      <div class="sb-play-h">${isVoided ? '本 仓 流 拍' : '本 仓 结 算'}</div>

      <!-- 突出中标者 + 中标价 -->
      ${isVoided ? `
        <div class="sb-trophy-banner voided">
          <div class="winner">本 仓 流 拍</div>
          <div class="price">所有玩家入场费已沉没</div>
        </div>
      ` : `
        <div class="sb-trophy-banner">
          <div class="winner"><span class="crown">👑</span>${winner!.name}</div>
          <div class="price">以 <strong>${c.price}</strong> 筹码 中标 (R${c.closingRound})</div>
          <div class="price" style="margin-top:4px;font-size:12px;color:#a89880;">
            仓库真实总值 ${wh.totalValue} ・ 净利润
            <strong style="color:${state.winnerProfit! >= 0 ? '#5cb85c' : '#e85050'}">${state.winnerProfit! >= 0 ? '+' : ''}${state.winnerProfit}</strong>
          </div>
        </div>
      `}

      <div class="sb-settle-summary">
        <div>
          <div class="l">仓库真实总值</div>
          <div class="v">${wh.totalValue}</div>
        </div>
        ${isVoided ? '' : `
          <div>
            <div class="l">中标价 (R${c.closingRound})</div>
            <div class="v">${c.price}</div>
          </div>
          <div>
            <div class="l">中标净利润</div>
            <div class="v ${(state.winnerProfit ?? 0) >= 0 ? 'win' : ''}" style="color:${(state.winnerProfit ?? 0) >= 0 ? '#5cb85c' : '#e85050'}">${state.winnerProfit! >= 0 ? '+' : ''}${state.winnerProfit}</div>
          </div>
        `}
        <div>
          <div class="l">我的最终筹码</div>
          <div class="v ${(me.chips - state.initialChips) >= 0 ? 'win' : ''}" style="color:${(me.chips - state.initialChips) >= 0 ? '#5cb85c' : '#e85050'}">${me.chips}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:start;">
        <div id="sb-settle-warehouse"></div>
        <div>
          <h3 style="color:#f4c97a;font-weight:normal;letter-spacing:3px;font-size:14px;border-bottom:1px solid #d4a553;padding-bottom:6px;margin-bottom:10px;">玩 家 筹 码 变 动</h3>
          <table class="sb-settle-table">
            <thead>
              <tr><th>玩家</th><th>初始</th><th>最终</th><th>变动</th></tr>
            </thead>
            <tbody>
              ${state.finalPlayers!.map((p) => {
                const ch = p.chips - state.initialChips;
                const cls = ch > 0 ? 'pos' : (ch < 0 ? 'neg' : '');
                const trCls = `${p.id === 'me' ? 'me' : ''} ${p.id === c.winnerId ? 'winner' : ''}`.trim();
                return `<tr class="${trCls}">
                  <td>${p.name}</td>
                  <td>${state.initialChips}</td>
                  <td>${p.chips}</td>
                  <td class="${cls}">${ch > 0 ? '+' : ''}${ch}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>

          ${formatStakeSettlement()}

          <div class="sb-section" style="margin-top:14px;max-height:280px;">
            <h4>本 局 完 整 日 志</h4>
            ${state.log.map((l) => `<div class="row">${escapeHtml(l)}</div>`).join('')}
          </div>
        </div>
      </div>

      <div class="sb-actions">
        <button id="next-hand-btn">→ 进入第 ${state.handNumber + 1} 手</button>
        <button id="abandon-btn">✕ 放弃赛事</button>
      </div>
    `;
    container.appendChild(wrap);

    renderWarehouseView(
      state.warehouse!,
      {
        mode: 'full',
        cellSize: 30,
        showRulers: false,
        title: '本仓 · 全部揭示',
      },
      document.getElementById('sb-settle-warehouse')!
    );

    document.getElementById('next-hand-btn')!.addEventListener('click', () => startNextHand());
    document.getElementById('abandon-btn')!.addEventListener('click', () => {
      if (topBarTimer !== null) { clearInterval(topBarTimer); topBarTimer = null; }
      state.phase = 'setup';
      state.handNumber = 0;
      state.tournamentStartMs = undefined;
      render();
    });
    // 结算屏的图鉴按钮
    document.getElementById('open-codex-btn-settle')?.addEventListener('click', () => {
      openCodex({});
    });
  }

  function formatStakeSettlement(): string {
    const ss = state.stakeSettlement!;
    if (ss.entries.length === 0) {
      return `<div style="color:#a89880;font-size:12px;margin-top:14px;">本局无押注</div>`;
    }
    return `
      <h3 style="color:#f4c97a;font-weight:normal;letter-spacing:3px;font-size:14px;border-bottom:1px solid #d4a553;padding-bottom:6px;margin:14px 0 10px;">押 注 结 算</h3>
      <table class="sb-settle-table">
        <thead>
          <tr><th>玩家</th><th>轮次</th><th>押注</th><th>结果</th><th>返还</th></tr>
        </thead>
        <tbody>
          ${ss.entries.map((e) => {
            const player = state.finalPlayers!.find((p) => p.id === e.playerId)!;
            const outcomeLabel = e.outcome === 'win' ? '✓ 命中' : (e.outcome === 'refund' ? '↺ 退回' : '✗ 没收');
            const cls = e.outcome === 'win' ? 'pos' : (e.outcome === 'lose' ? 'neg' : '');
            return `<tr class="${player.id === 'me' ? 'me' : ''}">
              <td>${player.name}</td>
              <td>R${e.round}</td>
              <td>${e.stake.amount}</td>
              <td class="${cls}">${outcomeLabel}</td>
              <td class="${cls}">${e.payout}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // 启动
  render();
}

// ---------- 工具 ----------
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c] ?? c);
}

function formatHistory(a: AuctionState): string {
  if (a.rounds.length === 0) {
    return `<h4>历 史 明 码</h4><div class="row" style="font-style:italic;color:#6e6258;">本仓刚开始，暂无报价</div>`;
  }
  return `
    <h4>历 史 明 码</h4>
    ${a.rounds.map((r) => {
      const sorted = Array.from(r.bids.entries())
        .map(([id, b]) => ({
          id, amount: b.kind === 'bid' ? b.amount : 0,
          passed: b.kind === 'pass',
          name: a.players.find((p) => p.id === id)!.name,
        }))
        .sort((x, y) => y.amount - x.amount);
      const inner = sorted.map((x, i) => {
        const cls = i === 0 && !x.passed ? 'lead' : '';
        const label = x.passed ? '过' : String(x.amount);
        return `<span class="${cls}" style="margin-right:10px;">${x.name}=${label}</span>`;
      }).join('');
      const threshold = CONFIG.auction.thresholdMultipliers[r.round - 1];
      return `<div class="row"><strong>R${r.round}</strong> (×${threshold.toFixed(1)}): ${inner}</div>`;
    }).join('')}
  `;
}

// 让稀有度色与标签别"未引用"被 TS 警告
void RAR_LABEL; void RAR_COLOR;
