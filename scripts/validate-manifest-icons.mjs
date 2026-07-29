import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'public', 'manifest.json');
const distManifestPath = path.join(root, 'dist', 'manifest.json');
const indexPath = path.join(root, 'index.html');
const distIndexPath = path.join(root, 'dist', 'index.html');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];

for (const field of ['name', 'short_name', 'description', 'start_url', 'scope', 'display', 'theme_color', 'background_color']) {
  if (!manifest[field]) errors.push(`manifest missing ${field}`);
}

if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) errors.push('manifest must include 192 and 512 icons');

for (const icon of manifest.icons || []) {
  if (!icon.src?.startsWith('/')) errors.push(`icon must be local absolute path: ${icon.src}`);
  if (icon.src?.startsWith('http')) errors.push(`icon must not use CDN: ${icon.src}`);
  if (icon.type !== 'image/png') errors.push(`icon must declare image/png: ${icon.src}`);

  const publicPath = path.join(root, 'public', icon.src.replace(/^\//, ''));
  const distPath = path.join(root, 'dist', icon.src.replace(/^\//, ''));
  if (!fs.existsSync(publicPath)) errors.push(`missing public icon ${icon.src}`);
  if (!fs.existsSync(distPath)) errors.push(`missing dist icon ${icon.src}`);

  if (fs.existsSync(publicPath)) {
    const dimensions = readPngDimensions(publicPath);
    const declared = String(icon.sizes).split('x').map(Number);
    if (dimensions.width !== declared[0] || dimensions.height !== declared[1]) {
      errors.push(`icon ${icon.src} is ${dimensions.width}x${dimensions.height}, declared ${icon.sizes}`);
    }
  }
}

const index = fs.readFileSync(indexPath, 'utf8');
if (!index.includes('lang="cs"')) errors.push('index.html must declare lang="cs"');
if (!index.includes('rel="apple-touch-icon" href="/icon-192.png"')) errors.push('apple-touch-icon must use local icon-192.png');
if (index.includes('maximum-scale') || index.includes('user-scalable=no')) errors.push('viewport must not block zoom');

if (fs.existsSync(distIndexPath)) {
  const distIndex = fs.readFileSync(distIndexPath, 'utf8');
  if (distIndex.includes('cdn.tailwindcss.com') || distIndex.includes('esm.sh')) {
    errors.push('dist index must not include external Tailwind or import-map CDN');
  }
}
if (!fs.existsSync(distManifestPath)) errors.push('dist manifest missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Manifest icons OK: ${manifest.icons.length} icons`);

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${filePath} is not PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}
