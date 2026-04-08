@echo off
setlocal enabledelayedexpansion

set "REGISTRY=crpi-c129j0bwe7dz4kxu.cn-hangzhou.personal.cr.aliyuncs.com"
set "NAMESPACE=gameportal"
set "IMAGE_NAME=san-portal"
set "FULL_IMAGE=%REGISTRY%/%NAMESPACE%/%IMAGE_NAME%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "DT=%%I"
set "TAG=%DT:~0,8%-%DT:~8,6%"

echo --- 构建镜像 ---
docker build -t %IMAGE_NAME% .
if %errorlevel% neq 0 goto fail

echo --- 打 tag: %FULL_IMAGE%:%TAG% ---
docker tag %IMAGE_NAME% %FULL_IMAGE%:%TAG%
docker tag %IMAGE_NAME% %FULL_IMAGE%:latest

echo --- 推送镜像 ---
docker push %FULL_IMAGE%:%TAG%
if %errorlevel% neq 0 goto fail
docker push %FULL_IMAGE%:latest
if %errorlevel% neq 0 goto fail

echo --- 完成！镜像: %FULL_IMAGE%:%TAG% ---
echo --- 请到 SAE 控制台点击重新部署 ---
goto end

:fail
echo --- 出错，请检查上方日志 ---
exit /b 1

:end
endlocal
