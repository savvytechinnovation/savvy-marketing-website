import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

// Local dev/preview only: serve the Vercel function api/contact.js at /api/contact so the
// form works end to end with `npm run dev` / `npm run preview`. On Vercel the platform runs it.
function vercelApiDev() {
  const mount = (server, load) =>
    server.middlewares.use('/api/contact', async (req, res) => {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const vres = {
        status(code) { res.statusCode = code; return vres; },
        setHeader: (k, v) => res.setHeader(k, v),
        json(data) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return vres; },
      };
      const { default: handler } = await load();
      await handler(Object.assign(req, { body: raw }), vres);
    });
  return {
    name: 'vercel-api-dev',
    // Block bodies: returning a function from these hooks would register it as a post-middleware
    configureServer(server) {
      mount(server, () => server.ssrLoadModule('/api/contact.js'));
    },
    configurePreviewServer(server) {
      mount(server, () => import('./api/contact.js'));
    },
  };
}

// Every labs/<name>/index.html becomes its own page (labs/next-r3f is a separate Next.js app and has no index.html)
const labInputs = Object.fromEntries(
  readdirSync(resolve(root, 'labs'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(root, 'labs', d.name, 'index.html')))
    .map((d) => [`lab-${d.name}`, resolve(root, 'labs', d.name, 'index.html')]),
);

export default defineConfig({
  plugins: [vercelApiDev()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        about: resolve(root, 'about/index.html'),
        labs: resolve(root, 'labs/index.html'),
        ...labInputs,
      },
    },
  },
});
