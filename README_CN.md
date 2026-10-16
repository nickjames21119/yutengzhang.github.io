**当前版本：v8**。最新修改、部署及验证见 [START_HERE_V8_CN.md](START_HERE_V8_CN.md)。

**旧版本 v7**：历史更新说明参见 [START_HERE_V7_CN.md](START_HERE_V7_CN.md)。

> **v6 用户先阅读：** [START_HERE_V6_CN.md](START_HERE_V6_CN.md)。此文保留为历史版本参考。

> **最新版（v5.1）**：请先阅读 [START_HERE_CN.md](START_HERE_CN.md)。两段 About、星轨标识、浮动论文时间线和无长说明的地图已在此版实现。下面为原项目的参考说明。

# Yuteng Zhang 个人主页 v4

黑金 / 暖白双主题，指定卡通头像，单一地面上的三维城市与交通，悬停全息 Agent 网络，自定义鼠标，纯文字论文列表，以及有真实后端实现的访客地图。

**打开主页不需要账号、Node.js、npm 包或 LLM API。记录公网访客则需要部署包内的 Cloudflare Worker 和 D1 数据库，不能只上传 HTML。** 当前包未绑定任何云账号，也没有预置访客记录。

## 本地运行

Windows 完整解压，在 `yuteng-academic-site` 内双击 `run.bat`。需要 Python 3.10+。或者在项目根目录执行：

```powershell
python scripts/serve.py --open
```

安装了 Python Launcher 时也可以使用 `py -3 scripts/serve.py --open`。macOS / Linux 使用：

```bash
python3 scripts/serve.py --open
```

浏览器地址：`http://127.0.0.1:8000/`；中文版：`http://127.0.0.1:8000/zh.html`。

保持终端开启，按 Ctrl+C 停止。端口占用时执行 `python scripts/serve.py --port 8001 --open`。不要在 ZIP 内打开文件，也不要双击 `dist/index.html` 检查三维模块：ES 模块需要 HTTP/HTTPS。此预览服务器只供本机开发，不是公网生产服务器。

启动命令会先构建。修改源码之后执行 `python scripts/build.py`，再刷新浏览器；没有自动热更新。旧缓存可用 Ctrl+F5 清除。

## 本版交互

右侧只有城市，没有外框、说明段落、City/Agents 标签、机器人脸或缩放/暂停工具栏。街区建立在同一个地面上，建筑向上生长，交通沿道路、桥梁和高架运行。

未悬停时有慢速自转、轻微悬浮、窗灯与交通光流。悬停后建筑渐隐，保留淡淡空间轮廓，显露几何核心、轨道环、六个抽象智能体节点与动态连线；离开后渐变回城市。这是概念动画，不是实时交通或实际 LLM 运算。

按下时会锁住当前已经显露的视图，拖动过程不跳变：快速按下可旋转城市；等悬停过渡完成后按下，可旋转 Agent 场景。四元数轨迹球支持上下左右、背面和翻转。松手恢复悬停逻辑。手机轻触切换、拖动旋转。

键盘：Tab 聚焦画布；方向键旋转；Q/E 翻滚；空格显露 Agent；Home 复位；Escape 回到自动城市状态。画布不会劫持滚轮缩放。页面底部的“Reduce motion / 减少动态效果”是整站无障碍偏好，不是场景工具栏；系统减少动态效果设置也会生效。

鼠标采用本地 SVG 金色准星与轻微跟随光环，日间同步切换。文本输入有专用光标；触屏不显示桌面光环；高对比度模式退回系统指针。头像保持原图配色。

## 论文与内容

五篇成果、作者、发表/录用状态、教育经历、研究经历与 CV 沿用 v3。此更新未新增论文或重新核验其出版状态。论文列表不含左图、Cite 按钮、引用弹窗或索取链接；只有存在 URL 的条目才出现相应链接。搜索和筛选仍可用。内部 `.bib` 书目文件保留，页面不显示引用/导出入口。

历程标题为 **Path.**，联系标题为 **Let’s connect.**。正文、标题、头像、城市和段落间距已统一调整，测试宽度覆盖 360、390、768、1024 和 1440 像素。

## 访客地图

地图几何随网站本地打包，不调用在线地图瓦片服务。公网记录链路：

```text
访客同意 → POST /api/visits → Worker 接收边缘网络位置
        → 2° 粗网格 + 按日 HMAC 去重 → D1 持久化
        → GET /api/visitors → 世界地图聚合点与数量
```

默认明确同意后记录，并记住选择；DNT / GPC 会禁止记录。不调用浏览器 GPS。应用数据库不保存或公开原始 IP，而是保存粗略网格统计和短期去重标识。统计覆盖近 90 天，不等于独立自然人数，也不是精确城市定位。

**本地预览显示地图轮廓及“访客服务尚未连接”，这是正常状态。** 未配置数据库或网络失败时，计数为未知、没有虚构点。云端已连接但确实没有记录时才显示 0。

完整开通方式见 [docs/VISITOR_MAP_SETUP_CN.md](docs/VISITOR_MAP_SETUP_CN.md)。支持：

- 一个 Cloudflare Worker 同时托管网站与 API，D1 存储访问聚合。
- 继续使用 GitHub Pages 托管静态主页，另外部署 Worker + D1，仅把地图 API 地址指向 Worker。

只使用静态部署包也能浏览主页，但不能凭静态文件跨用户保存访问。

## 修改与扩展

| 内容 | 修改位置 |
|---|---|
| 个人简介、论文、经历、头像路径 | `data/profile.json` |
| 文案标题、导航与按钮译文 | `scripts/build.py` 中 `UI` |
| 街区、楼高、相机、Agent、动画速度 | `data/scene.json` |
| 访客开关、API 地址、刷新间隔 | `data/visitors.json` |
| 主题与基础动画 | `public/assets/experience.css` |
| v4 排版、字体比例与光标 | `public/assets/refinement.css` |
| 城市几何生成 | `public/assets/scene/geometry/urbanDistrict.js` |
| 全息 Agent 几何与光流 | `public/assets/scene/layers/AgentLayer.js` |
| 页面结构 | `templates/index.html` |
| 地图前端和后端 | `public/assets/visitors/`、`backend/` |

修改后运行：

```powershell
python scripts/build.py
```

不要只修改 `dist/`。它是自动生成的目录，重新构建会覆盖。新增图层接口和模块生命周期见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 测试与限制

最终 Python、JavaScript 和浏览器检查的数量、命令与范围见 [TEST_REPORT.md](TEST_REPORT.md)。截图由真实页面源码渲染，不是设计效果图。不过当前环境阻止浏览器访问本地 HTTP 页面，截图采用源码离线装载和 CPU 三维兼容模式。WebGL GPU 路径、Cloudflare 云端部署、真实访客位置与线上吞吐量均未实机验证。

Node.js 22+ 仅用于测试后端或部署。日常预览仅需 Python；首次运行 Wrangler 需要联网及 Cloudflare 授权。版本、系统要求和官方文档见 [TECHNICAL_REFERENCES.md](TECHNICAL_REFERENCES.md)。
