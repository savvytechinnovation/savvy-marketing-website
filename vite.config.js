import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { pathToFileURL } from 'node:url';

const root = import.meta.dirname;

// ---------------------------------------------------------------------------
// Pages: every index.html in the project (plus 404.html) is its own page.
// ---------------------------------------------------------------------------
const IGNORE = new Set(['node_modules', 'dist', 'public', 'docs', 'partials', 'api', 'src', '.git', '.vercel', 'next-r3f']);
function findPages(dir, out = {}) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE.has(entry.name) && !entry.name.startsWith('.')) findPages(join(dir, entry.name), out);
    } else if (entry.name === 'index.html' || (dir === root && entry.name === '404.html')) {
      const rel = relative(root, join(dir, entry.name));
      out[rel.replace(/\/?index\.html$/, '').replace(/\.html$/, '').replace(/[\\/]/g, '-') || 'main'] = join(dir, entry.name);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTML partials: <!-- @include header --> is replaced by partials/header.html.
// Keeps the Figma header/footer as static HTML on every page (SEO, no flash).
// ---------------------------------------------------------------------------
function htmlPartials() {
  const dir = resolve(root, 'partials');
  const render = (html, depth = 0) =>
    html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => {
      const file = join(dir, `${name}.html`);
      if (!existsSync(file)) throw new Error(`Missing partial: partials/${name}.html`);
      return depth > 3 ? '' : render(readFileSync(file, 'utf8'), depth + 1);
    });
  return {
    name: 'html-partials',
    transformIndexHtml: { order: 'pre', handler: (html) => render(html) },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(dir)) server.ws.send({ type: 'full-reload' });
    },
  };
}

// ---------------------------------------------------------------------------
// Local dev/preview only: serve Vercel functions in api/<name>.js at /api/<name>
// so forms work end to end with `npm run dev` / `npm run preview`.
// ---------------------------------------------------------------------------
function vercelApiDev() {
  const mount = (server, load) =>
    server.middlewares.use(async (req, res, next) => {
      const match = req.url?.match(/^\/api\/([\w-]+)(?:\?.*)?$/);
      const file = match && resolve(root, 'api', `${match[1]}.js`);
      if (!file || !existsSync(file) || !statSync(file).isFile()) return next();
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const vres = {
        status(code) { res.statusCode = code; return vres; },
        setHeader: (k, v) => res.setHeader(k, v),
        json(data) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return vres; },
      };
      const { default: handler } = await load(match[1]);
      await handler(Object.assign(req, { body: raw }), vres);
    });
  return {
    name: 'vercel-api-dev',
    // Block bodies: returning a function from these hooks would register it as a post-middleware
    configureServer(server) {
      mount(server, (name) => server.ssrLoadModule(`/api/${name}.js`));
    },
    configurePreviewServer(server) {
      mount(server, (name) => import(pathToFileURL(resolve(server.config.root, 'api', name + '.js')).href));
    },
  };
}

export default defineConfig({
  plugins: [htmlPartials(), vercelApiDev()],
  build: {
    rollupOptions: { input: findPages(root) },
  },
});
