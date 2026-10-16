# Yuteng Zhang — Academic Homepage v6

## 更新说明

本版严格基于 `Yuteng_Zhang_Homepage_v5_1_Updated_Source(1).zip` 增量升级，保留三维城市场景原始 JavaScript 几何、渲染器、交互、Agent 过渡及数据配置。`tests/reference_city_v5_1_sha256.json` 固化了 13 个场景源代码的 SHA-256，以防后续误改。

### v6 变化
- **News 不与三维城市共栏**：现在是 Hero 正下方的独立黑金悬浮面板，按现有元数据列出 5 篇论文／录用信息，点击论文名滚动到 Publications。
- **姓名变体标识**：导航栏与 favicon 使用几何 YZ 一体化字母标识。真正可编辑矢量源是 `public/assets/brand-yz.svg`；申请前的单色对照文件与知识产权说明在 `branding/`。
- **学术链接**：Scholar、LinkedIn、GitHub 以图标加文字的小型入口放在 Hero 介绍下方。联系区保留冗余链接，方便从页面底部直接访问。
- **星光背景**：夜间固定显示 **26 个**淡金色、不同频率闪烁的微小星点。日间全隐藏，页面 Reduce motion 按钮可停止其动效；星层不捕获鼠标。
- **双语与维护**：About 仍保留用户确认的两段；右侧城市与访客地图保持独立模块，研究方向、已录用论文状态与链接规则延续 v5.1。

## 如何运行

### Windows

完整解压 `v6_Source.zip`；在 `yuteng-academic-site` 根目录运行：

```powershell
python scripts/serve.py --open
```

或者双击 `run.bat`。在浏览器访问 `http://127.0.0.1:8000/`。

### macOS / Linux

```bash
python3 scripts/serve.py --open
```

需要 Python 3.10+，本地前端预览不需要 Node/npm 或 API Key。建议始终走本地 HTTP 服务，不要在文件夹中直接双击 `dist/index.html`，否则三维模块无法加载。

## 维护入口

| 希望修改的内容 | 文件 |
|---|---|
| 个人介绍、论文字段、时间线日期、外部主页地址 | `data/profile.json` |
| News 面板布局、链接按钮、星星密度/颜色 | `public/assets/v6.css`、`public/assets/stars/Starfield.js` |
| Logo 形状（唯一网页源文件） | `public/assets/brand-yz.svg`；修改后要同步 favicon 和 `branding/` 备份 |
| 右侧城市 | `public/assets/scene/`、`data/scene.json`（**v6 未修改**） |
| 访客 IP 地图与区域聚合 | `public/assets/visitors/`、`data/visitors.json`、`backend/` |
| 网页 HTML | `templates/index.html` |

更改后执行：

```bash
python scripts/build.py
```

构建输出位于 `dist/`。**请编辑源文件而非直接编辑 `dist/`**，因为每次构建会重新生成 HTML 和资源文件。

## GitHub Pages 部署（无需公网服务器托管静态内容）

源码 ZIP 中已有 `.github/workflows/pages.yml`，其 `main` 分支 push 自动构建 `dist` 并部署到 GitHub Pages。

1. 把解压后的 `yuteng-academic-site` **内部全部内容**（包括隐藏的 `.github` 目录）上传到 GitHub 仓库根目录，提交到 `main`。
2. 到 `Settings → Pages → Build and deployment`，Source 选择 **GitHub Actions**。
3. 等待 `Actions` 中的 build / deploy 成功，访问 `https://USERNAME.github.io/REPOSITORY/` 或用户主页仓库对应地址。
4. 如只想使用静态文件，`v6_GitHub_Pages_Static.zip` 里 `index.html` 已在 ZIP 根目录；把这些文件放到网站根目录即可。**不能将静态 ZIP 当作源码仓库去运行 pages.yml。**

### 访客地图的数据源仍需单独部署

GitHub Pages **不能自己运行保存 IP 归属地区、访客聚合的后端**。本版已包括 Cloudflare Worker + D1 代码；应按 `GITHUB_PAGES_VISITOR_MAP_V6.md` 进行一次性部署，再用脚本设置 HTTPS API 地址。完成后继续使用 github.io，后续无须本地运行服务。没有接通服务时地图不会制造虚构访问点。访客经明确同意后记录粗粒度 IP 区域，数据库不保存原始 IP（托管商本身可能有网络日志）。

## 质量验证

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/*.test.mjs
```

Node.js 仅用于 JS 测试与可选的 Cloudflare 部署，不是本地浏览网页的依赖。测试记录见 `TEST_REPORT_V6.md`。

## Logo 申请建议

见 `branding/README_IP_CN.md`。向中国或美国申请法律保护之前先做近似图形检索和权属核查。抽象品牌 logo 更常见的保护路径是商标；外观设计专利针对适当的产品或 GUI 外观，不能保证纯 Logo 独立获得授权。品牌设计文件不是法定专利申请图样。
