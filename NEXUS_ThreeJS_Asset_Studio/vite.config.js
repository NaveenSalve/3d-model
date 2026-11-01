import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    fs: {
      strict: true,
      deny: ['.env', '.env.*', '*.key', '*.pem']
    }
  },
  preview: {
    host: 'localhost',
    port: 4173,
    strictPort: false
  }
});

