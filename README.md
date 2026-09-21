# DeepSeek Pocket - 专属移动客户端 (DSH Mobile Client)

专门为 **DeepSeek Harness (DSH)** 打造的独立移动端客户端。支持摄像头扫码、动态公网/局域网网址直连、密码自动记忆，并内置 **DeepSeek 手机版原生 UI 主题与布局注入引擎**。

---

## 🌟 核心特性

1. 📷 **智能扫码与动态网址直连**
   - 支持调用手机摄像头直接扫描 DSH 设置页的二维码（包含局域网与公网 Cloudflare 临时隧道链接）。
   - 自动解析提取 `token`（8 位访问密码），免去手机端繁琐的手动输入。
   - 支持从手机相册导入二维码图片进行识别。

2. 📜 **多设备/历史记录管理**
   - 自动保存已连接的历史电脑（如“办公室电脑”、“宿舍笔记本”）。
   - 公网隧道换了新地址后，扫码即可一键覆盖更新，支持快速重连与删除。

3. 🎨 **DeepSeek 手机版布局重构（非侵入式动态注入）**
   - **顶栏极简重排**：模型胶囊徽标、沉浸式状态栏与侧边栏抽屉手势。
   - **对话气泡美化**：用户消息深色/淡蓝圆角气泡，AI 消息极简左侧排版。
   - **💡 深度思考（DeepThink）胶囊化**：将复杂的推理内容自动折叠为 DeepSeek 原生胶囊 `[ 💡 已深度思考 (展开查看) ]`。
   - **底部浮动输入 Dock**：大圆角输入框、工具按钮栏（联网/思考/插件）与蓝色发送键。

4. 🔌 **第三方插件完美兼容**
   - 无论 DSH 后续安装多少个新插件（如 `dsh-memory`、`dsh-cost-meter`、`dsh-easyrewrite` 等），注入层均采用 Flex 弹性流布局，**不遮挡、不破坏任何插件的新增按钮与操作面板**，并自动统一为其赋予 DeepSeek 风格圆角与色彩。

5. ⚙️ **悬浮控制球**
   - 在远程页面内随时点击右下角悬浮球，支持**一键刷新**、**切换 DeepSeek 原生/经典主题**、**返回连接中心**。

---

## 🚀 运行与打包指南

### 1. 本地快速预览与调试

```bash
cd dsh-pocket-app
npm install
npm run dev
```

在浏览器中打开生成的本地地址即可进行扫码与界面测试。

### 2. 打包生成 Android APK 安装包 (基于 Capacitor)

本项目已预置 `@capacitor/core` 与 `@capacitor/android` 配置：

```bash
cd dsh-pocket-app

# 1. 安装依赖并构建静态资源
npm install
npm run build

# 2. 初始化添加 Android 平台工程（首次）
npx cap add android

# 3. 同步 Web 资源到 Android 工程
npx cap sync android

# 4. 打开 Android Studio 构建 APK
npx cap open android
```

在 Android Studio 中点击 **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**，即可生成专属的 `.apk` 安装包安装至手机。

---

## 📁 目录结构

```
dsh-pocket-app/
├── index.html                  # 客户端主入口页面
├── capacitor.config.json       # Android / Capacitor 配置文件
├── package.json
├── src/
│   ├── main.js                 # 路由、状态管理与悬浮控制逻辑
│   ├── scanner.js              # 摄像头扫码与 URL / Token 解析引擎
│   ├── styles/
│   │   └── app.css             # 客户端连接中心 & 扫码器界面样式
│   └── injector/
│       ├── deepseek-theme.css  # DeepSeek 手机版视觉设计系统样式表
│       └── deepseek-injector.js# 动态 DOM 重构与深度思考折叠注入脚本
└── README.md
```
