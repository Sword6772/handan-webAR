#!/bin/bash
echo ""
echo "  正在检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "  [错误] 未检测到 Node.js，请先安装："
    echo "  https://nodejs.org （下载 LTS 版本即可）"
    echo ""
    exit 1
fi

echo "  正在启动服务器..."
echo ""
node server.js
