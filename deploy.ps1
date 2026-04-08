$ErrorActionPreference = "Stop"

$REGISTRY = "crpi-c129j0bwe7dz4kxu.cn-hangzhou.personal.cr.aliyuncs.com"
$NAMESPACE = "gameportal"
$IMAGE_NAME = "san-portal"
$FULL_IMAGE = "$REGISTRY/$NAMESPACE/$IMAGE_NAME"
$TAG = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "--- 构建镜像 ---"
docker build -t $IMAGE_NAME .

Write-Host "--- 打 tag: ${FULL_IMAGE}:${TAG} ---"
docker tag $IMAGE_NAME "${FULL_IMAGE}:${TAG}"
docker tag $IMAGE_NAME "${FULL_IMAGE}:latest"

Write-Host "--- 推送镜像 ---"
docker push "${FULL_IMAGE}:${TAG}"
docker push "${FULL_IMAGE}:latest"

Write-Host "--- 完成！镜像: ${FULL_IMAGE}:${TAG} ---"
Write-Host "--- 请到 SAE 控制台点击重新部署 ---"
