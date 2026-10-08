# Creative Development — biblioteca de investigación

Investigación sobre cómo se construyen experiencias web con scroll animado, 3D, smooth scrolling,
animación de texto, efectos de imagen, interacciones con el cursor y transiciones entre páginas,
orientada a implementarlas después en **Next.js + React + TypeScript**.

> Fecha de la investigación: **8 de octubre de 2026**. Las versiones citadas son las publicadas en npm en esa fecha.

## Índice

| Documento | Contenido |
| --- | --- |
| [technologies.md](./technologies.md) | Versiones, para qué sirve cada tecnología y cuándo elegirla (CSS vs GSAP vs Motion vs Three.js vs R3F vs WebGL propio) |
| [references.md](./references.md) | 23 sitios, librerías y demos con análisis técnico (tecnologías verificadas vs inferidas) |
| [effects-catalog.md](./effects-catalog.md) | Catálogo de 35 efectos (E01–E35) con funcionamiento, compatibilidad y recomendaciones |
| [scroll-animations.md](./scroll-animations.md) | Patrones de scroll: Lenis + ScrollTrigger, pin, horizontal, secuencias, sticky, CSS nativo |
| [threejs-effects.md](./threejs-effects.md) | Three.js / R3F / drei / WebGPU: integración, shaders, modelos, partículas |
| [text-animations.md](./text-animations.md) | SplitText, scroll typography, kinetic type, scramble, máscaras, fuentes variables |
| [image-effects.md](./image-effects.md) | Distorsión, reveals, galerías WebGL, parallax, transiciones con shaders |
| [page-transitions.md](./page-transitions.md) | View Transitions + React `<ViewTransition>`, next-transition-router, Flip, shaders |
| [architecture.md](./architecture.md) | Propuesta de arquitectura para Next.js App Router |
| [performance.md](./performance.md) | Rendimiento, accesibilidad, Core Web Vitals, mobile y fallbacks |
| [recommendations.md](./recommendations.md) | Selección priorizada: 10 visuales, 10 de scroll, 5 Three.js, 5 transiciones, 5 interactivos |
| [lab-results.md](./lab-results.md) | **Pruebas de código** que verifican las técnicas (9 labs + resultados medidos) |

## Cómo leer las afirmaciones

| Marca | Significado |
| --- | --- |
| **[V]** | Verificado en una fuente primaria (código fuente, `.d.ts`, README del paquete, docs incluidas en el paquete npm, repo de GitHub) |
| **[V-snippet]** | Verificado solo a través del fragmento de un buscador; la página original no se pudo abrir |
| **[L]** | Probado en código en este repositorio (ver [lab-results.md](./lab-results.md)) |
| **[I]** | Inferido / hipótesis técnica. No confirmado |

## Metodología

1. **Investigación documental** con búsqueda web y lectura de fuentes primarias accesibles: GitHub
   (READMEs y `raw.githubusercontent.com`), el registro de npm (READMEs, `package.json`, tipos `.d.ts`,
   la documentación de Next.js incluida en `next@16.4.0/dist/docs`) y los datos de compatibilidad
   de MDN (`@mdn/browser-compat-data` 8.1.5, `web-features` 3.41.0).
2. **Pruebas de código** (`labs/`): 8 experimentos vanilla con las dependencias ya instaladas
   (three 0.186.1, gsap 3.15.0, lenis 1.3.26) y un proyecto aislado Next.js 16.4 + R3F 9.8.1,
   ejecutados en Chromium headless con Playwright.

## Limitaciones de la investigación

