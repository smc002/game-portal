# 添加新游戏流程

## 前置条件

- 新游戏为 Node.js 项目（前端 + 后端），支持 `npm run build` 构建
- 后端通过 `node dist/index.js` 或类似方式启动，监听独立端口

## 步骤

### 1. 放入游戏源码

将新游戏完整源码放入 `games/` 目录：

```
games/
├── sdc2/        ← 已有
└── my-game/     ← 新游戏
    ├── client/
    ├── server/
    └── package.json
```

### 2. 更新 Portal 总览页

编辑 `portal/index.html`，在 `<div class="game-grid">` 内添加一张卡片：

```html
<a class="game-card" href="/my-game/">
  <div class="banner">&#127918;</div>
  <div class="info">
    <h2>游戏名称</h2>
    <p>游戏简介</p>
    <span class="tag">标签</span>
  </div>
</a>
```

### 3. 更新 Dockerfile

在 Runtime Stage 之前，添加新游戏的 build stage：

```dockerfile
# ---- Build Stage: my-game ----
FROM node:20-alpine AS build-my-game
WORKDIR /app
COPY games/my-game/ ./
RUN npm ci && npm run build
```

在 Runtime Stage 内，添加构建产物拷贝和依赖安装：

```dockerfile
# my-game 构建产物（根据实际输出路径调整）
COPY --from=build-my-game /app/client/dist games/my-game/client/dist/
COPY --from=build-my-game /app/server/dist games/my-game/server/dist/
COPY --from=build-my-game /app/package.json games/my-game/
RUN cd games/my-game && npm ci --omit=dev --ignore-scripts
```

### 4. 更新 nginx.conf

添加静态文件和反代规则（注意端口不能和已有游戏冲突）：

```nginx
# my-game - 静态文件
location /my-game/ {
    alias /app/games/my-game/client/dist/;
    try_files $uri $uri/ /my-game/index.html;
}

# my-game - WebSocket 反代（如果需要）
location /my-game/socket.io/ {
    rewrite ^/my-game/socket\.io/(.*) /socket.io/$1 break;
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400s;
}
```

### 5. 更新 docker-entrypoint.sh

添加新游戏的后端启动命令：

```sh
node /app/games/my-game/server/dist/index.js &
```

### 6. 新游戏自身需要适配的改动

- 前端构建配置添加 base path（如 Vite 项目设置 `base: '/my-game/'`）
- Socket.IO 客户端 path 改为 `/my-game/socket.io`
- 后端端口使用独立端口（如 3002），避免与已有游戏冲突

### 7. 构建并部署

```bash
docker build -t san-portal .
docker tag san-portal registry.cn-xxxxx.aliyuncs.com/gameportal/san-portal:latest
docker push registry.cn-xxxxx.aliyuncs.com/gameportal/san-portal:latest
```

在 SAE 控制台点击"重新部署"即可。

## 端口分配表

| 游戏 | 后端端口 | URL 路径 |
|------|----------|----------|
| sdc2 | 3001 | `/sdc2/` |
| sanPal | 无（纯静态） | `/sanPal/` |
| tianjiBox | 无（纯静态） | `/tianjiBox/` |
| （预留）| 3002 | `/game4/` |
| （预留）| 3003 | `/game5/` |
