/**
 * 文件说明：将图标母版转换为应用和托盘所需的 PNG、ICO、ICNS 及 macOS 模板图标，生成可分发资源。
 */

/**
 * 将生成的主图转换为应用图标，并绘制同一 H 标志的纯色菜单栏版本。
 * 转换只在素材更新时运行（需要 macOS sips）；生成物提交仓库，
 * Windows/macOS 打包直接读取它们，不依赖开发机上的图像转换命令。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const icons = path.join(root, 'assets/icons');
const temporary = mkdtempSync(path.join(tmpdir(), 'wttch-hub-icons-'));
const resize = (size, output) => execFileSync('sips', ['-z', String(size), String(size), path.join(icons, 'hub-master.png'), '--out', output], { stdio: 'ignore' });
const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const name = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4); data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return output;
};

/** 用几何 H 的透明轮廓生成模板 PNG；保留 alpha，系统会按菜单栏主题自动着色。 */
const templatePng = (size) => {
  const scale = size / 16;
  const roundedRect = (x, y, left, top, width, height, radius) => {
    const dx = Math.max(left + radius - x, 0, x - (left + width - radius));
    const dy = Math.max(top + radius - y, 0, y - (top + height - radius));
    return dx * dx + dy * dy <= radius * radius;
  };
  const contains = (x, y) => roundedRect(x, y, 2, 2, 4, 12, 1.5)
    || roundedRect(x, y, 10, 2, 4, 12, 1.5) || roundedRect(x, y, 5, 6.5, 6, 3, .8);
  const scanlines = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    let coverage = 0;
    // 四倍超采样只计算边缘覆盖率，RGB 始终为黑，避免半透明边缘带上彩色光晕。
    for (let sy = 0; sy < 4; sy += 1) for (let sx = 0; sx < 4; sx += 1) {
      if (contains((x + (sx + .5) / 4) / scale, (y + (sy + .5) / 4) / scale)) coverage += 1;
    }
    scanlines[y * (1 + size * 4) + 1 + x * 4 + 3] = Math.round(255 * coverage / 16);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  const density = Buffer.alloc(9); density.writeUInt32BE(Math.round(72 * scale / .0254), 0); density.writeUInt32BE(Math.round(72 * scale / .0254), 4); density[8] = 1;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('pHYs', density), chunk('IDAT', deflateSync(scanlines)), chunk('IEND', Buffer.alloc(0))]);
};
try {
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  for (const size of sizes) resize(size, path.join(temporary, `${size}.png`));
  copyFileSync(path.join(temporary, '1024.png'), path.join(icons, 'hub.png'));
  // ICO 目录内嵌多尺寸 PNG，系统托盘、任务栏和安装器可选取匹配缩放比例的图像。
  const icoSizes = sizes.filter((size) => size <= 256);
  const header = Buffer.alloc(6 + icoSizes.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(icoSizes.length, 4);
  let offset = header.length;
  const images = icoSizes.map((size, index) => {
    const image = readFileSync(path.join(temporary, `${size}.png`));
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size; header[entry + 1] = header[entry];
    header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
    return image;
  });
  writeFileSync(path.join(icons, 'hub.ico'), Buffer.concat([header, ...images]));
  // ICNS 与项目已有的浏览器导出器采用同一种 PNG chunk 封装，
  // 不依赖 iconutil 的系统编码服务，便于在受限的构建环境中稳定生成。
  const icnsChunks = [['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024], ['ic11', 32], ['ic12', 64], ['ic13', 256], ['ic14', 512]].map(([type, size]) => {
    const png = readFileSync(path.join(temporary, `${size}.png`));
    const entry = Buffer.alloc(8); entry.write(type, 0); entry.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([entry, png]);
  });
  const icnsHeader = Buffer.alloc(8); icnsHeader.write('icns', 0); icnsHeader.writeUInt32BE(8 + icnsChunks.reduce((total, entry) => total + entry.length, 0), 4);
  writeFileSync(path.join(icons, 'hub.icns'), Buffer.concat([icnsHeader, ...icnsChunks]));
  writeFileSync(path.join(icons, 'hubTemplate.png'), templatePng(16));
  writeFileSync(path.join(icons, 'hubTemplate@2x.png'), templatePng(32));
  copyFileSync(path.join(temporary, '32.png'), path.join(root, 'public/hub-icon.png'));
  console.log('已生成 Hub PNG、ICO、ICNS 与 macOS Template 1x/2x 图标。');
} finally { rmSync(temporary, { recursive: true, force: true }); }
