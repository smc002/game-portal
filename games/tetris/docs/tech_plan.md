# 俄罗斯方块 · 技术方案

## 一、技术栈

| 类别 | 选型 | 说明 |
|---|---|---|
| 框架 | React 19 | 与仓库其他游戏保持一致 |
| 语言 | TypeScript 5 | 严格模式 |
| 构建 | Vite 8 | `base: '/tetris/'` |
| 样式 | Tailwind CSS 4 | 工具类 + 少量自定义 |
| 状态管理 | Zustand 5 | 单 store 管理 gameState |
| 渲染 | DOM + CSS Grid | 20×10 格，组件化足够流畅 |
| 定时 | `requestAnimationFrame` | 每帧累加 delta，统一处理重力/锁定/DAS |

**为什么 DOM 而不是 Canvas**：10×20 = 200 个单元格量级很小，DOM 即可；方便用 Tailwind 写样式和做过渡动画，也避免 Canvas 的字体/像素对齐问题。

## 二、目录结构

```
games/tetris/
├── docs/
│   ├── game.md
│   └── tech_plan.md
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx             # 入口
│   ├── App.tsx              # 页面根组件
│   ├── index.css            # Tailwind 引入 + 全局样式
│   ├── types/
│   │   └── index.ts         # 全部类型定义
│   ├── engine/
│   │   ├── tetromino.ts     # 7 种方块形状 + SRS 旋转表 + 踢墙表
│   │   ├── bag.ts           # 7-bag 随机发生器
│   │   ├── board.ts         # 棋盘操作：碰撞、合入、消行
│   │   ├── gravity.ts       # 等级→下落间隔映射
│   │   └── score.ts         # 计分公式
│   ├── store/
│   │   └── gameStore.ts     # Zustand：全局游戏状态与 actions
│   ├── hooks/
│   │   ├── useGameLoop.ts   # rAF 主循环
│   │   └── useKeyboard.ts   # 键盘输入 + DAS/ARR
│   └── components/
│       ├── Board.tsx        # 主棋盘渲染
│       ├── Cell.tsx         # 单格
│       ├── HoldPanel.tsx    # Hold 槽
│       ├── NextQueue.tsx    # Next 预览
│       ├── ScorePanel.tsx   # 分数/等级/行数
│       ├── MiniPiece.tsx    # Hold/Next 里的小方块
│       ├── Overlay.tsx      # 主菜单 / 暂停 / GameOver 遮罩
│       └── Controls.tsx     # 底部控制说明
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── eslint.config.js         # 可选，后期补
```

## 三、核心类型定义

```ts
// src/types/index.ts

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type CellValue = 0 | TetrominoType;          // 0 = 空
export type Board = CellValue[][];                  // [row][col], row=0 最上

export type Rotation = 0 | 1 | 2 | 3;               // 0, R, 2, L

export interface ActivePiece {
  type: TetrominoType;
  rotation: Rotation;
  x: number;                                        // 左上格的列
  y: number;                                        // 左上格的行（可为负，表缓冲区）
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  board: Board;
  active: ActivePiece | null;
  hold: TetrominoType | null;
  canHold: boolean;
  queue: TetrominoType[];                           // 长度 >= 5
  bag: TetrominoType[];                             // 当前袋剩余
  score: number;
  level: number;
  lines: number;
  status: GameStatus;
  dropAccumMs: number;                              // 下落累积时间
  lockDelayMs: number;                              // 锁定延迟累积
  lockResets: number;                               // 锁定延迟重置次数
  isOnGround: boolean;
}
```

## 四、引擎模块设计

### 4.1 `tetromino.ts`
- `SHAPES[type][rotation]`：4 个 4×4 布尔矩阵
- `SPAWN_OFFSET[type]`：出生位置
- `WALL_KICKS_JLSTZ` / `WALL_KICKS_I`：踢墙偏移表（5 个候选 per 旋转）
- 导出 `getBlocks(piece) : Array<[row, col]>`：当前方块的实际占格

### 4.2 `bag.ts`
- `refillBag(): TetrominoType[]`：返回打乱后的 7 个方块
- `ensureQueue(state, minLen=5)`：当队列 < minLen 时，追加一袋

### 4.3 `board.ts`
- `createEmptyBoard(): Board`
- `collides(board, piece): boolean`
- `merge(board, piece): Board`
- `clearLines(board): { board, cleared }`
- `tryMove(board, piece, dx, dy): ActivePiece | null`
- `tryRotate(board, piece, dir: 1|-1): ActivePiece | null`（内部走踢墙表）
- `hardDropDistance(board, piece): number`

### 4.4 `gravity.ts`
- `getDropInterval(level: number): number`

### 4.5 `score.ts`
- `LINE_SCORES = [0, 100, 300, 500, 800]`
- `scoreForLines(n, level)`
- `scoreForSoftDrop(cells)` / `scoreForHardDrop(cells)`

## 五、Zustand Store 设计

