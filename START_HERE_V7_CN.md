# Yuteng Zhang · Homepage v7 / 中文运行说明

## v7 修改范围

1. 导航栏由 YZ 改回字母 **Y + 四个关键拓扑节点**；含 SVG 母版与 favicon。
2. 保留 v6 26 个稀疏星点，将暗色模式亮度调整为清晰可见的、错峰闪烁的细点，日间隐藏，响应 `Reduce motion` 和系统减少动画。
3. 鼠标左键真正点击时产生约 0.6 秒的金色点与扩散环；若按下后明显拖拽（大于 8px）则不产生扩散，不影响城市旋转。触摸滚动不触发。
4. 清除三维城市容器和 Canvas 的可见外框，键盘聚焦时仅以一个微小节点辅助识别。不改动城市几何、3D 代码、相机、Agent 动效。

其余 v6 内容（About、News、论文、双语、访客地图、Cloudflare Worker）保持一致。

## 本地运行（Python 3.10+，零 pip/npm 依赖）

完全解压源码包，在 `yuteng-academic-site` 目录：

```powershell
python scripts/serve.py --open
```

Windows 可双击 `run.bat`；macOS/Linux 使用 `python3 scripts/serve.py --open`。
访问 `http://127.0.0.1:8000/`；按 Ctrl+C 退出。

编辑 `public/assets/brand-y.svg`、`public/assets/v7.css`、`public/assets/interaction/ClickPulse.js` 即可修改本版新增功能。
修改后运行 `python scripts/build.py` 生成 `dist/`。请勿仅修改 `dist/`。`data/profile.json` 是简历、论文、简介的配置入口。

## GitHub Pages

**方式 A（推荐）**：将完整源码目录的内容推送到自己的 GitHub 仓库 `main` 分支，在 `Settings > Pages > Source` 选择 `GitHub Actions`，项目自带 `.github/workflows/pages.yml`。每次 push 自动构建并部署。

**方式 B**：解压 `Yuteng_Zhang_Homepage_v7_GitHub_Pages.zip` 并把根目录的 `index.html`、`zh.html`、`assets/` 等静态资源部署到 Pages 分支的仓库根目录。

访客地图依然需要先完成一次 Cloudflare Worker + D1 部署与前端 API 地址配置。GitHub Pages 本身不能存储访客 IP 统计。具体见 `GITHUB_PAGES_VISITOR_MAP_V6.md`。

## 兼容性与可访问性

* 360px 手机、桌面分辨率适配继续使用 v6 原版布局。
* 只有 `prefers-reduced-motion` 允许且动画状态为 `running` 时生成点击扩散动画。
* 星星为 CSS 动画、pointer-events:none，不阻拦阅读和鼠标。
* 场景渲染、旋转、悬停及 Agent 内核代码均未修改。
