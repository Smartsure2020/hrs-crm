import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'

function apiDevPlugin() {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const raw = trimmed.slice(eq + 1).trim();
      const val = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1)
                : raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1)
                : raw;
      if (!(key in process.env)) process.env[key] = val;
    });
  }
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        req.query = Object.fromEntries(url.searchParams);
        const fnName = url.pathname.replace(/^\//, '').split('?')[0] || 'index';
        let fnPath = path.resolve(`api/${fnName}.js`);

        // Fall back to catch-all route when specific file doesn't exist
        if (!fs.existsSync(fnPath)) {
          fnPath = path.resolve(`api/[...route].js`);
          // Restore full /api/* path so the catch-all handler can parse the entity name
          req.url = '/api' + req.url;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
          const mockRes = {
            _done: false,
            status(code) { res.statusCode = code; return this; },
            json(data) {
              if (this._done) return;
              this._done = true;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
          };
          try {
            const { default: handler } = await import(pathToFileURL(fnPath).href + '?t=' + Date.now());
            await handler(req, mockRes);
          } catch (err) {
            if (!res.writableEnded) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('react-leaflet') || id.includes('/leaflet/')) return 'vendor-maps';
          if (id.includes('three')) return 'vendor-3d';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('react-quill') || id.includes('/quill/')) return 'vendor-editor';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('/node_modules/react/') || id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) return 'vendor-react';
        },
      },
    },
  },
});
