export default class CountlyConfig {
  constructor(_serverUrl?: string, _appKey?: string) {}
  setLoggingEnabled() {
    return this;
  }
  enableCrashReporting() {
    return this;
  }
  setRequiresConsent() {
    return this;
  }
  giveAllConsent() {
    return this;
  }
  setLocation() {
    return this;
  }
}
