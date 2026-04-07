#!/bin/sh
set -e

# 启动 sdc2 游戏服务端（后台）
node /app/games/sdc2/server/dist/index.js &

# 未来新游戏在这里添加
# node /app/games/game2/server/dist/index.js &

# 启动 Nginx（前台，保持容器运行）
nginx -g "daemon off;"
