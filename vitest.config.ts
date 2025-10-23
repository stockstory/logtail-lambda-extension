import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.[jt]s?(x)'],
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [tsconfigPaths()],
});
