/**
 * PWAアイコン生成スクリプト
 *
 * 実行方法: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVGファイルを読み込み
const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

// 生成するアイコンサイズ
const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
];

console.log('PWAアイコンを生成中...\n');

for (const { size, name } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, name));
  console.log(`✓ ${name} (${size}x${size})`);
}

// favicon.icoの生成（複数サイズを含む）
// sharpはico形式を直接サポートしていないため、32x32 PNGをコピーとして使用
// 本番環境では実際のicoジェネレーターを使用することを推奨
const favicon32 = await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toBuffer();
writeFileSync(join(publicDir, 'favicon.ico'), favicon32);
console.log('✓ favicon.ico (32x32)');

console.log('\n完了！');
