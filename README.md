# 邯郸成语WebAR互动平台

将邯郸成语典故转化为可交互的沉浸式增强现实(AR)体验，实现文化传播与数字文旅的创新融合。

## 功能

- **首页**: 邯郸文化背景 + AR互动入口
- **文化介绍**: 12个成语典故 + 6个邯郸名胜景点，卡片式浏览，点击查看详情
- **AR互动(双模式)**:
  - **扫典故**: 扫描标记图 → AR展示成语典故内容
  - **拼成语**: AR场景散乱汉字 → 用户点击选字组成成语
- **我的**: 头像昵称 + 门票购买/礼品兑换入口

## 快速启动

```bash
# 1. 进入项目目录
cd handan-webAR

# 2. 生成HTTPS证书（需要OpenSSL）
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# 3. 启动HTTPS服务器
node server.js

# 4. 在手机浏览器访问（需同一WiFi）
# https://<你的IP地址>:443
```

> **注意**: 相机功能需要HTTPS。如果手机提示证书不受信任，请手动信任自签名证书。

## 技术栈

- **AR追踪**: MindAR v2 (图像特征追踪)
- **3D渲染**: Three.js (WebGL)
- **OCR**: Tesseract.js (浏览器端文字识别)
- **前端**: 纯 HTML/CSS/JS (无构建步骤)
- **PWA**: Service Worker + Web App Manifest

## 图片资源

运行前需要按 [prompts.txt](prompts.txt) 中的提示词生成图片，放入对应目录：

- `assets/images/` — 首页背景、成语插图、景点图片、UI图标
- `assets/targets/` — AR标记图原始图片
- `assets/markers/` — 编译后的.mind追踪文件（从标记图编译）

MindAR标记图编译工具: https://hiukim.github.io/mind-ar-js-doc/tools/compile

## 项目结构

```
handan-webAR/
├── index.html              # 主入口
├── manifest.json           # PWA配置
├── sw.js                   # Service Worker
├── server.js               # HTTPS开发服务器
├── prompts.txt             # 图片生成提示词
├── css/style.css           # 全局样式
├── js/
│   ├── app.js              # Tab切换/路由/弹窗/本地存储
│   ├── data.js             # 成语+景点数据
│   ├── home.js             # 首页逻辑
│   ├── culture.js          # 文化介绍页
│   ├── ar-controller.js    # AR双模式核心(MindAR+Three.js)
│   ├── game-engine.js      # 拼成语游戏引擎
│   ├── ar.js               # AR模块入口
│   └── profile.js          # 我的页面
└── assets/
    ├── images/             # 图片资源
    ├── targets/            # AR标记图
    └── markers/            # 编译后的.mind文件
```
