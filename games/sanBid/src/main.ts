// sanBid 入口 — M2 仓库视图组件接入
// 页面行为：
//   1. 生成 1 个仓库 + 4 个 Tab 切换 4 种侦察状态视图
//   2. 控制台跑 100 次压力测试（M1 沿用）
//   3. "重新生成"按钮
//   4. hover 详情面板

import { CONFIG } from './config.ts';
import { GENERALS } from './data/characters.ts';
import { generateWarehouse, summarize } from './core/warehouse.ts';
import { renderWarehouseView, type RevealMode } from './ui/warehouseView.ts';
import { runAllScenarios } from './dev/auctionScenarios.ts';
import { runAllSkillScenarios } from './dev/skillScenarios.ts';
import { runAllBettingScenarios } from './dev/bettingScenarios.ts';
import { runAllAiScenarios } from './dev/aiScenarios.ts';
import { runAllMttScenarios } from './dev/tournamentScenarios.ts';
import { runAllMultiTableScenarios } from './dev/multiTableScenarios.ts';
import { startPlaySession } from './ui/playSession.ts';
import type { Item, Rarity, Warehouse } from './core/types.ts';

const RAR_LABEL: Record<Rarity, string> = {
  white: '普通', green: '优良', blue: '稀有',
  purple: '史诗', gold: '传说', red: '神话',
};
const RAR_COLOR: Record<Rarity, string> = {
  white: '#e0d8c8', green: '#5cb85c', blue: '#4a8eb8',
  purple: '#a855c7', gold: '#f4c97a', red: '#e85050',
};
const CAT_LABEL: Record<string, string> = {
  weapon: '兵器', book: '典籍', treasure: '异宝',
  horse: '战马', ritual: '礼器', stationery: '文房',
};

// ---------- 100 次压力测试（M1 沿用） ----------
function runStressTest(n = 100) {
  let passed = 0, failed = 0;
  const errors: string[] = [];
  let sumItems = 0, sumValue = 0, sumLoad = 0;

  for (let i = 0; i < n; i++) {
    try {
      const w = generateWarehouse({ seed: i + 1 });
      const s = summarize(w);
      if (s.totalItems < 30 || s.totalItems > 60) throw new Error(`数量越界: ${s.totalItems}`);
      if (s.loadRatio < 0.3 || s.loadRatio > 0.6) throw new Error(`装载率越界: ${s.loadRatio.toFixed(3)}`);
      const occ = new Set<string>();
      for (const it of w.items) {
        for (let r = 0; r < it.shape.h; r++) {
          for (let c = 0; c < it.shape.w; c++) {
            const k = `${it.pos.row + r}-${it.pos.col + c}`;
            if (occ.has(k)) throw new Error(`重叠 ${k}`);
            occ.add(k);
          }
        }
        if (it.pos.col + it.shape.w - 1 > w.cols || it.pos.row + it.shape.h - 1 > w.rows)
          throw new Error(`越界 ${it.name}`);
      }
      sumItems += s.totalItems; sumValue += s.totalValue; sumLoad += s.loadRatio;
      passed++;
    } catch (e) {
      failed++;
      errors.push(`seed=${i + 1}: ${(e as Error).message}`);
    }
  }
  return {
    passed, failed, errors,
    avgItems: sumItems / Math.max(passed, 1),
    avgValue: sumValue / Math.max(passed, 1),
    avgLoadRatio: sumLoad / Math.max(passed, 1),
  };
}

