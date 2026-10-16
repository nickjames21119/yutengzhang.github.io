# 访客地图部署与验证

本包包含完整前后端实现，但没有使用你的账号创建云资源，也没有收集真实访客。地图默认空白不是占位造假：必须先部署记录接口和数据库，然后有人同意共享区域，才出现实际访问点。

## 1. 记录什么

使用 Cloudflare 为请求提供的网络位置元数据，不调用访客 GPS 或客户端第三方 GeoIP。经纬度归入 **2° × 2° 网格**；前台显示网格中心、国家/地区和聚合计数，不显示原始 IP。纬度方向 2° 约两百公里量级，因此不要把这些点当作家庭地址、精确城市或当前 GPS 位置。

应用只保存两类数据：日去重表保存日期、HMAC 标识、国家/地区和网格中心；聚合表保存日期、网格与计数。去重表使用带密钥的 HMAC-SHA256，输入为 UTC 日期与 IP，保留今天和昨天，约 24–48 小时；区域统计保留 90 天。每天 00:15 UTC 的 Cron 清理历史。密钥存在服务端 secret，不进入 GitHub 或网页。

同一个网络 IP 在同一 UTC 日计一次。共享 Wi-Fi 下多个人可能合并；同一个人跨网络或跨日可能重复。这不是独立人数指标。VPN、运营商出口和 IP 数据误差会影响地图。公开接口最多返回前 1500 个网格聚合，数量很大的站点需要分页扩展。

默认需要访客明确同意，选择在本机保存 180 天；同意之后的再次打开会尝试自动记一笔，服务端按日去重。未同意、拒绝、DNT 或 GPC 时不发送记录请求。点击隐私选项可改变后续记录偏好。改变偏好不会从不可逐人区分的聚合计数中反向撤销历史。

本应用代码不保存原始 IP，不表示托管平台不处理 IP。连接日志、账户日志与平台留存应单独检查。这份配置是最小化采集的技术实现，不是对任何司法辖区合规性的保证。

## 2. 推荐：同一个 Worker 托管前端与 API

Cloudflare Workers 支持 Static Assets，D1 用于持久化 SQL 数据。对应官方配置与命令见文末来源。

需要你的 Cloudflare 账号、Python 3.10+、受 Wrangler 支持的 Node.js 环境。本项目测试使用 Node.js 22。Wrangler 当前官方系统范围是 Windows 11、macOS 13.5+ 或满足其 Linux 要求的环境；Windows 10 可以继续用 Python 查看网页，云端发布可用满足要求的 WSL/Linux，或者后面的 GitHub Actions 方式。

### 2.1 登录并创建数据库

在源码根目录执行：

```powershell
npx wrangler@4 login
npx wrangler@4 d1 create yuteng-visitors
```

复制返回的数据库 UUID。下一条中的 `YOUR_D1_UUID` 替换为实际值，不要照抄占位符：

```powershell
python scripts/configure_visitors.py --database-id YOUR_D1_UUID
```

此脚本只验证并修改本地配置，不创建资源、不设置 secret、不部署。默认保留 `data/visitors.json` 的 `apiBase: "./api"`，同源不需要额外允许域名。

### 2.2 建表、构建并部署

```powershell
npx wrangler@4 d1 migrations apply yuteng-visitors --remote
python scripts/build.py
npx wrangler@4 deploy
```

确认 Wrangler 提示的迁移操作。`--remote` 表示你的云端数据库。不要把开发模拟数据导入生产库。

`deploy` 输出实际访问网址。在下一步设置 secret 之前，网页能打开，但 POST 记录接口返回未配置；这是保护性行为。

### 2.3 设置私密 HMAC 密钥

