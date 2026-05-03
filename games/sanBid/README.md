# sanBid · 三国竞拍

仓库盲盒 + 阈值递降 + MTT 锦标赛 demo（单机演示）。

## 快速开始

```bash
npm install
npm run dev          # 启动 Vite 开发服 → http://localhost:5173
npm run typecheck    # TS 类型检查
npm run build        # 产出 dist/
```

## 项目结构

```
sanBid/
├── DESIGN.md              # 设计文档（先读这个！）
├── public/
│   └── mockups/
│       └── warehouse.html # 仓库视图视觉参考（10×20 / 35 件 / 4 侦察状态）
├── src/
│   ├── main.ts            # 入口（M0 占位页）
│   ├── config.ts          # 全局可调参数（镜像 DESIGN.md §9）
│   ├── core/              # 纯逻辑层（DOM-free，可单测、可移植到服务端）
│   │   ├── types.ts       # 领域类型
│   │   ├── warehouse.ts   # 仓库生成器（M1）
│   │   ├── auction.ts     # 单仓拍卖（M3）
│   │   ├── skills.ts      # 竞拍人技能（M4）
│   │   ├── betting.ts     # 押注结算（M5）
│   │   ├── ai.ts          # AI 决策（M6）
│   │   ├── tournament.ts  # MTT 状态机（M7）
│   │   ├── tableSim.ts    # 多桌模拟（M8）
│   │   └── index.ts
│   ├── ui/                # DOM 渲染（M2+）
│   └── data/
│       ├── characters.ts  # 武将与技能（v0.1: 诸葛亮 / 曹操 / 司马懿）
│       └── items.ts       # 藏品资料库
└── tests/                 # 核心规则单测
```

## 里程碑

详见 [DESIGN.md §10](DESIGN.md#10-里程碑建议演进顺序)。当前在 **M0 脚手架** 阶段。