// ---------- 状态面板渲染 ----------
function renderStats(w: Warehouse, panel: HTMLElement, currentMode: RevealMode) {
  const s = summarize(w);
  const totalValueDisplay = currentMode === 'full' ? String(s.totalValue) : '？？？';
  const totalValueColor = currentMode === 'full' ? '#f4c97a' : '#6e6258';

  const rarityRows = (Object.keys(s.byRarity) as Rarity[])
    .filter((r) => s.byRarity[r].count > 0)
    .map((r) => {
      const x = s.byRarity[r];
      return `<tr>
        <td style="padding:3px 8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${RAR_COLOR[r]};box-shadow:0 0 4px ${RAR_COLOR[r]};margin-right:6px;vertical-align:middle"></span>${RAR_LABEL[r]}
        </td>
        <td style="padding:3px 8px;font-family:monospace;text-align:right;">${x.count}</td>
        <td style="padding:3px 8px;font-family:monospace;text-align:right;color:${currentMode === 'full' ? '#f4c97a' : '#6e6258'};">${currentMode === 'full' ? x.value : '？？？'}</td>
      </tr>`;
    }).join('');

  panel.innerHTML = `
    <h3 class="sb-h3">仓 库 概 况</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="sb-stat-box">
        <div class="sb-stat-label">藏品总数</div>
        <div class="sb-stat-val">${s.totalItems}</div>
      </div>
      <div class="sb-stat-box">
        <div class="sb-stat-label">真实总值</div>
        <div class="sb-stat-val" style="color:${totalValueColor};">${totalValueDisplay}</div>
      </div>
    </div>

    <h3 class="sb-h3">本 局 竞 拍 人</h3>
    <div class="sb-skill-card">
      <div class="sb-skill-who">我 ・ 诸 葛 亮</div>
      <div class="sb-skill-what">每次出价后，揭示 2 件藏品的<strong>品质</strong></div>
    </div>
    <div class="sb-skill-card">
      <div class="sb-skill-who">曹 操 (AI)</div>
      <div class="sb-skill-what">每次出价后，揭示 2 件藏品的<strong>轮廓</strong>（仅他可见）</div>
    </div>
    <div class="sb-skill-card">
      <div class="sb-skill-who">司 马 懿 (AI)</div>
      <div class="sb-skill-what">第 4 轮时，揭示<strong>所有</strong>藏品（仅他可见）</div>
    </div>

    <h3 class="sb-h3">悬 停 详 情</h3>
    <div id="detail-card" class="sb-detail empty">
      鼠标悬停藏品<br>查看详细信息
    </div>

    <h3 class="sb-h3">稀 有 度 分 布</h3>
    <table style="width:100%;color:#a89880;font-size:12px;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:1px solid rgba(212,165,83,0.2);">
          <th style="padding:4px 8px;text-align:left;font-weight:normal;">档位</th>
          <th style="padding:4px 8px;text-align:right;font-weight:normal;">数量</th>
          <th style="padding:4px 8px;text-align:right;font-weight:normal;">价值合计</th>
        </tr>
      </thead>
      <tbody>${rarityRows}</tbody>
    </table>
  `;
}

// ---------- 详情卡更新 ----------
function setDetail(item: Item | null, mode: RevealMode) {
  const card = document.getElementById('detail-card');
  if (!card) return;
  if (!item) {
    card.className = 'sb-detail empty';
    card.innerHTML = '鼠标悬停藏品<br>查看详细信息';
    return;
  }
  card.className = 'sb-detail';
  const cat = CAT_LABEL[item.cat] ?? item.cat;
  const rar = RAR_LABEL[item.rarity];
  const rarColor = RAR_COLOR[item.rarity];

  if (mode === 'full') {
    card.innerHTML = `
      <div class="sb-detail-name">${item.name}<span class="sb-rar-badge" style="color:${rarColor}">${rar}</span></div>
      <div class="sb-detail-meta">
        类别：<span>${cat}</span><br>
        形状：<span>${item.shape.w} × ${item.shape.h}</span> （占 ${item.shape.w * item.shape.h} 格）<br>
        位置：<span>第 ${item.pos.row} 行 第 ${item.pos.col} 列</span><br>
        真实价值：<span>${item.value} 筹码</span>
      </div>
    `;
  } else if (mode === 'quality') {
    // 在 quality 模式下，前 6 件是已揭示的（与 warehouseView 内 demo 逻辑一致）
    // 简化：给所有 hover 的藏品都按 mode 展示
    card.innerHTML = `
      <div class="sb-detail-name">已 探 品 质 / 未 探</div>
      <div class="sb-detail-meta">
        品质：<span style="color:${rarColor}">${rar}</span>（仅在前 6 件展示）<br>
        位置（左上）：<span>第 ${item.pos.row} 行 第 ${item.pos.col} 列</span><br>
        形状：未知<br>价值：未知
      </div>
    `;
  } else if (mode === 'silhouette') {
    card.innerHTML = `
      <div class="sb-detail-name">已 探 轮 廓 / 未 探</div>
      <div class="sb-detail-meta">
        形状：<span>${item.shape.w} × ${item.shape.h}</span><br>
        位置：<span>第 ${item.pos.row} 行 第 ${item.pos.col} 列</span><br>
        品质：未知<br>价值：未知
      </div>
    `;
  } else {
    card.innerHTML = '此状态下藏品<br>完全未知';
    card.className = 'sb-detail empty';
  }
}

