// 仓库视图组件 — M2
// 把 mockups/warehouse.html 的视觉迁移成可复用 TS 组件
// 接受任意 Warehouse + 揭示状态，渲染对应可视化
//
// 设计：暗红木背景 + 金色描边 + 6 档稀有度色边框
// 4 种渲染模式：
//   - hidden     完全未知（藏品不显示，仅 cell 网格）
//   - quality    仅品质（揭示集中的藏品在左上格亮色点）
//   - silhouette 仅轮廓（揭示集中的藏品占位染色 + 形状标注）
//   - full       全部揭示（图标 + 名字 + 价值 + 边框）
//   - custom     自定义（quality 集 + silhouette 集分开传入）

import type { Item, Rarity, RevealedSet, Warehouse } from '../core/types.ts';

export type RevealMode = 'hidden' | 'quality' | 'silhouette' | 'full' | 'custom';

export interface WarehouseViewOptions {
  mode: RevealMode;
  /** 仅 mode='custom' 时使用 */
  revealed?: RevealedSet;
  /** 单格像素尺寸，默认 38 */
  cellSize?: number;
  /** 是否显示行/列标尺 */
  showRulers?: boolean;
  /** 仓库标题（默认"曹营第三仓"）*/
  title?: string;
  /** hover 详情回调 */
  onItemHover?: (item: Item | null) => void;
  /** 点击藏品时的回调（用于打开图鉴等） */
  onItemClick?: (item: Item) => void;
}

const RAR_COLOR: Record<Rarity, string> = {
  white: '#e0d8c8',
  green: '#5cb85c',
  blue: '#4a8eb8',
  purple: '#a855c7',
  gold: '#f4c97a',
  red: '#e85050',
};

const STYLE_ID = 'sanbid-warehouse-view-styles';

/** 全局注入一次 CSS（重复调用幂等） */
export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CSS = `
.sb-wh-frame {
  background: #2a1f17;
  border: 1px solid #d4a553;
  border-radius: 4px;
  padding: 20px;
  position: relative;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(212,165,83,0.15);
  width: fit-content;
}
.sb-wh-frame::before, .sb-wh-frame::after {
  content: ''; position: absolute; width: 22px; height: 22px; border: 1px solid #d4a553;
}
.sb-wh-frame::before { top: 6px; left: 6px; border-right: none; border-bottom: none; }
.sb-wh-frame::after { bottom: 6px; right: 6px; border-left: none; border-top: none; }

.sb-wh-title {
  text-align: center; color: #f4c97a; letter-spacing: 4px;
  font-size: 17px; margin-bottom: 12px;
}
.sb-wh-title .sb-seal {
  display: inline-block; background: #8b2828; color: #ede0c8;
  padding: 2px 8px; margin-left: 8px; font-size: 11px; letter-spacing: 2px;
  border: 1px solid #ede0c8; vertical-align: middle;
}
.sb-wh-meta {
  text-align: center; color: #a89880; font-size: 11px;
  letter-spacing: 2px; margin-bottom: 10px;
}

.sb-wh-rulers {
  display: grid;
  grid-template-columns: 16px auto;
  grid-template-rows: 16px auto;
  gap: 2px;
}
.sb-wh-rulers .sb-corner {}
.sb-wh-rulers .sb-r-cols, .sb-wh-rulers .sb-r-rows {
  display: grid; gap: 2px; color: #6e6258; font-size: 9px; font-family: monospace;
}

.sb-wh-grid {
  display: grid;
  gap: 2px;
  background: #1a0e08;
  padding: 2px;
  border: 1px solid rgba(212,165,83,0.45);
  position: relative;
}

.sb-cell {
  background: linear-gradient(135deg, #2a1f17 25%, #251a13 50%, #2a1f17 75%);
  border: 1px solid rgba(212,165,83,0.18);
  position: relative;
}
.sb-cell::after {
  content: ''; position: absolute; inset: 30%;
  border: 1px solid rgba(212,165,83,0.06);
}
.sb-cell.sb-empty-zone {
  background: linear-gradient(135deg, #1f1610 25%, #1a120c 50%, #1f1610 75%);
}
.sb-cell.sb-empty-zone::after { border-color: rgba(212,165,83,0.03); }

.sb-item {
  position: relative;
  z-index: 2;
  border-radius: 2px;
  display: flex; align-items: center; justify-content: center;
  color: #ede0c8;
  font-size: 10px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: transform 0.15s;
}
.sb-item:hover { transform: scale(1.03); }

.sb-item.sb-quality-only { background: transparent; border: none; }
.sb-item.sb-quality-only .sb-qmark {
  position: absolute; top: 3px; left: 3px;
  width: 14px; height: 14px; border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}

.sb-item.sb-silhouette-only {
  background: rgba(212,165,83,0.15);
  border: 1px dashed #d4a553;
  color: #a89880;
}
.sb-item.sb-silhouette-only::before {
  content: attr(data-shape);
  font-size: 9px; letter-spacing: 0; color: rgba(212,165,83,0.65);
}

.sb-item.sb-full {
  background: linear-gradient(135deg, #3a2d22, #2e2218);
  color: #ede0c8;
  box-shadow: inset 0 0 12px rgba(0,0,0,0.4);
  flex-direction: column;
  gap: 1px;
  padding: 3px;
  text-align: center;
  border: 2px solid var(--sb-rar);
}
.sb-item.sb-full .sb-icon { font-size: 16px; line-height: 1; }
.sb-item.sb-full .sb-name { font-size: 9px; letter-spacing: 0; line-height: 1.1; }
.sb-item.sb-full .sb-value { font-size: 9px; color: #f4c97a; font-family: monospace; }
.sb-item.sb-full .sb-qmark {
  position: absolute; top: 2px; left: 2px;
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--sb-rar);
  box-shadow: 0 0 6px var(--sb-rar);
}
`;

