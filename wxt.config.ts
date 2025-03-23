import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: "UT Degree Audit+"
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
