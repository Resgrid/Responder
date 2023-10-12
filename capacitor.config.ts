import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wavetech.Resgrid',
  appName: 'Resgrid Responder',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
  },
  server: {
    allowNavigation: [],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: false
    },
    Badge: {
      persist: false,
      autoClear: true,
    },
  },
};

export default config;