本机生成足够长的随机值：

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
npx wrangler@4 secret put VISITOR_SECRET
```

把随机值粘贴到 Wrangler 的交互输入中，妥善保管。不要发到聊天、写入 `profile.json`、`visitors.json`、公开仓库或命令示例。`secret put` 将更新 Worker secret 并使其可用；应用要求至少 32 个字符。

可用以下命令检查 secret 名称，不会显示值：

```powershell
npx wrangler@4 secret list
```

更换密钥会改变去重标识；同一天频繁轮换可能把原本已经计数的网络再算一次。

### 2.4 配置正式站点地址

确认发布网址后，可在 `data/profile.json` 的 `siteUrl` 写入实际 HTTPS 地址，再构建发布：

```powershell
python scripts/build.py
npx wrangler@4 deploy
```

这用于 canonical 与 sitemap，不决定 API 数据库绑定。没有购买自定义域名也可使用 Wrangler 分配的访问网址；实际可用性以部署结果为准。

## 3. 保留 GitHub Pages 网址

GitHub Pages 是静态网站托管，不运行此 Worker，也不替你持久化这些统计。可以保留现有主页地址，只把访客接口托管在 Cloudflare。

先完成第 2 节，得到真实 Worker 地址。然后执行以下配置，替换示例域名：

```powershell
python scripts/configure_visitors.py --api-base "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/api" --allow-origin "https://YOUR-GITHUB-USERNAME.github.io"
python scripts/build.py
npx wrangler@4 deploy
```

`--allow-origin` 只填浏览器 Origin（协议 + 域名 + 可选端口），不要添加仓库路径、`/api` 或页面名。多个前端域名可重复 `--allow-origin`。自定义域名也需明确列入。不要使用通配符代替允许列表。

把重新构建的静态站点发布到 GitHub Pages；包内 `.github/workflows/pages.yml` 可在设置 Pages Source 为 GitHub Actions 后使用。上传时保留 `.github/` 隐藏目录。

对仅静态部署包，必须先在完整源码包中完成 API 地址配置和构建，再复制新的 `dist/`；旧静态 ZIP 不会自动更新。

恢复同源设置：

```powershell
python scripts/configure_visitors.py --api-base ./api --clear-origins
python scripts/build.py
npx wrangler@4 deploy
```

## 4. 可选：通过 GitHub Actions 部署完整服务

包内 `worker.yml` 仅有手动 `workflow_dispatch`，上传代码不会自动触发它。先在 Cloudflare 创建 D1 数据库，然后在 GitHub 仓库的 Actions secrets/variables 中设置：

| 类型 | 名称 | 内容 |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | 你为相应账户/Worker/D1 配置的部署令牌 |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | 账户 ID |
| Secret | `VISITOR_SECRET` | 你生成并保存的至少 32 字符随机密钥 |
| Variable | `CLOUDFLARE_D1_DATABASE_ID` | 已创建的数据库 UUID |
| Variable，可选 | `SITE_URL` | 正式网站 HTTPS 地址 |

在 Actions 中手动运行 **Deploy complete site and visitor service**。流程构建、测试、迁移、发布，再将 HMAC 密钥通过标准输入设置为 Worker secret。令牌必须按你账户的最小权限原则配置；这份工作流尚未连接实际云账号验证。

## 5. 第一次真实记录的检查

用普通浏览器打开已部署的站点，不是 `localhost` 或文件 URL。到页面底部：

1. 服务连通后，没有历史记录时显示 0，而不是 “service not connected”。
2. 在未启用 DNT/GPC 的测试浏览器中选择 “Share my region / 加入我的访问”。
3. 浏览器开发者工具 Network 中，`POST /api/visits` 应得到 `status: "ok"`；首次网络访问 `recorded: true`，同一网络同一天可能为 `false`。
4. `GET /api/visitors` 返回真实的 `points`、`total`，点会自动显示。地图在可见时约每 120 秒刷新，也会在成功提交后读取一次。

不要手动把示例点写入配置或数据库作为上线验证。测试用 mock 地点仅存在于 `tests/`，不会构建进网页。

## 6. 常见问题

| 现象 | 需要检查 |
|---|---|
| 本地地图没有访客 | Python 预览仅返回明确的未配置状态，不拥有边缘 IP 位置。符合预期。 |
| 服务未连接 / 503 | 是否绑定 D1、迁移完成、Worker 路径正确；POST 还要求 `VISITOR_SECRET`。 |
| 403 | Pages 或自定义域名的实际 Origin 是否在 `ALLOWED_ORIGINS` 内；不能把仓库路径当 Origin。 |
| status 为 skipped | 可能是隐私信号、明显机器人，或边缘未提供可用位置。不补造位置。 |
| 页面能打开但 POST 404 | 是否只发布静态文件，或 `/api/*` 没有进入 Worker。 |
| 点击后没有出现新点 | 同日同网络去重、VPN 同出口、地理数据不可用，或者正在查看其他数据库。 |
| 数据多于 90 天仍在库中 | 检查 Cron 是否已部署；GET 始终只返回近 90 天，物理清理另由 Cron 执行。 |
| 忘记变更用户选择 | 地图右侧 Privacy settings 可重新选择；也可清理本机 `yz-visitor-choice-v1`。 |

接口有请求来源检查、固定 JSON 输入、256 字节大小限制、每日 IP 去重、错误脱敏和明显机器人过滤。**CORS 不是身份认证，公开统计也不是反作弊系统。** 公开站点应另设平台限流、防滥用规则与费用提醒。代码提供 `VISIT_LIMITER` 可选 binding 挂钩，但没有替你开通该资源，也不保证永远零费用。

## 7. 后续版本管理

此包使用 `npx wrangler@4` 避免影响纯 Python 预览，并限定主版本；并未把某个 Wrangler 小版本伪装成已实测依赖。首次成功部署后，可在本机安装并锁定实际使用版本，提交 `package-lock.json` 以复现工具链。不要提交 `.dev.vars`、`.env`、`.wrangler/`、数据库文件或任何真实访客导出。

修改统计精度或留存时，要同步改 `backend/worker.js`、地图说明、前端周期文案与测试。关闭地图：`data/visitors.json` 中 `enabled` 改为 `false` 后重建；同时停用或删除后端资源，避免仅隐藏界面却继续保留服务。

## 官方参考（2026-10-15 查阅）

- Static Assets 与 API 路由：<https://developers.cloudflare.com/workers/static-assets/binding/>
- 边缘位置字段：<https://developers.cloudflare.com/workers/examples/geolocation-hello-world/>
- D1 创建与绑定：<https://developers.cloudflare.com/d1/get-started/>
- D1 迁移：<https://developers.cloudflare.com/d1/wrangler-commands/>
- Worker secrets：<https://developers.cloudflare.com/workers/wrangler/commands/workers/>
- Wrangler 环境要求：<https://developers.cloudflare.com/workers/wrangler/install-and-update/>
- GitHub Pages：<https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages>

本手册中的发布步骤基于官方接口，未在你的账户上执行。平台界面、配额和命令细节可能继续变化。
