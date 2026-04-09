# ---- Dependency Stage (workspace 共享依赖) ----
FROM node:20-alpine AS deps
WORKDIR /app

# 根 workspace 配置 + lock 文件
COPY package.json package-lock.json ./

# sdc2（含嵌套 workspaces: shared/client/server）
COPY games/sdc2/package.json games/sdc2/
COPY games/sdc2/shared/package.json games/sdc2/shared/
COPY games/sdc2/client/package.json games/sdc2/client/
COPY games/sdc2/server/package.json games/sdc2/server/

# 纯前端 workspace
COPY games/sanPal/package.json games/sanPal/
COPY games/rglike/package.json games/rglike/
COPY games/superAutoSan/package.json games/superAutoSan/

RUN npm ci

# ---- Build Stage: sdc2 ----
FROM deps AS build-sdc2
COPY games/sdc2/ games/sdc2/
RUN npm run build -w san-sdc2

# ---- Build Stage: sanPal ----
FROM deps AS build-sanpal
COPY games/sanPal/ games/sanPal/
RUN npm run build -w sanpal

# ---- Build Stage: tianjiBox (独立构建，不在 workspace 中) ----
FROM node:20-alpine AS build-tianjibox
WORKDIR /app
COPY games/tianjiBox/client/package.json games/tianjiBox/client/package-lock.json* ./
RUN npm ci
COPY games/tianjiBox/client/ ./
RUN npm run build

# ---- Build Stage: rglike ----
FROM deps AS build-rglike
COPY games/rglike/ games/rglike/
RUN npm run build -w rglikeproject-temp

# ---- Build Stage: superAutoSan ----
FROM deps AS build-superautosan
COPY games/superAutoSan/ games/superAutoSan/
RUN npm run build -w superautosan

# ---- Runtime Stage ----
FROM node:20-alpine
RUN apk add --no-cache nginx

WORKDIR /app

# sdc2 运行时：安装 server 生产依赖（需要 workspace 上下文）
COPY package.json package-lock.json ./
COPY games/sdc2/package.json games/sdc2/
COPY games/sdc2/shared/package.json games/sdc2/shared/
COPY games/sdc2/server/package.json games/sdc2/server/
COPY games/sdc2/client/package.json games/sdc2/client/
RUN npm ci -w san-sdc2 --omit=dev --ignore-scripts

# sdc2 构建产物
COPY --from=build-sdc2 /app/games/sdc2/client/dist games/sdc2/client/dist/
COPY --from=build-sdc2 /app/games/sdc2/server/dist games/sdc2/server/dist/
COPY --from=build-sdc2 /app/games/sdc2/shared/ games/sdc2/shared/

# sanPal 构建产物（纯前端静态文件）
COPY --from=build-sanpal /app/games/sanPal/dist games/sanPal/dist/

# tianjiBox 构建产物（纯前端静态文件）
COPY --from=build-tianjibox /app/dist games/tianjiBox/client/dist/

# zhongyi（纯静态单HTML，无需构建）
COPY games/zhongyi/ games/zhongyi/

# rglike 构建产物（纯前端静态文件）
COPY --from=build-rglike /app/games/rglike/dist games/rglike/dist/

# superAutoSan 构建产物（纯前端静态文件）
COPY --from=build-superautosan /app/games/superAutoSan/dist games/superAutoSan/dist/

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
