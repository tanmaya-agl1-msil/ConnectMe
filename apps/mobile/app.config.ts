import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extra hosts (comma-separated) that may use cleartext HTTP in DEBUG builds only, e.g. your LAN IP
 * if you run Metro over Wi-Fi for a physical phone. Release builds never allow cleartext.
 */
const extraDebugCleartextHosts = (process.env.DEV_CLEARTEXT_HOSTS ?? '')
  .split(',')
  .map((h: string) => h.trim())
  .filter(Boolean);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ConnectMe',
  slug: 'connectme',
  scheme: 'connectme',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.connectme.app',
  },
  plugins: [
    [
      './plugins/withAndroidNetworkSecurity',
      {
        // Public mkcert root CA, produced by `npm run certs`. Trusted in debug builds only.
        caFile: '../../certs/rootCA.pem',
        // Metro is reached through `adb reverse` on localhost; the API itself is HTTPS-only.
        debugCleartextHosts: ['localhost', '127.0.0.1', ...extraDebugCleartextHosts],
      },
    ],
  ],
});
