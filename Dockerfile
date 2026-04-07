# ---- Build Stage: sdc2 ----
FROM node:20-alpine AS build-sdc2
WORKDIR /app

# 安装依赖
COPY games/sdc2/package.json games/sdc2/package-lock.json ./
COPY games/sdc2/shared/package.json shared/
COPY games/sdc2/client/package.json client/
COPY games/sdc2/server/package.json server/
RUN npm ci

# 拷贝源码
COPY games/sdc2/shared/ shared/
COPY games/sdc2/client/ client/
COPY games/sdc2/server/ server/
COPY games/sdc2/tsconfig.base.json ./

# 构建 client + server
RUN npm run build

# ---- 未来新游戏在这里添加 build stage ----
# FROM node:20-alpine AS build-game2
# ...

# ---- Runtime Stage ----
FROM node:20-alpine
RUN apk add --no-cache nginx

WORKDIR /app

# sdc2 构建产物
COPY --from=build-sdc2 /app/client/dist games/sdc2/client/dist/
COPY --from=build-sdc2 /app/server/dist games/sdc2/server/dist/
COPY --from=build-sdc2 /app/server/package.json games/sdc2/server/
COPY --from=build-sdc2 /app/package.json /app/package-lock.json games/sdc2/
COPY --from=build-sdc2 /app/shared/ games/sdc2/shared/
RUN cd games/sdc2 && npm ci --workspace=server --omit=dev --ignore-scripts

# Portal 页
COPY portal/ portal/

# Nginx 配置
COPY nginx.conf /etc/nginx/http.d/default.conf

# 启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 80

CMD ["/docker-entrypoint.sh"]