// ---------- 入口 ----------
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app element not found');

// 注入页面级 CSS（warehouseView 自己也会注入它的 CSS）
const pageStyle = document.createElement('style');
pageStyle.textContent = `
  body { margin: 0; }
  .sb-tab {
    background: #2a1f17;
    border: 1px solid #d4a553;
    color: #ede0c8;
    padding: 8px 18px;
    cursor: pointer;
    letter-spacing: 2px;
    font-family: inherit;
    font-size: 13px;
    transition: all 0.2s;
  }
  .sb-tab:hover { background: rgba(212,165,83,0.2); }
  .sb-tab.active {
    background: #d4a553; color: #1a0e08;
    box-shadow: 0 0 12px rgba(212,165,83,0.5);
  }
  .sb-h3 {
    color: #f4c97a; font-weight: normal; letter-spacing: 3px; font-size: 14px;
    border-bottom: 1px solid #d4a553; padding-bottom: 6px;
    margin-bottom: 10px; margin-top: 14px;
  }
  .sb-h3:first-child { margin-top: 0; }
  .sb-stat-box {
    background: #1a0e08; padding: 8px; text-align: center;
    border: 1px solid rgba(212,165,83,0.2);
  }
  .sb-stat-label { font-size: 10px; color: #a89880; letter-spacing: 2px; margin-bottom: 3px; }
  .sb-stat-val { font-size: 18px; color: #f4c97a; font-family: monospace; }
  .sb-skill-card {
    background: rgba(0,0,0,0.3); border-left: 3px solid #d4a553;
    padding: 8px 10px; margin-bottom: 8px;
  }
  .sb-skill-who { color: #f4c97a; font-size: 12px; letter-spacing: 2px; margin-bottom: 3px; }
  .sb-skill-what { color: #a89880; font-size: 11px; line-height: 1.5; }
  .sb-skill-what strong { color: #f4c97a; }
  .sb-detail {
    background: #1a0e08; border: 1px solid #d4a553; border-radius: 2px;
    padding: 10px; min-height: 100px;
  }
  .sb-detail.empty {
    color: #6e6258; font-size: 11px; text-align: center;
    padding: 28px 10px; line-height: 1.6; font-style: italic;
  }
  .sb-detail-name {
    color: #f4c97a; font-size: 14px; letter-spacing: 2px; margin-bottom: 6px;
  }
  .sb-detail-meta { color: #a89880; font-size: 11px; line-height: 1.7; }
  .sb-detail-meta span { color: #f4c97a; }
  .sb-rar-badge {
    display: inline-block; padding: 1px 6px; border: 1px solid currentColor;
    border-radius: 2px; font-size: 10px; margin-left: 6px;
  }
`;
document.head.appendChild(pageStyle);

