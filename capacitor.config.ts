import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'my.jalanku.app',
  appName: 'JALANKU',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Geolocation: {
      permissions: {
        location: 'JALANKU uses your location to show your position and calculate navigation routes.'
      }
    }
  }
};

export default config;
