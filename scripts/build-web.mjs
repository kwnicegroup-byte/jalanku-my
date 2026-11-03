import { cp, mkdir, access } from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';

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
// Load the native bridge before the app's inline navigation code runs.
const appScriptStart = '<script>\n(() => {';
const moduleAppScriptStart = '<script type="module">\nimport "./native-geolocation-bridge.js";\n(() => {';
if (!html.includes(appScriptStart)) {
  throw new Error('Could not find the main JALANKU app script to initialize native GPS before app startup');
}
const updated = html.replace(appScriptStart, moduleAppScriptStart);
await (await import('node:fs/promises')).writeFile(htmlPath, updated, 'utf8');

// Use the user-confirmed green JALANKU logo uploaded to this test branch.
const originalLogo = 'file_000000006e4c82119265d2825bc14356.png';
await access(originalLogo);
await mkdir('assets', { recursive: true });
await sharp(originalLogo).resize(1024, 1024, { fit: 'contain', background: '#087b45' }).png().toFile('assets/icon-only.png');
await sharp(originalLogo).resize(2732, 2732, { fit: 'contain', background: '#087b45' }).png().toFile('assets/splash.png');
// Replace the mobile app's copied PWA icons with the same confirmed logo.
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-512-maskable.png', 512]]) {
  await sharp(originalLogo).resize(size, size, { fit: 'contain', background: '#087b45' }).png().toFile(`www/${name}`);
}
console.log('Confirmed JALANKU logo applied to native launcher assets and mobile PWA icons.');
