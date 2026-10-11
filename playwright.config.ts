import { defineConfig } from '@playwright/test';

export default defineConfig({
  // 连接到远程 Lightpanda CDP 服务器
  use: {
    connectOptions: {
      wsEndpoint: 'ws://127.0.0.1:9222'
    },
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    baseURL: 'https://example.com',
  },

  timeout: 30000,
  expect: { timeout: 5000 },

  testDir: './tests',
  reporter: 'html',

  projects: [
    {
      name: 'lightpanda-chromium',
      use: {
        connectOptions: {
          wsEndpoint: 'ws://127.0.0.1:9222'
        }
      }
    }
  ]
});