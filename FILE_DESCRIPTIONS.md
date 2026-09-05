<!-- 文件说明：列出无法加入文件头注释的配置与二进制资源，补充其用途和维护方式。 -->

# 无法添加文件头注释的文件

支持注释的源码、配置、脚本、测试、样式和文档已在文件头说明用途。以下文件保持原始格式，避免破坏解析、图像或压缩包结构。依赖目录、Git 内部文件和构建产物不属于项目维护源码，不作修改。

| 文件 | 用途 |
| --- | --- |
| `.eslintrc.json` | ESLint 规则与解析器配置，保持 JSON 格式兼容工具链。 |
| `assets/icons/hub-master.png` | AI 生成的原始 Hub 图标母版。 |
| `assets/icons/hub.icns` | macOS 应用安装包与 Finder 图标。 |
| `assets/icons/hub.ico` | Windows 多尺寸应用、托盘及安装器图标。 |
| `assets/icons/hub.png` | 1024 像素彩色应用图标，供窗口和 Dock 使用。 |
| `assets/icons/hubTemplate.png` | macOS 菜单栏单色模板图标。 |
| `assets/icons/hubTemplate@2x.png` | macOS Retina 菜单栏单色模板图标。 |
| `package-lock.json` | 锁定 npm 依赖版本、完整性及依赖树，由 npm 维护，不手动加入注释。 |
| `package.json` | 项目名称、版本、依赖和 npm 脚本清单；npm 按严格 JSON 读取。 |
| `plugins/wttch-hub@plugins-1.0.0.zip` | 可分发的插件源码集合包；内容由 scripts/pack-plugins.ts 生成，不直接修改压缩包。 |
| `public/hub-icon.png` | 网页标签页使用的 Hub 图标。 |
| `public/templates/drive-external/gold.png` | 图标生成器的底板图片：模板 drive-external，变体 gold。 |
| `public/templates/drive-external/green.png` | 图标生成器的底板图片：模板 drive-external，变体 green。 |
| `public/templates/drive-external/purple.png` | 图标生成器的底板图片：模板 drive-external，变体 purple。 |
| `public/templates/drive-external/red.png` | 图标生成器的底板图片：模板 drive-external，变体 red。 |
| `public/templates/drive-external/silver.png` | 图标生成器的底板图片：模板 drive-external，变体 silver。 |
| `public/templates/drive-external/teal.png` | 图标生成器的底板图片：模板 drive-external，变体 teal。 |
| `public/templates/drive-file-server/gold.png` | 图标生成器的底板图片：模板 drive-file-server，变体 gold。 |
| `public/templates/drive-file-server/green.png` | 图标生成器的底板图片：模板 drive-file-server，变体 green。 |
| `public/templates/drive-file-server/purple.png` | 图标生成器的底板图片：模板 drive-file-server，变体 purple。 |
| `public/templates/drive-file-server/red.png` | 图标生成器的底板图片：模板 drive-file-server，变体 red。 |
| `public/templates/drive-file-server/slate.png` | 图标生成器的底板图片：模板 drive-file-server，变体 slate。 |
| `public/templates/drive-file-server/teal.png` | 图标生成器的底板图片：模板 drive-file-server，变体 teal。 |
| `public/templates/drive-removable/gold.png` | 图标生成器的底板图片：模板 drive-removable，变体 gold。 |
| `public/templates/drive-removable/green.png` | 图标生成器的底板图片：模板 drive-removable，变体 green。 |
| `public/templates/drive-removable/purple.png` | 图标生成器的底板图片：模板 drive-removable，变体 purple。 |
| `public/templates/drive-removable/red.png` | 图标生成器的底板图片：模板 drive-removable，变体 red。 |
| `public/templates/drive-removable/silver.png` | 图标生成器的底板图片：模板 drive-removable，变体 silver。 |
| `public/templates/drive-removable/teal.png` | 图标生成器的底板图片：模板 drive-removable，变体 teal。 |
| `public/templates/drive-time-machine/gold.png` | 图标生成器的底板图片：模板 drive-time-machine，变体 gold。 |
| `public/templates/drive-time-machine/green.png` | 图标生成器的底板图片：模板 drive-time-machine，变体 green。 |
| `public/templates/drive-time-machine/purple.png` | 图标生成器的底板图片：模板 drive-time-machine，变体 purple。 |
| `public/templates/drive-time-machine/red.png` | 图标生成器的底板图片：模板 drive-time-machine，变体 red。 |
| `public/templates/drive-time-machine/silver.png` | 图标生成器的底板图片：模板 drive-time-machine，变体 silver。 |
| `public/templates/drive-time-machine/teal.png` | 图标生成器的底板图片：模板 drive-time-machine，变体 teal。 |
| `public/templates/folder-bigsur/blue.png` | 图标生成器的底板图片：模板 folder-bigsur，变体 blue。 |
| `public/templates/folder-bigsur/green.png` | 图标生成器的底板图片：模板 folder-bigsur，变体 green。 |
| `public/templates/folder-bigsur/purple.png` | 图标生成器的底板图片：模板 folder-bigsur，变体 purple。 |
| `public/templates/folder-bigsur/red.png` | 图标生成器的底板图片：模板 folder-bigsur，变体 red。 |
| `public/templates/folder-bigsur/teal.png` | 图标生成器的底板图片：模板 folder-bigsur，变体 teal。 |
| `public/templates/folder-bigsur/yellow.png` | 图标生成器的底板图片：模板 folder-bigsur，变体 yellow。 |
| `public/templates/folder-classic/black.png` | 图标生成器的底板图片：模板 folder-classic，变体 black。 |
| `public/templates/folder-classic/dark.png` | 图标生成器的底板图片：模板 folder-classic，变体 dark。 |
| `public/templates/folder-classic/gray.png` | 图标生成器的底板图片：模板 folder-classic，变体 gray。 |
| `public/templates/folder-classic/green.png` | 图标生成器的底板图片：模板 folder-classic，变体 green。 |
| `public/templates/folder-classic/light.png` | 图标生成器的底板图片：模板 folder-classic，变体 light。 |
| `public/templates/folder-classic/lime.png` | 图标生成器的底板图片：模板 folder-classic，变体 lime。 |
| `public/templates/folder-classic/orange.png` | 图标生成器的底板图片：模板 folder-classic，变体 orange。 |
| `public/templates/folder-classic/purple.png` | 图标生成器的底板图片：模板 folder-classic，变体 purple。 |
| `public/templates/folder-classic/red.png` | 图标生成器的底板图片：模板 folder-classic，变体 red。 |
| `public/templates/folder-classic/yellow.png` | 图标生成器的底板图片：模板 folder-classic，变体 yellow。 |
| `public/templates/folder-tahoe/blue.png` | 图标生成器的底板图片：模板 folder-tahoe，变体 blue。 |
| `public/templates/folder-tahoe/green.png` | 图标生成器的底板图片：模板 folder-tahoe，变体 green。 |
| `public/templates/folder-tahoe/purple.png` | 图标生成器的底板图片：模板 folder-tahoe，变体 purple。 |
| `public/templates/folder-tahoe/red.png` | 图标生成器的底板图片：模板 folder-tahoe，变体 red。 |
| `public/templates/folder-tahoe/teal.png` | 图标生成器的底板图片：模板 folder-tahoe，变体 teal。 |
| `public/templates/folder-tahoe/yellow.png` | 图标生成器的底板图片：模板 folder-tahoe，变体 yellow。 |
| `public/templates/folder-windows11/default.png` | 图标生成器的底板图片：模板 folder-windows11，变体 default。 |
| `public/templates/folder-windows11/pink.png` | 图标生成器的底板图片：模板 folder-windows11，变体 pink。 |
| `src/tools/folderart/config/template-manifest.json` | 图标合成模板清单，记录样式、变体和图标放置约束。 |
| `tsconfig.json` | TypeScript 编译和类型检查选项，保持现有 JSON 配置格式。 |
