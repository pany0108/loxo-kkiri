import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kairos.superscheduler',
  appName: 'Super Scheduler',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '260376909396-3oto6s0uevl8mudqgdh0h5ih3efqo93v.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  android: {},
};

export default config;
