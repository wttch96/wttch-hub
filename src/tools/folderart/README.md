# FolderArt · macOS 图标生成器

> 位于 `src/tools/folderart/` 的自包含小工具，通过导航站首页进入。

生成 macOS 文件夹 / 硬盘图标的网页工具。从 [iconfont.cn](https://www.iconfont.cn/search/index?searchType=icon) 搜索图标，叠加到底模板样式上，导出 **PNG（1024px）** 或 **ICNS（多尺寸）**。

参考项目：[folderart.christianvm.dev](https://folderart.christianvm.dev)。

## 功能

| 能力 | 说明 |
| --- | --- |
| 🖼️ 6 种底模板样式 | 文件夹（macOS 26 Tahoe / 经典 Big Sur）、硬盘（外置 / 移动 / 时间机器）、服务器（文件服务器） |
| 🎨 每样式 6 色 | 文件夹 6 色为色相旋转变体；硬盘为金属配色变体 |
| 🔍 iconfont 搜索 | 无需登录，服务端代理转发，支持线性/填充/扁平等风格过滤 + 分页 |
| 🖌 图标印制方式 | **原色** / **跟随模板色**（重着色）/ **黑白**（灰度）/ **钢印**（半透明灰镂空压印） |
| ✏️ 文字标签 | 可选，居中 + 字号自适应收缩 |
| 📤 图标来源 | iconfont 搜索点选、上传 PNG/JPG/SVG、直接粘贴 SVG 文本 |
| 💾 下载 | 1024×1024 PNG 或 ICNS（含 16/32/64/128/256/512/1024 七种尺寸） |

## 使用

导航站首页 →「📁 FolderArt 图标生成器」卡片，或直接访问 `/tools/folderart`。

1. **选底模板**：左侧「底模板」选样式（文件夹/硬盘/服务器）→ 再选颜色。
2. **选图标**：右侧「图标库 · iconfont」输入关键词搜索 → 点选；或上传 / 粘贴 SVG。
3. **调效果**：右侧「配置」设文字标签、印制方式、图标缩放。
4. **下载**：预览下方「下载 PNG」或「下载 ICNS」。

### 在 macOS 上使用 ICNS

下载 `.icns` 后，Finder 中选中文件夹 → `⌘I`（显示简介）→ 拖拽 `.icns` 到左上角图标即可。

## 技术实现

- **渲染**：1024×1024 `<canvas>` 合成。底模板 PNG → 图标（按样式约束缩放居中、可选重着色/灰度/钢印）→ 可选文字。
- **模板生成**：构建期 `scripts/generate-templates.mjs` 读取 [template-manifest.json](src/tools/folderart/config/template-manifest.json)，用 sharp 生成 `public/templates/` 下的 36 张 PNG（文件夹样式基于 folderify 基础图色相旋转，硬盘样式基于 macOS 系统图标）。
- **iconfont 代理**：浏览器不跨域，`/iconfont-api/**` 由 nginx（生产）或 Vite/Express（开发）转发到 `https://www.iconfont.cn/api/**`，注入 Referer/UA。搜索接口返回内联 SVG，**无需登录**；detail/download 接口需要登录但我们用不到。
- **ICNS 打包**：纯前端 `src/lib/icns.ts`，把 1024 canvas 缩放到 7 个标准尺寸，按 ICNS 格式（`icns` magic + 4CC chunk）打包。已用 `iconutil` 圆回验证。

### 目录

```
src/tools/folderart/
  index.vue            # 工具页布局（模板选择 + 预览 + 图标库 + 配置）
  components/          # TemplatePicker / LivePreview / IconSearch / IconResultCard / ControlsPanel / DownloadBar
  composables/         # useConfig(状态) / useFolderComposition(合成) / useIconFont(搜索) / useDownload
  config/template-manifest.json   # 样式·颜色·合成约束的单一数据源
```

## 开发

工具已自包含，不依赖其他工具（只用共享的 `src/lib/svg.ts` / `src/lib/icns.ts` / `src/lib/color.ts`）。

调整底模板样式或颜色：

1. 改 `template-manifest.json`（样式/颜色/合成约束）。
2. 有涉及模板图生成的变化时跑 `npm run generate-templates`。
3. `npm run dev` 看效果。

修改印制方式（钢印参数等）在 `src/lib/color.ts`。

## 验证

- `npm run typecheck`
- 生产构建 `npm run build` 后，工具在 `/tools/folderart` 下 **8/8 端到端自测通过**（`scripts/smoke-e2e.mjs`）。
- 产物校验：PNG `sips -g pixelWidth -g pixelHeight x.png`（应为 1024）；ICNS `file x.icns`（应报 "Mac OS X icon"）。

## 版权说明

- 文件夹基础图来自 [lgarron/folderify](https://github.com/lgarron/folderify)（MIT）。
- 硬盘/服务器模板源自 macOS 系统图标（取自 [christianvmm/folderart](https://github.com/christianvmm/folderart)），个人使用没问题，商用请替换为自绘模板。
- 图标版权归 iconfont.cn 各上传者所有，请遵守其使用条款。
