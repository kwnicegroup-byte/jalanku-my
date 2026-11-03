import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Keep the existing web app's navigator.geolocation calls intact,
// while routing native Android/iOS builds through the Capacitor plugin.
if (Capacitor.isNativePlatform() && typeof navigator !== 'undefined') {
  const watches = new Map();
  let nextWatchId = 1;

  const toBrowserPosition = (position) => ({
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? null,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null
    },
    timestamp: position.timestamp ?? Date.now()
  });

  const nativeGeolocation = {
    async getCurrentPosition(success, error, options = {}) {
      try {
        await Geolocation.requestPermissions();
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 15000,
          maximumAge: options.maximumAge ?? 0
        });
        success(toBrowserPosition(position));
      } catch (err) {
        if (typeof error === 'function') error(err);
      }
    },

    watchPosition(success, error, options = {}) {
      const localId = nextWatchId++;
      Geolocation.requestPermissions()
        .then(() => Geolocation.watchPosition({
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 15000,
          maximumAge: options.maximumAge ?? 2000
        }, (position, err) => {
          if (err) {
            if (typeof error === 'function') error(err);
            return;
          }
          if (position && typeof success === 'function') success(toBrowserPosition(position));
        }))
        .then((nativeId) => {
          if (nativeId) watches.set(localId, nativeId);
        })
        .catch((err) => {
          if (typeof error === 'function') error(err);
        });
      return localId;
    },

    clearWatch(localId) {
      const nativeId = watches.get(localId);
      if (nativeId) {
        Geolocation.clearWatch({ id: nativeId }).catch(() => {});
        watches.delete(localId);
      }
    }
  };

  try {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: nativeGeolocation
    });
  } catch (err) {
    console.error('JALANKU native geolocation bridge could not attach', err);
  }
}
