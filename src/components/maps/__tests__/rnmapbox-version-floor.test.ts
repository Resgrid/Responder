import mapboxPackage from '@rnmapbox/maps/package.json';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('@rnmapbox/maps version floor', () => {
  /**
   * 10.2.x `AnimatedPoint` assigned `this._listeners = {}` in its constructor. It extends
   * React Native's `AnimatedWithChildren`, and `AnimatedNode` owns that field — on RN 0.85
   * it is a `Map`, so the plain object broke `AnimatedNode.__callListeners`, which calls
   * `this._listeners.forEach(...)`.
   *
   * `Mapbox.UserLocation` defaults to `animated`, so every location update on a screen with
   * a map ran `AnimatedPoint.timing().start()` and the first frame threw
   * `TypeError: undefined is not a function`, taking the app down (Sentry RESPONDER-40,
   * reproduced on the call detail screen). 10.3.0 guards the assignment; dropping below that
   * brings the crash straight back.
   */
  it('is at least 10.3.0, where the AnimatedPoint listener clobber was fixed', () => {
    const [major, minor] = mapboxPackage.version.split('.').map(Number);

    expect(major).toBeGreaterThanOrEqual(10);
    expect(major > 10 || minor >= 3).toBe(true);
  });

  /**
   * The JS bindings are generated against a specific native SDK. Pinning an older one in the
   * Expo plugin leaves style props the bindings emit (`symbolZOffset`) unimplemented
   * natively, which traps in `RNMBXStyle.symbolLayer` on iOS (Sentry RESPONDER-41).
   */
  it('pins the same native Mapbox SDK the installed bindings target', () => {
    const appConfig = readFileSync(join(process.cwd(), 'app.config.ts'), 'utf8');
    const pinned = /RNMapboxMapsVersion:\s*'([^']+)'/.exec(appConfig)?.[1];

    expect(pinned).toBe(mapboxPackage.mapbox.android);
  });

  /**
   * Guards `patches/@rnmapbox+maps+10.3.5.patch`. Upstream's `LocationEngine.observers` is a
   * plain list mutated from both the main thread (activity resume) and the React
   * native-modules thread (`RNMBXLocationModule.start`). The overlap lands inside Kotlin's
   * `removeAll { }` and throws `IndexOutOfBoundsException: Index 0 out of bounds for
   * length 0`, killing the app as it foregrounds (Sentry RESPONDER-3S). A `yarn install`
   * that drops the patch brings the crash back, so assert on the installed source.
   */
  it('keeps the LocationEngine observer list guarded against concurrent mutation', () => {
    const locationKt = readFileSync(join(process.cwd(), 'node_modules/@rnmapbox/maps/android/src/main/mapbox-v11-compat/v11/com/rnmapbox/rnmbx/v11compat/Location.kt'), 'utf8');

    expect(locationKt).toContain('synchronized(observers)');
    expect(locationKt).not.toMatch(/observers\.removeAll\s*\{/);
  });
});
