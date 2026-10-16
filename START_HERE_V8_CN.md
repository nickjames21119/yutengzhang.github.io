# Yuteng Zhang 个人学术主页 v8

**以 v7 完整源码为基础，严格只调整用户指定的七项细节，完整保留城市模型、Agent 悬停切换、四元数鼠标旋转、主题、News 独立时间线和访客地图。**

## v8 修改内容

1. **夜空**：黑金夜间模式下 26 个小而锐利的星点，其中 4 个有细十字星芒；不同步闪烁、缓慢漂移。无大面积模糊光斑；不盖住正文，不接受点击。日间隐藏，尊重系统 `prefers-reduced-motion` 与页脚 Reduce motion。
2. **Publication**：英文正文标题从 *Publications & accepted work* 改为 **Publication**，不再附带数量标签。
3. **THINKLab**：移除 About 下方的 THINKLab 外部链接（经历栏中作为真实研究经历的文字保留）。
4. **导师链接**：在 About 第一段原文的 `Prof. Jiawei Wang` 上直接添加下划线链接，中文 `王家伟教授` 同理；移除下方冗余独立链接栏。链接地址通过 `data/profile.json -> links.advisor` 维护。
5. **论文列表**：移除 All、First author、Transportation、Other 分类按钮及多余搜索栏；五篇论文完整展示，不改变发表／录用状态。
6. **Freight**：简述严格缩减为英文 `A benchmark.`，中文 `一项基准研究。`。论文标题保持原样。
7. **导航栏**：Y 节点 Logo 仍在左侧，右侧显示 `YUTENG ZHANG` 与 `Ph.D. student · HKUST (Guangzhou)`；原 `HKUST(GZ) / RESEARCH` 和头像上方重复身份行被移除。中文角色文字同步调整。

## 本地运行

需要 **Python 3.10 或更高版本**，浏览网站无须安装 pip/npm 依赖，也无须配置 API Key。

1. 完整解压 `Yuteng_Zhang_Homepage_v8_Source.zip`。
2. 在 `yuteng-academic-site` 中，Windows 双击 `run.bat`，或用 PowerShell 运行：

   ```powershell
   python scripts/serve.py --open
   ```

3. 浏览器访问 `http://127.0.0.1:8000/`，中文版本是 `http://127.0.0.1:8000/zh.html`。

macOS 或 Linux：

```bash
python3 scripts/serve.py --open
```

按 `Ctrl+C` 停止服务。不要直接通过 `file://` 打开三维场景，它依赖 JavaScript 模块路径。

## 修改源码后重新构建

```bash
python scripts/build.py
```

使用 `data/profile.json` 修改论文简介、About、院校、导师地址；`scripts/build.py` 管理中英 UI 标题，`templates/index.html` 管理页面结构，`public/assets/v8.css` 管理 v8 增量样式；`public/assets/stars/Starfield.js` 管理星光分布、数量和漂移参数。

**请勿只修改 `dist/`**，重新构建会覆盖生成文件。城市代码在 `public/assets/scene/`，本版没有改动。

## 发布到 github.io

推荐上传**源码包内 `yuteng-academic-site` 下的文件**至 GitHub 仓库根目录（包括 `.github/` 隐藏目录），提交到 `main` 分支，然后在 `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。后续 Push 会使用 `.github/workflows/pages.yml` 自动构建部署。

也可使用独立的静态包 `Yuteng_Zhang_Homepage_v8_GitHub_Pages_Static.zip`，将包内 `index.html`、`zh.html`、`assets/`、`.nojekyll` 等直接发布至 GitHub Pages 的静态站点根目录。

**访客地图提醒**：github.io 只能托管静态资源，不会自动记录访问 IP。要让地图显示真实粗略访客地区及闪烁光点，需要按 `GITHUB_PAGES_VISITOR_MAP_V6.md` 连接 Cloudflare Worker + D1 后端，并配置 `data/visitors.json`。后端源代码仍在 `backend/`。目前不能声称已连接真实统计；没有数据时不伪造访问记录，访客记录仍需要明确同意并尊重 DNT/GPC。

## 测试与边界

运行：

```bash
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.mjs
```

v8 已执行 Python 99 项与 Node.js 62 项测试，桌面 1440px 与手机 390/320px 的离线 Chromium 浏览器布局、文本、主题动画 CSS、链接及访客组件检查均通过。旧版较长的浏览器交互回归完成到前 67 项后超时，因此不计作完整通过；关键城市鼠标拖动、Agent 悬停、资源释放等前 61 项已得到验证。浏览器截图用 CPU 兼容三维渲染生成，没有验证生产 WebGL GPU 路径或实际 Cloudflare 部署。