- **Navegación restringida.** El proxy de red de este entorno bloqueó (`EGRESS_BLOCKED`): awwwards.com,
  gsap.com, threejs.org, tympanus.net (Codrops), r3f.docs.pmnd.rs, drei.docs.pmnd.rs, nextjs.org,
  motion.dev, developer.mozilla.org, web.dev, webkit.org, lenis.darkroom.engineering, lenis.dev,
  lusion.co, activetheory.net, apple.com, bruno-simon.com, css-tricks.com, codepen.io, cdn.jsdelivr.net,
  entre otros. Lo que viene de esos sitios está marcado **[V-snippet]**. Los demos en vivo
  (por ejemplo las demos de Codrops) **no se abrieron**; sus URLs salen de los READMEs de sus repos.
- **Sin inspección de sitios en producción.** No se pudo abrir el código de sitios premiados, así que
  las tecnologías de sitios cerrados (Igloo Inc, Active Theory, Lusion…) se marcan como inferidas
  salvo que exista un case study.
- **Rendimiento medido con GL por software.** Los labs corren en Chromium headless con SwiftShader.
  Los conteos (draw calls, renders, memoria, frames con desfase) son fiables; los milisegundos solo
  sirven para comparar dentro de la misma ejecución, nunca como FPS en dispositivos reales.
- **No se probó en Safari, Firefox ni dispositivos móviles reales.** Las pruebas "mobile" emulan viewport,
  touch y `prefers-reduced-motion` en Chromium.

## Hallazgos principales

1. **GSAP es 100 % gratuito, incluidos SplitText, ScrollSmoother, MorphSVG, Flip, etc.** [V] (README de `gsap` en npm; los
   plugins vienen en el paquete público 3.15.0 [L]). La licencia no es MIT: prohíbe usarlo en herramientas no-code
   que compitan con Webflow [V-snippet].
2. **Lenis + ScrollTrigger deben compartir el ticker de GSAP.** Con la receta oficial el scrub nunca se desfasa del scroll;
   con Lenis en su propio `requestAnimationFrame`, la animación va por detrás en 38 de 165 frames con movimiento, hasta 44 px [L].
3. **Trampa en `lenis/react`:** leer `ref.current.lenis` una sola vez en `useEffect([])` no funciona (la instancia aún no
   existe). Con `autoRaf: false` la página **deja de hacer scroll** sin ningún error. Hay que leer el ref en cada tick, como
   hace el README oficial [L][V].
4. **Next.js 16.4 + React 19.3 traen `<ViewTransition>` sin configuración** [V] (docs incluidas en el paquete) y funciona con la
   navegación del App Router [L]. Firefox no soporta las transiciones entre documentos [V].
5. **R3F 9.8.1 exige React `>=19 <19.4`** [V]. Funciona con Next 16.4 + React 19.3, compila con TypeScript estricto y no da
   errores de hidratación ni duplica ScrollTriggers en StrictMode [L]. Emite un aviso de `THREE.Clock` obsoleto con three r186 [L].
6. **`frameloop="demand"` + `invalidate()` desde ScrollTrigger:** 0 renders en reposo y solo se renderiza al cambiar el scroll [L].
7. **El texto 3D/WebGL no es SEO:** con `dynamic(..., { ssr: false })` el HTML del servidor incluye todo el texto y ningún `<canvas>` [L].
8. **CSS scroll-driven animations:** Chrome 115+ y Safari 26+, Firefox solo detrás de un flag. Todavía **no es Baseline** [V].
   Sirve como mejora progresiva sin JavaScript [L].
9. **Secuencias de imágenes:** 120 frames de 960×540 decodificados ocupan **237 MB** de memoria [L]. Es el riesgo principal en móvil.
10. **`dispose()` es obligatorio en three vanilla:** quitar objetos de la escena deja 40 geometrías y 40 texturas vivas en GPU;
    con `dispose()` quedan 0 [L].

## Estado

Fase de investigación. **No se ha implementado ningún componente en el sitio.** Las pruebas viven en `labs/` y se publican
en `/labs/` como páginas independientes, que muestran sus mediciones en pantalla para comprobarlas en dispositivos reales. El siguiente paso es revisar [recommendations.md](./recommendations.md) y aprobar qué implementar.
