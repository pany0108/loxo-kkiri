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
    SplashScreen: {
      launchShowDuration: 2000, // 2초 동안 보여줌
      backgroundColor: '#4C82B6', // 예: 노란색 (원하는 색상 코드로 변경!)
      showSpinner: false, // 로딩 뺑뺑이 없애기 (깔끔하게)
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  android: {},
};

export default config;
