// Custom entry so the background location task is defined on every launch, including the ones that
// render nothing. When the OS relaunches a killed app to deliver a location (Android restarting the
// foreground service, iOS waking it for a significant location change) it evaluates this bundle
// without mounting any route, so a task defined only from a route module would be undefined and its
// fixes dropped. See src/services/location-task.ts.
import 'expo-router/entry';
import './src/services/location-task';
