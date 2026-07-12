@echo off
chcp 65001 >nul
title 邯郸成语AR - 本地服务器

echo.
echo   正在检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [错误] 未检测到 Node.js，请先安装：
    echo   https://nodejs.org （下载 LTS 版本即可）
    echo.
    pause
    exit /b 1
)

echo   正在启动服务器...
echo.
node server.js
pause
