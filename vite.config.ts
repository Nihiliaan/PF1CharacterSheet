import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'node:fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // Developer Sync Channel Plugin
      {
        name: 'dev-sync-channel',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.method === 'POST' && req.url === '/api/dev/sync-default') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const { type, content, id } = JSON.parse(body);
                  let filePath = '';
                  if (type === 'template') {
                    filePath = path.resolve(__dirname, 'src/constants/default_template.bbc');
                  } else if (type === 'svgt') {
                    const safeId = path.basename(id || '');
                    const fileMap: Record<string, string> = {
                      'svg-badge': 'src/templates/svg/badge.svgt',
                      'svg-parchment': 'src/templates/svg/parchment.svgt',
                      'svg-dark': 'src/templates/svg/tactical-dark.svgt'
                    };
                    filePath = path.resolve(__dirname, fileMap[safeId] || `src/templates/svg/${safeId}.svgt`);
                  } else {
                    filePath = path.resolve(__dirname, 'src/constants/default_data.pf1');
                  }
                  
                  fs.writeFileSync(filePath, (type === 'template' || type === 'svgt') ? content : JSON.stringify(content, null, 2));
                  
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                  console.log(`[DevSync] Updated ${type} at ${filePath}`);
                } catch (e: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
            } else if (req.method === 'GET' && (req.url.startsWith('/api/render') || req.url.startsWith('/render/'))) {
              try {
                const parsedUrl = new URL(req.url, 'http://localhost:3000');
                let charId = parsedUrl.searchParams.get('charId') || '';
                let templateId = parsedUrl.searchParams.get('templateId') || '';
                let ext = 'svg';

                if (req.url.startsWith('/render/')) {
                  const match = req.url.match(/^\/render\/([^\/]+)\/([^\.]+)\.([a-z]+)/);
                  if (match) {
                    charId = match[1];
                    templateId = match[2];
                    ext = match[3];
                  }
                }

                const templateFileMap: Record<string, { file: string, mime: string }> = {
                  'svg-badge': { file: 'src/templates/svg/badge.svgt', mime: 'image/svg+xml' },
                  'svg-parchment': { file: 'src/templates/svg/parchment.svgt', mime: 'image/svg+xml' },
                  'svg-dark': { file: 'src/templates/svg/tactical-dark.svgt', mime: 'image/svg+xml' },
                  'bbcode-default': { file: 'src/templates/bbcode/default.bbc', mime: 'text/plain' },
                  'bbcode-compact': { file: 'src/templates/bbcode/compact.bbc', mime: 'text/plain' }
                };

                const targetTpl = templateFileMap[templateId] || templateFileMap['svg-badge'];
                const tplPath = path.resolve(__dirname, targetTpl.file);
                const tplContent = fs.readFileSync(tplPath, 'utf-8');

                res.statusCode = 200;
                res.setHeader('Content-Type', `${targetTpl.mime}; charset=utf-8`);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(tplContent);
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.end('Dev Render Error: ' + e.message);
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('@codemirror') || id.includes('codemirror') || id.includes('@lezer')) return 'vendor-codemirror';
              if (id.includes('@google/genai')) return 'vendor-genai';
              if (id.includes('motion') || id.includes('lucide-react')) return 'vendor-ui';
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