app.innerHTML = `
  <main style="
    background:#1a1410;
    background-image:
      radial-gradient(circle at 10% 20%, rgba(139,40,40,0.08) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(212,165,83,0.06) 0%, transparent 40%);
    color:#ede0c8;
    font-family:'Songti SC','STSong','SimSun','Noto Serif CJK SC',serif;
    min-height:100vh;
    padding:24px 16px;
  ">
    <header style="text-align:center;margin-bottom:18px;">
      <h1 style="color:#f4c97a;letter-spacing:6px;font-weight:normal;font-size:30px;margin:0;">
        三 国 竞 拍
      </h1>
      <div style="color:#a89880;letter-spacing:2px;font-size:13px;margin-top:6px;">
        v0.1.0 dev ・ 仓库盲盒 + 阈值递降 + 押注 + 武将技能
      </div>
    </header>

    <!-- 主交互区：可玩 demo -->
    <section id="play-session" style="max-width:1280px;margin:0 auto 28px;"></section>

    <!-- M2 仓库视图浏览器（折叠） -->
    <details style="max-width:1280px;margin:16px auto;background:#2a1f17;border:1px solid rgba(212,165,83,0.3);padding:12px 16px;border-radius:4px;color:#a89880;font-size:12px;">
      <summary style="cursor:pointer;color:#f4c97a;letter-spacing:2px;">M2 仓库视图浏览器（4 种侦察状态切换 + 重新生成）</summary>
      <div style="margin-top:12px;">
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap;">
          <button class="sb-tab active" data-mode="hidden">① 完全未知</button>
          <button class="sb-tab" data-mode="quality">② 部分品质</button>
          <button class="sb-tab" data-mode="silhouette">③ 部分轮廓</button>
          <button class="sb-tab" data-mode="full">④ 全部揭示</button>
        </div>
        <div style="text-align:center;margin-bottom:18px;">
          <button id="regen-btn" class="sb-tab">↻ 重 新 生 成</button>
          <span id="seed-display" style="margin-left:12px;color:#a89880;font-family:monospace;font-size:12px;"></span>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:start;">
          <div id="warehouse-view"></div>
          <div id="stats-panel" style="background:#2a1f17;border:1px solid rgba(212,165,83,0.4);padding:18px;border-radius:4px;min-width:300px;max-width:380px;"></div>
        </div>
      </div>
    </details>

    <details style="max-width:900px;margin:24px auto;background:#2a1f17;border:1px solid rgba(212,165,83,0.3);padding:12px 16px;border-radius:4px;color:#a89880;font-size:12px;">
      <summary style="cursor:pointer;color:#f4c97a;letter-spacing:2px;">M1 压力测试结果（100 次生成）</summary>
      <pre id="stress-result" style="margin:8px 0 0;font-family:monospace;font-size:11px;color:#a89880;white-space:pre-wrap;"></pre>
    </details>

    <details open style="max-width:1000px;margin:16px auto;background:#2a1f17;border:1px solid rgba(212,165,83,0.3);padding:12px 16px;border-radius:4px;color:#a89880;font-size:12px;">
      <summary style="cursor:pointer;color:#f4c97a;letter-spacing:2px;">M3 拍卖核心场景测试</summary>
      <div id="auction-scenarios" style="margin-top:8px;"></div>
    </details>

    <details open style="max-width:1000px;margin:16px auto;background:#2a1f17;border:1px solid rgba(212,165,83,0.3);padding:12px 16px;border-radius:4px;color:#a89880;font-size:12px;">
      <summary style="cursor:pointer;color:#f4c97a;letter-spacing:2px;">M4 竞拍人技能场景测试</summary>
      <div id="skill-scenarios" style="margin-top:8px;"></div>
    </details>

    <details open style="max-width:1000px;margin:16px auto;background:#2a1f17;border:1px solid rgba(212,165,83,0.3);padding:12px 16px;border-radius:4px;color:#a89880;font-size:12px;">
      <summary style="cursor:pointer;color:#f4c97a;letter-spacing:2px;">M5 押注玩法场景测试</summary>
      <div id="betting-scenarios" style="margin-top:8px;"></div>
    </details>

    <details open style="max-width:1000px;margin:16px auto;background:#2a1f17;border:1px solid rgba(212,165,83,0.3);padding:12px 16px;border-radius:4px;color:#a89880;font-size:12px;">
      <summary style="cursor:pointer;color:#f4c97a;letter-spacing:2px;">M6 AI 玩家场景测试</summary>
      <div id="ai-scenarios" style="margin-top:8px;"></div>
    </details>

    <details open style="max-width:1000px;margin:16px auto;background:#2a1f17;border:1px solid rgba(212,165,83,0.3);padding:12px 16px;border-radius:4px;color:#a89880;font-size:12px;">
      <summary style="cursor:pointer;color:#f4c97a;letter-spacing:2px;">M7 MTT 单桌锦标赛测试</summary>
      <div id="mtt-scenarios" style="margin-top:8px;"></div>
    </details>

    <details open style="max-width:1000px;margin:16px auto;background:#2a1f17;border:1px solid rgba(212,165,83,0.3);padding:12px 16px;border-radius:4px;color:#a89880;font-size:12px;">
      <summary style="cursor:pointer;color:#f4c97a;letter-spacing:2px;">M8 多桌模拟测试</summary>
      <div id="multitable-scenarios" style="margin-top:8px;"></div>
    </details>
  </main>
`;

