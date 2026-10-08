# Savvy Marketing Partners — Website

Vite + vanilla JS site. The About page (`/about/`) uses:

- **Three.js** — the Savvy isologo extruded in 3D from the original Figma SVG, inside a particle field
- **Lenis** — smooth scrolling, synced with GSAP's ticker
- **GSAP ScrollTrigger** — scroll choreography (3D logo moves between sections, word-by-word manifesto, counters, pinned horizontal values, timeline)

```bash
npm install
npm run dev      # http://localhost:5173/about/
npm run build
```

Brand assets exported from Figma live in `public/brand/` (gradient, white and isologo variants).
