**提示：当前为 v7。** 优先阅读 `START_HERE_V7_CN.md`，旧文档保留为历史说明。

> **v6 用户先阅读：** [START_HERE_V6_CN.md](START_HERE_V6_CN.md)。此文保留为历史版本参考。

# 主页 v5.1：启动与 GitHub Pages 部署

## 本地运行（Windows）

解压整个源码 ZIP，进入 `yuteng-academic-site` 目录，双击 `run.bat`，或打开 PowerShell 执行：

```powershell
python scripts/serve.py --open
```

浏览器使用 `http://127.0.0.1:8000`。需要 Python 3.10+；不需要 Node 运行网页本身。请勿以 file:// 直接打开页面。

## 修改资料

`data/profile.json`：About、论文、时间线摘要、经历；`public/assets/v5-polish.css`：新排版；`scripts/build.py`：可编辑 SVG 品牌标识；`public/assets/favicon.svg`：匹配的站点图标。其他动画/地图源模块位于 `public/assets/scene/`、`public/assets/visitors/`；修改后运行：

```powershell
python scripts/build.py
```

## 发布到 GitHub Pages

将完整源项目根目录内容提交到 GitHub 仓库，仓库设置 `Settings → Pages → Build and deployment → GitHub Actions`；工作流 `.github/workflows/pages.yml` 自动构建部署。

## 访客地图（不可跳过的一次性设置）

**仅仅上传静态网页不能产生 IP 区域访问记录**，GitHub Pages 不运行后端。地图会保持空白点阵直到连接真实后端；这不是故障或虚构数据。

如需访问者同意后自动累计并闪烁显示区域光点：在 Cloudflare 创建 Worker + D1，设置 `VISITOR_SECRET` 与允许的 github.io origin，将 Worker API 的真实 HTTPS 地址写入 `data/visitors.json`（如 `https://YOUR-WORKER.workers.dev/api`），重新构建并提交。详尽步骤见 `GITHUB_PAGES_VISITOR_MAP_V5.md`，内含 Wrangler 命令与安全注意事项。地图默认遵循同意机制与 DNT/GPC；从 IP 推断的粗略区域并非准确 GPS 地址。

完整后端位于 `backend/worker.js` 和 `backend/migrations/0001_visitors.sql`。不能把私密 Cloudflare Token、`VISITOR_SECRET` 或 `dev.vars` 提交至公开仓库。
