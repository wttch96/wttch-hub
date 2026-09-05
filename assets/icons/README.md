<!--
  文件说明：记录 Hub 图标设计、资源用途、生成提示词与重新生成各平台图标的操作方式。
-->

# wttch-hub 图标

设计：蓝色圆角工作台 + 明亮的 H；两条立柱代表工作区，中央横桥代表工具、插件与 AI 的汇聚。

- `hub-master.png`：内置 image_gen 生成的原始图片，保留 alpha。
- `hub.png`：1024×1024 应用/Dock 图标。
- `hub.ico`：Windows 窗口、任务栏、托盘和安装器，多尺寸 16/24/32/48/64/128/256。
- `hub.icns`：macOS 安装包/Finder 图标，包含 Retina 尺寸。
- `hubTemplate.png` / `hubTemplate@2x.png`：16×16、32×32 黑色透明 H 模板，72/144 DPI，交给 macOS 自动适配深浅菜单栏。
- `public/hub-icon.png`：开发浏览器页签图标。

macOS 模板是同一标志的代码绘制简化版，不使用彩色大图直接缩小，保证菜单栏小尺寸可辨识。执行 `npm run build:icons` 可从主图重建分发文件（素材转换需 macOS sips；普通 Windows/macOS 打包不需要运行该命令）。Forge 将图标复制到 `Resources/icons`，保留 Template 与 @2x 文件名。

生成方式：内置 image_gen，未使用 API/CLI fallback。主图最终提示词：

> Use case: logo-brand. Create a final production app icon for wttch-hub, a desktop workbench that brings tools, plugins and AI together. Single centered square app icon, 1024x1024. A precise rounded-square dark ocean-blue tile with restrained blue depth and a soft luminous cobalt center, modern native desktop aesthetic. The symbol is a very bold geometric capital H, formed from two thick upright rounded rectangular pillars joined by a thick central horizontal bridge, conveying a central hub connecting two workspaces. Symbol in bright near-white with a very subtle cool cyan highlight. Simple clean silhouette, wide clear negative spaces above and below the central bridge so the H remains readable at 16 pixels. Frontal flat orthographic view. Large mark centered with generous but not excessive margins, polished minimal material shading, no perspective. The squircle fills around 86 percent of image width, with truly transparent alpha outside it. No words, no caption, no other letters, no border frame, no extra symbols, no mockup, no watermark. One icon only.
