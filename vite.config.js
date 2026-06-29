import { defineConfig, loadEnv } from 'vite';
import adminUsersHandler from './api/admin-users.js';
import sendWaHandler from './api/send-wa.js';

const apiRoutes = {
  '/api/admin-users': adminUsersHandler,
  '/api/send-wa': sendWaHandler,
};

function localApiPlugin() {
  return {
    name: 'hcsp-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        const handler = apiRoutes[path];
        if (!handler) return next();

        try {
          req.body = await readJsonBody(req);
          await handler(req, createVercelResponse(res));
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Local API error' }));
          }
        }
      });
    },
  };
}

function createVercelResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(data) {
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return this;
    },
  };
}

function readJsonBody(req) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method || '')) return Promise.resolve(undefined);

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw.trim()) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [localApiPlugin()],
  };
});
