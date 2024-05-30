import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from "@sentry/angular";
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

const serverErrorsRegex = new RegExp(
  `500 Internal Server Error|401 Unauthorized|403 Forbidden|404 Not Found|502 Bad Gateway|503 Service Unavailable`,
  'mi'
);

if (environment.loggingKey && environment.loggingKey !== 'LOGGINGKEY') {
  Sentry.init({
    dsn: environment.loggingKey,
    release: environment.version,
    environment: environment.production ? 'prod' : 'dev',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    ignoreErrors: [serverErrorsRegex],
    tracesSampleRate: environment.production ? 0.4 : 1.0,
  
    // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ['localhost', 'https://api.resgrid.com/api', 'https://qaapi.resgrid.com/api'],
  
    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
