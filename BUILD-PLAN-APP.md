# JALANKU Cross-platform App Build Plan

## Safety boundary
- This work is isolated on branch `app-shell-preview`.
- Production branch `main` and the GitHub Pages website are not changed by this scaffold.
- No changes to the existing navigation logic are included.
- Do not merge this branch into `main` until device tests and review pass.

## Current scaffold
- Capacitor 7 shell for Android and iOS.
- App display name: JALANKU.
- Provisional app ID: `my.jalanku.app`. Confirm a permanent reverse-domain identifier before store submission; changing it after publication is difficult.
- Web build copies the existing `index.html`, PWA manifest, service worker and available icons into `www/`.
- Native platforms are generated during CI rather than committed at this stage.

## Build/test stages
1. Build web asset bundle without modifying the production source.
2. Generate Android project and produce a debug APK in GitHub Actions.
3. Generate iOS project on macOS and compile an unsigned iOS Simulator build as a compile check.
4. Install and test Android APK on a real Android phone: GPS permission, live GPS, search, route, rerouting, speech, background/foreground, country selector and external links.
5. Test iPhone on a real device after Apple signing credentials and provisioning are configured.
6. Only after passing tests, prepare signed release builds and store submissions.

## Important limitations
- The iOS Simulator build is not an installable iPhone IPA.
- A signed iPhone device build requires Apple Developer membership, signing certificate and provisioning profile.
- Google Play release requires a signed Android App Bundle (AAB), Play Console registration and store compliance declarations.
- This scaffold does not yet bridge the current browser geolocation code to the Capacitor native Geolocation plugin. Native location permission and behavior must be implemented and tested before release.
- Existing map, geocoding, routing and nearby-search providers remain external. Their terms, quotas, privacy disclosures and coverage must be reviewed before public launch.
- The existing web service worker is retained in the packaged web assets but native WebView caching behavior must be tested separately.

## No production deployment
The workflow is restricted to this branch and manual/branch events. It does not deploy GitHub Pages and does not publish to either app store.