```ts
interface GameStore extends GameState {
  // 生命周期
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;

  // 输入动作
  moveLeft: () => void;
  moveRight: () => void;
  softDrop: () => void;
  hardDrop: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  holdPiece: () => void;

  // 主循环 tick（每帧调用）
  tick: (deltaMs: number) => void;

  // 内部
  spawnNext: () => void;
  lockPiece: () => void;
}
```

## 六、主循环：`useGameLoop`

```ts
const tick = useGameStore(s => s.tick);
useEffect(() => {
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = now - last;
    last = now;
    tick(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}, [tick]);
```

- `tick(dt)` 内部：
  1. 若 `status !== 'playing'` 直接返回
  2. 累加 `dropAccumMs`，若 ≥ `getDropInterval(level)` 则尝试下落 1 格
     - 成功 → 重置 `dropAccumMs`，`isOnGround = false`
     - 失败（着地）→ 进入锁定延迟状态
  3. 若 `isOnGround`，累加 `lockDelayMs`，≥ 500 则 `lockPiece()`

## 七、输入处理：`useKeyboard`

- 监听 keydown/keyup
- 对 ←/→/↓ 实现 DAS/ARR：
  - keydown → 立即触发一次
  - 167ms 后开始以 33ms 间隔连续触发
  - keyup 清定时器
- 其余键直接触发 store action

## 八、渲染流程

```
<App>
├─ <Overlay> 覆盖层（菜单/暂停/GameOver）
└─ <GameLayout>
   ├─ <HoldPanel>
   ├─ <Board>
   │  └─ 20×10 <Cell>，显示棋盘已锁定 + 当前方块 + Ghost
   └─ <RightPanel>
      ├─ <NextQueue>
      └─ <ScorePanel>
```

`Board` 组件的渲染数据：
```ts
const renderBoard = useMemo(() => {
  const b = cloneBoard(state.board);
  if (ghost) paintGhost(b, ghost);     // 先画 ghost
  if (active) paintActive(b, active);  // 再画 active（覆盖 ghost）
  return b;
}, [state.board, active]);
```

## 九、开发步骤（Dev Phases）

### Phase 0 · 脚手架
- [ ] 在 `games/tetris/` 建立 package.json / vite / tsconfig / tailwind / index.html
- [ ] 根 `package.json` 的 workspaces 追加 `games/tetris`
- [ ] `npm install` 后 `npm run build -w games/tetris` 通过
- [ ] 渲染一个空的 10×20 棋盘验证链路

### Phase 1 · 方块与引擎骨架
- [ ] `types/index.ts`
- [ ] `engine/tetromino.ts`：7 种形状 + 4 个旋转 + 踢墙表
- [ ] `engine/bag.ts`：7-bag
- [ ] `engine/board.ts`：空棋盘、碰撞、合入
- [ ] 单元测试方式：在控制台打印几个方块确认形状正确

### Phase 2 · 下落与渲染
- [ ] Zustand store 初版
- [ ] `useGameLoop`：方块自动下落
- [ ] `Board` 组件：显示已锁定棋盘 + 当前方块
- [ ] 到底自动锁定、消行、新出生

### Phase 3 · 操作
- [ ] `useKeyboard`：基本 ←/→/↓/↑/Space
- [ ] 左右移动、软降、顺时针旋转（含踢墙）
- [ ] 硬降（带计分）
- [ ] DAS/ARR

### Phase 4 · Hold / Next / Ghost
- [ ] `HoldPanel` + hold 逻辑（每方块一次）
- [ ] `NextQueue` 显示 5 个
- [ ] Ghost 影子

### Phase 5 · 计分与等级
- [ ] `score.ts` 计分公式
- [ ] 等级随行数上升，下落间隔变化
- [ ] `ScorePanel` 显示

### Phase 6 · 状态与打磨
- [ ] 开始 / 暂停 / Game Over 遮罩
- [ ] Top-out 判定
- [ ] 消行闪烁动画
- [ ] 锁定延迟 + 延迟重置计数
- [ ] 底部控制说明
- [ ] 视觉打磨（阴影、色调、格子高光）

### Phase 7 · 可选
- [ ] 音效
- [ ] 最高分持久化（localStorage）
- [ ] T-Spin / B2B / Combo

## 十、构建验证

```bash
# 根目录
npm install
npm run build -w games/tetris

# 本地预览
npm run dev -w games/tetris
```

## 十一、关键设计取舍

| 问题 | 决策 | 原因 |
|---|---|---|
| 旋转系统 | 采用 SRS（含踢墙） | 现代玩家的肌肉记忆、手感最好 |
| 渲染方式 | DOM | 量级小、样式灵活；Canvas 对本项目收益不大 |
| 随机器 | 7-bag | 标准且避免"干旱" |
| 锁定延迟 | 500ms + 15 次重置 | Tetris Guideline 常见配置 |
| 方块坐标 | 左上角 (x,y) + 4×4 矩阵 | 与踢墙表对齐，O 块不需特殊处理 |
| 缓冲区 | 额外 2 行 | 方块出生需要足够空间 |
