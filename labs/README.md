# Labs — pruebas de código de la investigación

Experimentos aislados que verifican las técnicas documentadas en
[`docs/creative-development/`](../docs/creative-development/README.md). No modifican la página About.

Los labs 01–08 **se incluyen en el build** (`vite.config.js` detecta cada `labs/*/index.html`) y se publican en
`/labs/`. Cada lab muestra sus mediciones en un panel en pantalla, así que en el sitio desplegado se ven
cifras reales del navegador y la GPU de quien lo abre. `labs/next-r3f` es un proyecto Next.js aparte y no se despliega.

| Lab | Qué verifica |
| --- | --- |
| `01-lenis-scrolltrigger` | Sincronización Lenis + ScrollTrigger (receta oficial vs bucle propio), pin, `respectReducedMotion` |
| `02-splittext` | GSAP SplitText: `mask`, `aria`, `autoSplit` al redimensionar, `revert()` |
| `03-native-css` | CSS scroll-driven animations (`view()`, `scroll()`) y View Transitions API sin librerías |
| `04-flip` | Transición de elemento compartido con GSAP Flip |
| `05-webgl-dom-images` | Planos WebGL sincronizados con elementos del DOM, render bajo demanda, shader hover/velocidad |
| `06-three-perf` | Instancing vs mallas separadas, render continuo vs bajo demanda, `dispose()` |
| `07-image-sequence` | Secuencia de imágenes estilo Apple en canvas 2D con ScrollTrigger |
| `08-interactions` | Botón magnético `gsap.quickTo` vs `gsap.to`, `gsap.matchMedia` + reduced motion |
| `next-r3f/` | Next.js 16 App Router + R3F 9 + drei + Lenis (`lenis/react`) + `useGSAP` + `<ViewTransition>` |

## Ejecutar

```bash
# Labs 01–08 (usa las dependencias ya instaladas del proyecto)
npm run dev                      # y abre http://localhost:5173/labs/01-lenis-scrolltrigger/
node labs/run-labs.mjs           # ejecuta todo en Chromium headless -> labs/results/results.json

# Lab Next.js (proyecto independiente con su propio package.json)
cd labs/next-r3f && npm install && npm run build && npm test   # -> labs/next-r3f/results.json
```

Los runners necesitan Playwright (usa una instalación local o global). Las cifras de tiempo
se obtienen con GL por software (SwiftShader): sirven para comparar dentro de una misma
ejecución, no como FPS reales. Ver [`lab-results.md`](../docs/creative-development/lab-results.md).
