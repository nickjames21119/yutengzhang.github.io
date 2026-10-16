# v7 最终验证 / Release Verification

## 变化范围

1. 主 Logo 恢复为带 3 个端点和 1 个交点的 Y，圆心跨度宽/高比 0.94，44 × 44 附近清晰可识别，提供全套 SVG 变体与 favicon。
2. 原来 26 个星点数量不变，提高暗夜显示可见度，使用错峰 CSS 关键帧和细小光晕；日间完全隐藏。遵循系统减少动画与网站动效暂停设置。
3. 增加 `interaction/ClickPulse.js`、`click-boot.js` 及 `v7.css`：左键点击有小金点扩散；超过 8px 的旋转拖拽不会触发；动画结束及超时均会回收节点。
4. 在 `v7.css` 移除城市外框、Canvas 外框与原来的矩形键盘焦点轮廓。无改动城市几何及绘制逻辑。

## 已完成检查

- Python 标准库 `unittest`：**89 项通过**（包括 15 项 v7 新增检查）。
- Node.js `node --test tests/*.test.mjs`：**62 项通过**；新 JS 均通过语法检查。
- 浏览器：实际构建后的双语 HTML、CSS 以及原始模块源码通过离线动态模块注入进行 Chromium 交互验证；城市实际运行 `canvas3d` CPU 兼容路径，保留 **20** 个资源缓冲；城市 hover 后 Agent 显示比例 **1**；拖拽仍更改四元数方向。
- 浏览器测得 26 个星点、`v7-star-twinkle` 动画，并确认同一点在不同时间的透明度确有变化；光点有 CSS 定义的可见峰值。
- 左键按下/松开产生 1 个扩散节点，约 1 秒内彻底清理；拖拽不产生节点。
- `city-experience`、`#city-canvas` 计算边框均为 `0px`；日间 `.site-night-sky` 为 `display:none`。
- Chromium 桌面 1440 × 900 和手机 390 × 844 无横向溢出、无 uncaught JavaScript error。
- 与 v5.1 确认参考哈希比较，13 个 `public/assets/scene/**/*.js` 模块完全一致；原 v6 内容和访客地图逻辑未改动。

## 局限

- 浏览器环境阻断实际网络导航，改用**真实源码离线注入**，并非 GitHub Pages 的公网端到端测试。
- 当前浏览器禁用 WebGL 硬件渲染；实际采用网站自带的 CPU `canvas3d` 兼容渲染。尚未在真实 GPU / 公网环境测量帧率。
- 未访问或配置任何真实 Cloudflare Worker/D1 账号，因此不宣称访客记录后端已上线。真实地图需一次性部署 Worker/D1，并配置 `data/visitors.json` 中 API 地址。
