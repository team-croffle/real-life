import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import VueRouter from 'vue-router/vite';

const src = fileURLToPath(new URL('./src', import.meta.url));
const sharedSrc = fileURLToPath(new URL('../shared/src', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');

  return {
    plugins: [
      // VueRouter 는 반드시 vue() 보다 먼저 등록해야 한다.
      VueRouter({
        routesFolder: 'src/routes',
        dts: 'src/typed-router.d.ts',
        exclude: ['**/components/**'],
      }),
      vue(),
      tailwindcss(),
      vueDevTools(),
    ],
    resolve: {
      alias: [
        { find: /^@nest-vue\/shared$/, replacement: `${sharedSrc}/index.ts` },
        { find: /^@nest-vue\/shared\//, replacement: `${sharedSrc}/` },
        { find: /^@\//, replacement: `${src}/` },
      ],
    },
    server: {
      port: Number(env.VITE_PORT ?? 5173),
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
    },
  };
});
