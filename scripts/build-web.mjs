import { cp, mkdir, access } from 'node:fs/promises';

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
console.log('JALANKU web assets copied to www/. Original source files were not modified.');
