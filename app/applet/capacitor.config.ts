import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cbt.examapp',
  appName: 'CBT Exam Engine',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
