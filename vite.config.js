import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

// Every labs/<name>/index.html becomes its own page (labs/next-r3f is a separate Next.js app and has no index.html)
const labInputs = Object.fromEntries(
  readdirSync(resolve(root, 'labs'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(root, 'labs', d.name, 'index.html')))
    .map((d) => [`lab-${d.name}`, resolve(root, 'labs', d.name, 'index.html')]),
);

export default defineConfig({
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
