import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let xml = await readFile(manifestPath, 'utf8');

const requiredPermissions = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION'
];

for (const permission of requiredPermissions) {
  const declaration = `    <uses-permission android:name="${permission}" />`;
  if (!xml.includes(`android:name="${permission}"`)) {
    const applicationTag = /\s*<application\b/;
    if (!applicationTag.test(xml)) {
      throw new Error('AndroidManifest.xml has no <application> tag; cannot safely add location permissions.');
    }
    xml = xml.replace(applicationTag, `\n${declaration}\n\n    <application`);
  }
}

await writeFile(manifestPath, xml, 'utf8');
const check = await readFile(manifestPath, 'utf8');
for (const permission of requiredPermissions) {
  if (!check.includes(`android:name="${permission}"`)) {
    throw new Error(`Required Android location permission was not written: ${permission}`);
  }
}
console.log('Verified Android coarse and fine location permissions in AndroidManifest.xml.');
