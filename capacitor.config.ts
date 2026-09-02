import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.digimemories.admin',
  appName: 'DigiMemories Admin',
  webDir: 'dist',
  server: {
    url: 'https://digimemories.vercel.app/admin',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#1c1917'
  }
};

export default config;
