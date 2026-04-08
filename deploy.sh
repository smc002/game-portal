#!/bin/bash
set -e
export DOCKER_HOST="${DOCKER_HOST:-unix:///var/run/docker.sock}"

# ========== 配置（按你的实际信息修改）==========
REGISTRY="crpi-c129j0bwe7dz4kxu.cn-hangzhou.personal.cr.aliyuncs.com"
NAMESPACE="gameportal"
IMAGE_NAME="san-portal"
# ================================================

FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}"
TAG=$(date +%Y%m%d-%H%M%S)

echo ">>> 构建镜像..."
docker build -t ${IMAGE_NAME} .

echo ">>> 打 tag: ${FULL_IMAGE}:${TAG}"
docker tag ${IMAGE_NAME} ${FULL_IMAGE}:${TAG}
docker tag ${IMAGE_NAME} ${FULL_IMAGE}:latest

echo ">>> 推送镜像..."
docker push ${FULL_IMAGE}:${TAG}
docker push ${FULL_IMAGE}:latest

echo ">>> 完成！镜像: ${FULL_IMAGE}:${TAG}"
echo ">>> 请到 SAE 控制台点击「重新部署」"