/** 渲染入口 */
export function renderWarehouseView(
  warehouse: Warehouse,
  options: WarehouseViewOptions,
  container: HTMLElement
): void {
  injectStyles();

  const cellSize = options.cellSize ?? 38;
  const showRulers = options.showRulers ?? true;
  const title = options.title ?? '曹营第三仓';

  // 计算占据格集合（用于 empty-zone 标记）
  const occupied = new Set<string>();
  for (const it of warehouse.items) {
    for (let r = 0; r < it.shape.h; r++) {
      for (let c = 0; c < it.shape.w; c++) {
        occupied.add(`${it.pos.row + r}-${it.pos.col + c}`);
      }
    }
  }

  // ----- 计算每个 item 该如何展示 -----
  // 返回 { item, qualityKnown, silhouetteKnown }
  const reveals = computeReveals(warehouse, options);

  // ----- DOM 构建 -----
  container.innerHTML = '';
  const frame = document.createElement('div');
  frame.className = 'sb-wh-frame';

  // 标题
  const titleEl = document.createElement('div');
  titleEl.className = 'sb-wh-title';
  titleEl.innerHTML = `${title}<span class="sb-seal">封</span>`;
  frame.appendChild(titleEl);

  // 元信息
  const metaEl = document.createElement('div');
  metaEl.className = 'sb-wh-meta';
  const loadRatio =
    Array.from(occupied).length / (warehouse.cols * warehouse.rows);
  metaEl.textContent = `${warehouse.cols} 列 × ${warehouse.rows} 行 ・ 共 ${
    warehouse.cols * warehouse.rows
  } 格 ・ 装载率 ${(loadRatio * 100).toFixed(1)}%`;
  frame.appendChild(metaEl);

  // 网格 + 标尺
  let gridParent: HTMLElement = frame;
  if (showRulers) {
    const rulersWrap = document.createElement('div');
    rulersWrap.className = 'sb-wh-rulers';
    rulersWrap.appendChild(document.createElement('div')); // corner

    const rCols = document.createElement('div');
    rCols.className = 'sb-r-cols';
    rCols.style.gridTemplateColumns = `repeat(${warehouse.cols}, ${cellSize}px)`;
    rCols.style.alignItems = 'center';
    rCols.style.justifyItems = 'center';
    for (let i = 1; i <= warehouse.cols; i++) {
      const d = document.createElement('div');
      d.textContent = String(i);
      rCols.appendChild(d);
    }
    rulersWrap.appendChild(rCols);

    const rRows = document.createElement('div');
    rRows.className = 'sb-r-rows';
    rRows.style.gridTemplateRows = `repeat(${warehouse.rows}, ${cellSize}px)`;
    rRows.style.alignItems = 'center';
    rRows.style.justifyItems = 'center';
    for (let i = 1; i <= warehouse.rows; i++) {
      const d = document.createElement('div');
      d.textContent = String(i);
      rRows.appendChild(d);
    }
    rulersWrap.appendChild(rRows);

    frame.appendChild(rulersWrap);
    // 网格放在第 4 个格（rulersWrap 内）
    const gridSlot = document.createElement('div');
    rulersWrap.appendChild(gridSlot);
    gridParent = gridSlot;
  }

  const grid = document.createElement('div');
  grid.className = 'sb-wh-grid';
  grid.style.gridTemplateColumns = `repeat(${warehouse.cols}, ${cellSize}px)`;
  grid.style.gridTemplateRows = `repeat(${warehouse.rows}, ${cellSize}px)`;

  // 背景格
  for (let r = 1; r <= warehouse.rows; r++) {
    for (let c = 1; c <= warehouse.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'sb-cell';
      // 空区域（仓库下半部）暗一档
      if (r >= 13 && !occupied.has(`${r}-${c}`)) {
        cell.classList.add('sb-empty-zone');
      }
      grid.appendChild(cell);
    }
  }

  // 藏品
  for (const r of reveals) {
    const it = r.item;
    const div = document.createElement('div');
    div.className = 'sb-item';
    div.dataset.shape = `${it.shape.w}×${it.shape.h}`;
    (div.style as any).setProperty('--sb-rar', RAR_COLOR[it.rarity]);

    // 不显示 → 跳过
    if (!r.qualityKnown && !r.silhouetteKnown && options.mode !== 'full') {
      continue;
    }

    if (options.mode === 'full' || (r.qualityKnown && r.silhouetteKnown)) {
      // 全揭示
      div.classList.add('sb-full');
      div.style.gridColumn = `${it.pos.col} / span ${it.shape.w}`;
      div.style.gridRow = `${it.pos.row} / span ${it.shape.h}`;
      const qmark = document.createElement('div');
      qmark.className = 'sb-qmark';
      div.appendChild(qmark);
      const area = it.shape.w * it.shape.h;
      if (area >= 2) {
        const icon = document.createElement('div');
        icon.className = 'sb-icon';
        icon.textContent = it.icon;
        div.appendChild(icon);
        if (area >= 4) {
          const name = document.createElement('div');
          name.className = 'sb-name';
          name.textContent = it.name;
          div.appendChild(name);
          const value = document.createElement('div');
          value.className = 'sb-value';
          value.textContent = String(it.value);
          div.appendChild(value);
        }
      } else {
        const icon = document.createElement('div');
        icon.className = 'sb-icon';
        icon.textContent = it.icon;
        div.appendChild(icon);
      }
    } else if (r.silhouetteKnown) {
      // 仅轮廓
      div.classList.add('sb-silhouette-only');
      div.style.gridColumn = `${it.pos.col} / span ${it.shape.w}`;
      div.style.gridRow = `${it.pos.row} / span ${it.shape.h}`;
    } else if (r.qualityKnown) {
      // 仅品质 → 1×1 色点 在左上格
      div.classList.add('sb-quality-only');
      div.style.gridColumn = `${it.pos.col} / span 1`;
      div.style.gridRow = `${it.pos.row} / span 1`;
      const mark = document.createElement('div');
      mark.className = 'sb-qmark';
      mark.style.background = RAR_COLOR[it.rarity];
      mark.style.color = RAR_COLOR[it.rarity];
      div.appendChild(mark);
    }

    if (options.onItemHover) {
      div.addEventListener('mouseenter', () => options.onItemHover?.(it));
      div.addEventListener('mouseleave', () => options.onItemHover?.(null));
    }
    if (options.onItemClick) {
      div.addEventListener('click', () => options.onItemClick?.(it));
    }
    grid.appendChild(div);
  }

  gridParent.appendChild(grid);
  container.appendChild(frame);
}

// ===== 揭示集计算 =====
interface ItemReveal {
  item: Item;
  qualityKnown: boolean;
  silhouetteKnown: boolean;
}

function computeReveals(
  w: Warehouse,
  opts: WarehouseViewOptions
): ItemReveal[] {
  return w.items.map((it) => {
    if (opts.mode === 'hidden') {
      return { item: it, qualityKnown: false, silhouetteKnown: false };
    }
    if (opts.mode === 'full') {
      return { item: it, qualityKnown: true, silhouetteKnown: true };
    }
    if (opts.mode === 'quality') {
      // 揭示前 6 件的品质（demo 用；M3+ 走真实技能）
      const idx = w.items.indexOf(it);
      return { item: it, qualityKnown: idx < 6, silhouetteKnown: false };
    }
    if (opts.mode === 'silhouette') {
      const idx = w.items.indexOf(it);
      return { item: it, qualityKnown: false, silhouetteKnown: idx < 6 };
    }
    // custom
    const rev = opts.revealed;
    return {
      item: it,
      qualityKnown: rev?.quality.has(it.id) ?? false,
      silhouetteKnown: rev?.silhouette.has(it.id) ?? false,
    };
  });
}
