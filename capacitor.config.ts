import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.loxo.kkiri',
  appName: 'Kkiri',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '831596904912-r3icrrjova3r2ur4210bggg0q68n7fgj.apps.googleusercontent.com',
      androidClientId: '831596904912-r3icrrjova3r2ur4210bggg0q68n7fgj.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  android: {},
};

export default config;
