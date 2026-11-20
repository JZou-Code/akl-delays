import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';
import { apiProxyTarget, type Env } from './dev-server.ts';

const ROOT_ENV_FILE = fileURLToPath(new URL('../../.env', import.meta.url));

function apiEnv(): Env {
  const fromFile = existsSync(ROOT_ENV_FILE) ? parseEnv(readFileSync(ROOT_ENV_FILE, 'utf8')) : {};
  return { ...fromFile, ...process.env };
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': apiProxyTarget(apiEnv()) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
