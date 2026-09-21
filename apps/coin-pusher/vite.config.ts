import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const localApiKey = env.PSYDO_API_KEY || env.VITE_PSYDO_API_KEY;

  return {
    server: {
      proxy: {
        '/api/images/generations': {
          target: 'https://api.psydo.top',
          changeOrigin: true,
          rewrite: () => '/v1/images/generations',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest) => {
              if (localApiKey) {
                proxyRequest.setHeader('Authorization', `Bearer ${localApiKey}`);
              }
            });
          },
        },
      },
    },
  };
});