const viewEl = document.getElementById('warehouse-view')!;
const panelEl = document.getElementById('stats-panel')!;
const seedEl = document.getElementById('seed-display')!;

let currentSeed = Math.floor(Math.random() * 1e9);
let currentMode: RevealMode = 'hidden';
let currentWarehouse: Warehouse;

function refresh() {
  renderWarehouseView(
    currentWarehouse,
    {
      mode: currentMode,
      onItemHover: (it) => setDetail(it, currentMode),
    },
    viewEl
  );
  renderStats(currentWarehouse, panelEl, currentMode);
  seedEl.textContent = `seed = ${currentSeed}`;
}

function regenerate() {
  currentWarehouse = generateWarehouse({ seed: currentSeed });
  refresh();
}

document.getElementById('regen-btn')!.addEventListener('click', () => {
  currentSeed = Math.floor(Math.random() * 1e9);
  regenerate();
});

document.querySelectorAll<HTMLButtonElement>('.sb-tab[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sb-tab[data-mode]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode as RevealMode;
    refresh();
  });
});

regenerate();

// ---------- 挂载可玩 demo ----------
const playSessionEl = document.getElementById('play-session')!;
startPlaySession(playSessionEl);

// 压力测试
const stress = runStressTest(100);
const stressOut = document.getElementById('stress-result')!;
stressOut.textContent = [
  `生成次数: 100`,
  `通过:    ${stress.passed}`,
  `失败:    ${stress.failed}`,
  `平均藏品数:  ${stress.avgItems.toFixed(1)} （目标 30~60）`,
  `平均装载率:  ${(stress.avgLoadRatio * 100).toFixed(1)}% （目标 30~60%）`,
  `平均仓库总值: ${stress.avgValue.toFixed(0)} 筹码`,
  ...(stress.errors.length > 0 ? ['', '失败样本:', ...stress.errors.slice(0, 5)] : []),
].join('\n');
console.log('[sanBid M2] 压力测试', stress);

// ---------- M3 拍卖场景测试 ----------
const scenarios = runAllScenarios();
const passedAll = scenarios.every((s) => s.passed);
const passedCount = scenarios.filter((s) => s.passed).length;
console.log(`[sanBid M3] 拍卖场景 ${passedCount}/${scenarios.length} 通过`, scenarios);

const scenarioOut = document.getElementById('auction-scenarios')!;
scenarioOut.innerHTML = `
  <div style="font-size:13px;color:${passedAll ? '#5cb85c' : '#e85050'};letter-spacing:2px;margin-bottom:10px;">
    ${passedAll ? '✓ 全部通过' : '✗ 有失败'} ${passedCount} / ${scenarios.length}
  </div>
  ${scenarios.map((s) => `
    <div style="background:rgba(0,0,0,0.3);border-left:3px solid ${s.passed ? '#5cb85c' : '#e85050'};padding:8px 12px;margin-bottom:6px;">
      <div style="color:${s.passed ? '#5cb85c' : '#e85050'};font-size:13px;letter-spacing:1px;">
        ${s.passed ? '✓' : '✗'} ${s.name}
      </div>
      <div style="color:#a89880;font-size:11px;margin-top:2px;">${s.description}</div>
      <div style="color:#6e6258;font-size:11px;margin-top:4px;font-family:monospace;">
        expected: ${s.expected}<br>
        actual:&nbsp;&nbsp; ${s.actual}
      </div>
      ${s.rounds.length > 0 ? `
        <details style="margin-top:6px;">
          <summary style="cursor:pointer;color:#a89880;font-size:11px;">轮次明细 (${s.rounds.length})</summary>
          <pre style="margin:4px 0 0;font-family:monospace;font-size:10px;color:#a89880;white-space:pre-wrap;">${s.rounds.map((r) => `R${r.r}: ${r.bids}\n     → ${r.outcome}`).join('\n')}</pre>
        </details>
      ` : ''}
      ${s.settlement ? `<div style="color:#a89880;font-size:11px;margin-top:4px;font-family:monospace;">${s.settlement}</div>` : ''}
    </div>
  `).join('')}
`;

