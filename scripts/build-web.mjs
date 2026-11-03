import { cp, mkdir, access } from 'node:fs/promises';
import { build } from 'esbuild';

const files = [
  'index.html',
  'manifest.json',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png'
];

await mkdir('www', { recursive: true });
for (const file of files) {
  try {
    await access(file);
  } catch {
    if (file.startsWith('icon-')) {
      console.warn(`Optional icon not found yet: ${file}`);
      continue;
    }
    throw new Error(`Required JALANKU web file is missing: ${file}`);
  }
  await cp(file, `www/${file}`);
}

// Bundle the native-only Capacitor Geolocation bridge locally.
// The original index.html and the production web app remain unchanged.
await build({
  entryPoints: ['native-geolocation-bridge.js'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ['es2020'],
  outfile: 'www/native-geolocation-bridge.js'
});

const htmlPath = 'www/index.html';
const html = await (await import('node:fs/promises')).readFile(htmlPath, 'utf8');
const bridgeTag = '<script type="module" src="./native-geolocation-bridge.js"></script>';
if (!html.includes(bridgeTag)) {
  const updated = html.replace('</head>', `  ${bridgeTag}\\n</head>`);
  if (updated === html) throw new Error('Could not inject native geolocation bridge into mobile copy of index.html');
  await (await import('node:fs/promises')).writeFile(htmlPath, updated, 'utf8');
}

// Prepare the existing JALANKU PWA icon as the source for native launcher icons.
await mkdir('assets', { recursive: true });
await cp('icon-512.png', 'assets/icon-only.png');
console.log('JALANKU web assets, native geolocation bridge and original launcher icon source prepared.');