// ---------- M4 技能场景测试 ----------
const skillScenarios = runAllSkillScenarios();
const skillPassed = skillScenarios.every((s) => s.passed);
const skillPassedCount = skillScenarios.filter((s) => s.passed).length;
console.log(`[sanBid M4] 技能场景 ${skillPassedCount}/${skillScenarios.length} 通过`, skillScenarios);

const skillOut = document.getElementById('skill-scenarios')!;
function renderDetailScenarios(target: HTMLElement, items: { name: string; description: string; passed: boolean; details: string[] }[]) {
  const all = items.every((s) => s.passed);
  const ct = items.filter((s) => s.passed).length;
  target.innerHTML = `
    <div style="font-size:13px;color:${all ? '#5cb85c' : '#e85050'};letter-spacing:2px;margin-bottom:10px;">
      ${all ? '✓ 全部通过' : '✗ 有失败'} ${ct} / ${items.length}
    </div>
    ${items.map((s) => `
      <div style="background:rgba(0,0,0,0.3);border-left:3px solid ${s.passed ? '#5cb85c' : '#e85050'};padding:8px 12px;margin-bottom:6px;">
        <div style="color:${s.passed ? '#5cb85c' : '#e85050'};font-size:13px;letter-spacing:1px;">
          ${s.passed ? '✓' : '✗'} ${s.name}
        </div>
        <div style="color:#a89880;font-size:11px;margin-top:2px;">${s.description}</div>
        <pre style="margin:4px 0 0;font-family:monospace;font-size:10px;color:#a89880;white-space:pre-wrap;">${s.details.join('\n')}</pre>
      </div>
    `).join('')}
  `;
}
renderDetailScenarios(skillOut, skillScenarios);

// ---------- M5 押注场景测试 ----------
const bettingScenarios = runAllBettingScenarios();
console.log(`[sanBid M5] 押注场景 ${bettingScenarios.filter((s) => s.passed).length}/${bettingScenarios.length} 通过`, bettingScenarios);
renderDetailScenarios(document.getElementById('betting-scenarios')!, bettingScenarios);

// ---------- M6 AI 场景测试 ----------
const aiScenarios = runAllAiScenarios();
console.log(`[sanBid M6] AI 场景 ${aiScenarios.filter((s) => s.passed).length}/${aiScenarios.length} 通过`, aiScenarios);
renderDetailScenarios(document.getElementById('ai-scenarios')!, aiScenarios);

// ---------- M7 MTT 场景测试 ----------
const mttScenarios = runAllMttScenarios();
console.log(`[sanBid M7] MTT 场景 ${mttScenarios.filter((s) => s.passed).length}/${mttScenarios.length} 通过`, mttScenarios);
renderDetailScenarios(document.getElementById('mtt-scenarios')!, mttScenarios);

// ---------- M8 多桌模拟测试 ----------
const multiTableScenarios = runAllMultiTableScenarios();
console.log(`[sanBid M8] 多桌场景 ${multiTableScenarios.filter((s) => s.passed).length}/${multiTableScenarios.length} 通过`, multiTableScenarios);
renderDetailScenarios(document.getElementById('multitable-scenarios')!, multiTableScenarios);
