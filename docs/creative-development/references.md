# Referencias

Proyectos, librerías y demos con evidencia pública. **No se afirma ninguna tecnología solo por la apariencia visual:**
- **Tec. verificadas [V]** indica la fuente de la evidencia.
- **Tec. inferidas [I]** son hipótesis.
- **[V-snippet]** = solo se vio el fragmento del buscador, porque el dominio estaba bloqueado.
- Las URLs de demos en vivo salen de los READMEs de los repos y **no se abrieron** en esta investigación.

## Tabla resumen

| # | Proyecto | Categoría | Tecnologías clave | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- |
| 1 | Lenis | Librería | Smooth scroll, `lenis/react`, `lenis/snap` | Baja | Muy alta |
| 2 | Satūs (darkroom) | Starter | Next.js 16, React 19, Lenis, GSAP, R3F opcional | Media | Muy alta |
| 3 | Locomotive Scroll v5 | Librería | Lenis + IntersectionObserver, parallax por atributos | Baja | Alta |
| 4 | r3f-scroll-rig (14islands) | Librería | R3F + Lenis, DOM → WebGL | Media | Muy alta* |
| 5 | BSMNT Scrollytelling | Librería | React + GSAP ScrollTrigger | Baja–Media | Alta |
| 6 | drei | Librería | Helpers de R3F | Media | Muy alta |
| 7 | pmndrs/examples | Demos | R3F/drei | Media | Muy alta |
| 8 | Codrops RotatingOnScrollAnimations | Demo | GSAP + ScrollTrigger + Lenis + three | Media | Alta |
| 9 | Codrops ScrollTextMotion | Demo | GSAP + ScrollTrigger | Baja–Media | Alta |
| 10 | Codrops Interlude | Demo / starter | Astro + GSAP + three (TSL) | Media–Alta | Media |
| 11 | Codrops MagneticButtons | Demo | JS (GSAP inferido) | Baja | Muy alta |
| 12 | Codrops ImageTrailEffects | Demo | JS + TweenMax | Baja | Alta |
| 13 | Codrops SmoothScrollAnimations | Demo | JS | Baja | Media |
| 14 | three.js `webgl_gpgpu_birds` | Demo oficial | GPUComputationRenderer | Alta | Media |
| 15 | three.js `webgpu_compute_particles` | Demo oficial | WebGPU + TSL compute | Alta | Media |
| 16 | Secuencias de imágenes estilo Apple | Técnica | Canvas 2D + scroll | Baja–Media | Muy alta |
| 17 | Bruno Simon — Folio 2019 | Portfolio | three.js + Cannon.js | Alta | Media |
| 18 | Bruno Simon — Folio 2025 | Portfolio | three + Rapier + GSAP + KTX2 | Alta | Media |
| 19 | Igloo Inc | Landing | WebGL, partículas, volumétricos | Alta | Baja (inspiración) |
| 20 | Messenger (abeto) | Juego / storytelling | WebGL / three.js | Alta | Baja |
| 21 | Lusion | Agencia | WebGL propio (inferido) | Alta | Media vía tutorial |
| 22 | Active Theory | Agencia | WebGL | Alta | Baja |
| 23 | Escaparate de Lenis | Escaparate | Lenis | — | Inspiración |

\* r3f-scroll-rig: compatibilidad con R3F 9 / React 19 / App Router **no verificada**.

---

## A. Librerías e infraestructura (código abierto)

### 1. Lenis — darkroom.engineering
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/darkroomengineering/lenis |
| Categoría | Librería de smooth scroll |
| Tec. verificadas [V] | Sin dependencias, MIT. Trabaja sobre el scroll nativo. Integración documentada con ScrollTrigger (`lenis.raf` en `gsap.ticker`, `lagSmoothing(0)`). Paquetes `lenis/react` y `lenis/snap` (README) |
| Efectos | Smooth scroll, scroll anidado y horizontal, base para parallax y para sincronizar WebGL |
| Complejidad | Baja |
| Rendimiento [V] | Safari a 60 fps como máximo (30 en bajo consumo). `position: fixed` puede ir con retraso en Safari en Macs anteriores a M1 |
| Compatibilidad [V] | `syncTouch` inestable en iOS < 16; no funciona sobre iframes |
| Reutilización | Muy alta |
| Implementación | `<ReactLenis root options={{ autoRaf: false }}>` en el layout, más el ticker de GSAP que lee el ref en cada tick. **Probado en `labs/next-r3f`** [L] |

### 2. Satūs — darkroom.engineering
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/darkroomengineering/satus |
| Categoría | Starter / arquitectura de referencia |
| Tec. verificadas [V] (repo) | Next.js 16 App Router, React 19 + React Compiler, Tailwind v4 + CSS Modules, Lenis, GSAP, Tempus, R3F opcional en `lib/webgl` con feature flags, Sanity y Shopify opcionales, Lighthouse CI, Playwright. MIT |
| Efectos | Base de los sitios de darkroom (los autores de Lenis) |
| Complejidad | Media |
| Rendimiento [V] | Lighthouse CI y presupuestos de assets |
| Compatibilidad | Pide Node ≥ 24.20 y Bun [V] |
| Reutilización | Muy alta como modelo de estructura de carpetas, aunque no se use entero |
| Implementación | Copiar las ideas (WebGL opcional por flag, proveedores, budgets), no el template completo |

### 3. Locomotive Scroll v5
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/locomotivemtl/locomotive-scroll |
| Categoría | Librería |
| Tec. verificadas [V] | Construida sobre Lenis, ~9.4 kB gzip, atributos `data-scroll`/`data-scroll-speed`, dos IntersectionObserver |
| Efectos | Parallax declarativo, detección de elementos en viewport |
| Complejidad | Baja |
| Compatibilidad [V] | "Smart Touch Detection" desactiva el parallax en táctil |
| Reutilización | Alta para sitios no-React. En Next.js conviene usar directamente Lenis + ScrollTrigger para no duplicar capas |

### 4. r3f-scroll-rig — 14islands
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/14islands/r3f-scroll-rig |
| Categoría | Librería DOM → WebGL |
| Tec. verificadas [V] | R3F + three + Lenis. `GlobalCanvas` persistente, `SmoothScrollbar`, `ScrollScene`, `ViewportScrollScene`, `useTracker` (IntersectionObserver + ResizeObserver), `useImageAsTexture`. Lo usan 14islands.com, Pluto.app, Neko Health, Metamask Learn y Cartier 365 |
| Efectos | Imágenes y mallas WebGL que siguen a elementos del DOM al hacer scroll |
| Complejidad | Media |
| Rendimiento [V] | Recomienda `frameloop="demand"` |
| Compatibilidad [V] | El README sugiere **desactivar el smooth scroll y el WebGL de scroll en móvil** porque suele ir con tirones. Setup documentado para Pages Router (`_app.jsx`) |
| Reutilización | Muy alta, pero la última versión es de 12-2024 y el peer es `fiber >=8`. **Verificar con R3F 9** antes de adoptarla. Alternativa probada: la técnica manual del lab 05 [L] o `View` de drei |

### 5. BSMNT Scrollytelling — basement.studio
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/basementstudio/scrollytelling |
| Categoría | Librería de storytelling |
| Tec. verificadas [V] | React + GSAP ScrollTrigger. Componentes `Root`, `Animation`, `Waypoint`, `Parallax`, `ImageSequenceCanvas` |
| Efectos | Timelines declarativas con scroll, parallax, secuencias de imágenes al estilo Apple |
| Complejidad | Baja–Media |
| Rendimiento / mobile | No verificado |
| Reutilización | Alta como referencia de API declarativa. Se puede replicar con hooks propios sobre `useGSAP` |

### 6. @react-three/drei
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/pmndrs/drei |
| Tec. verificadas [V] | `View` (varias vistas en un canvas con `gl.scissor`), `ScrollControls`/`useScroll`, `Text`/`Text3D`, `Image`, `useGLTF` (Draco/Meshopt), `Environment` (el `preset` **no es para producción** porque depende de CDNs), `PerformanceMonitor`, `AdaptiveDpr`, `Instances`, `shaderMaterial`, `MeshTransmissionMaterial` |
| Complejidad | Media |
| Rendimiento [I] | `MeshTransmissionMaterial` es caro en GPU |
| Reutilización | Muy alta en cualquier proyecto con R3F |

### 7. pmndrs/examples y react-three-next
| Campo | Detalle |
| --- | --- |
| URLs | https://github.com/pmndrs/examples · starter oficial: https://github.com/pmndrs/react-three-next |
| Tec. verificadas [V] | Monorepo de demos de R3F con catálogo en Next.js. El starter usa `'use client'`, `dynamic(..., { ssr: false })`, `View` de drei y `tunnel-rat` para un único canvas compartido |
| Reutilización | Muy alta como recetario |

## B. Demos y tutoriales

### 8. Codrops — RotatingOnScrollAnimations
| Campo | Detalle |
| --- | --- |
| URLs | https://github.com/codrops/RotatingOnScrollAnimations · artículo: https://tympanus.net/codrops/?p=116660 |
| Tec. verificadas [V] (repo) | GSAP + ScrollTrigger + Lenis; three.js en las variantes 7–15. MIT |
| Efectos | Imágenes que giran en 3D con el scroll, primero en CSS 3D y luego en WebGL |
| Complejidad | Media |
| Implementación | Las variantes CSS se pasan a `useGSAP`; las de WebGL, a R3F |

### 9. Codrops — ScrollTextMotion
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/codrops/ScrollTextMotion |
| Tec. verificadas [V] | GSAP + ScrollTrigger (topics del repo). MIT |
| Tec. inferidas [I] | Utilidad para partir el texto |
| Efectos | Tipografía animada con el scroll |
| Implementación | SplitText + ScrollTrigger [L] |

### 10. Codrops — Interlude (transiciones de página)
| Campo | Detalle |
| --- | --- |
| URLs | https://github.com/codrops/interlude · artículo: https://tympanus.net/codrops/?p=123511 |
| Tec. verificadas [V] | Astro ClientRouter + GSAP (con SplitText) + three.js con shaders TSL (~240 kB, se cargan solo si se usa una transición WebGL) + Lenis opcional. MIT. Marcado como "no longer actively maintained" |
| Efectos | Overlays (curtain, wipe, circle, columns), movimiento de página (stack, slide-over, peel, cube, tear) y WebGL (dither, dissolve, ink, particles, channel) |
| Complejidad | Media–Alta |
| Rendimiento [V] | WebGL cargado de forma diferida |
| Implementación | Es la referencia más completa de transiciones. En Next.js se porta con next-transition-router o React `<ViewTransition>` |

### 11. Codrops — MagneticButtons
| Campo | Detalle |
| --- | --- |
| URLs | https://github.com/codrops/MagneticButtons · artículo: https://tympanus.net/codrops/2020/08/05/magnetic-buttons |
| Tec. verificadas [V] | Proyecto npm, MIT, inspirado en Cuberto |
| Tec. inferidas [I] | GSAP |
| Implementación | Hook `useMagnetic` con `gsap.quickTo` [L] |

### 12. Codrops — ImageTrailEffects
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/codrops/ImageTrailEffects |
| Tec. verificadas [V] | JS vanilla + TweenMax (GSAP 2) + imagesLoaded. **Licencia de Codrops**: se puede usar en proyectos, pero no redistribuir tal cual |
| Efectos | Rastro de imágenes que sigue al cursor |
| Implementación | Reescribir con GSAP 3 y un pool de elementos |

### 13. Codrops — SmoothScrollAnimations
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/codrops/SmoothScrollAnimations |
| Tec. verificadas [V] | JS vanilla + imagesLoaded. Licencia de Codrops |
| Nota | Técnica previa a Lenis. Hoy se hace con Lenis + ScrollTrigger |

### 14. three.js — `webgl_gpgpu_birds`
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/mrdoob/three.js/blob/dev/examples/webgl_gpgpu_birds.html |
| Tec. verificadas [V] | `GPUComputationRenderer`: simula posición y velocidad en texturas de la GPU |
| Efectos | Bandada que reacciona al cursor |
| Implementación | Base para partículas tipo flow field en R3F |

### 15. three.js — `webgpu_compute_particles`
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_compute_particles.html |
| Tec. verificadas [V] | `three/webgpu` + `three/tsl` (`Fn`, `instancedArray`, `compute`), 200 000 partículas en el código |
| Compatibilidad | Depende de WebGPU. El fallback a WebGL2 del renderer existe [V], pero no se probó con este ejemplo |

### 16. Secuencias de imágenes estilo Apple (técnica)
| Campo | Detalle |
| --- | --- |
| URLs | Hilo de GSAP: https://gsap.com/community/forums/topic/25188-airpods-image-sequence-animation-using-scrolltrigger/ [V-snippet] · tutorial de CSS-Tricks https://css-tricks.com/?p=308477 [V-snippet] |
| Tec. verificadas [V-snippet] | Frames pintados en un canvas fijo según el progreso del scroll; precargados; pasar a WebP redujo 21 MB → ~4 MB |
| Tec. inferidas [I] | El pipeline real de apple.com |
| Rendimiento [L] | 237 MB de memoria decodificada con 120 frames de 960×540 (lab 07) |
| Implementación | Hook `useImageSequence` + ScrollTrigger, o `ImageSequenceCanvas` de BSMNT |

## C. Portfolios y sitios premiados

### 17. Bruno Simon — Folio 2019
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/brunosimon/folio-2019 |
| Tec. verificadas | MIT, Vite (repo) [V]; three.js + Cannon.js [V-snippet] |
| Efectos | Coche controlable en un mundo 3D con física |
| Reutilización | Estudio de arquitectura. Cannon.js ya no se mantiene [I]: usar Rapier |

### 18. Bruno Simon — Folio 2025
| Campo | Detalle |
| --- | --- |
| URL | https://github.com/brunosimon/folio-2025 |
| Tec. verificadas [V] (`package.json`) | three ^0.183, @dimforge/rapier3d (física WASM), gsap, howler, camera-controls, stats-gl, tweakpane, vite 7, **gltf-transform + KTX/ETC1S** para assets. MIT |
| Reutilización | El **pipeline de assets** (gltf-transform + KTX2) es lo más aplicable |

### 19. Igloo Inc — abeto × Bureaux
| Campo | Detalle |
| --- | --- |
| Evidencia | Site of the Year 2024 (Developer Award) de Awwwards [V-snippet]: https://www.awwwards.com/du-haihang/collections/webgl-animations/ · case study: https://awwwards.com/igloo-inc-case-study.html [V-snippet] · foro de three.js: https://discourse.threejs.org/t/landing-site-igloo-inc/67249 [V-snippet] |
| Tec. verificadas [V-snippet] | Herramienta propia de exportación volumétrica y simulación de fluidos (case study) |
| Tec. inferidas [I] | three.js, partículas GPGPU |
| Efectos | Partículas de flow field, escenas de hielo y cristal, transiciones de escena con el scroll |
| Reutilización | Referencia de dirección de arte; aproximación con E02 + E05 del catálogo |

### 20. Messenger — abeto
| Campo | Detalle |
| --- | --- |
| Evidencia | https://80.lv/articles/deliver-mail-on-tiny-colorful-planet-in-this-relaxing-web-game [V-snippet] |
| Tec. verificadas [V-snippet] | WebGL/three.js, modelos de Houdini y Blender, multijugador en tiempo real |
| Premio | Site of the Year 2025 según listados ambiguos: **[I] no confirmado** |
| Reutilización | Baja; referencia de shaders toon |

### 21. Lusion
| Campo | Detalle |
| --- | --- |
| Evidencia | Tutorial "Curly Tubes from the Lusion Website with Three.js": https://tympanus.net/codrops/2021/05/17/curly-tubes-from-the-lusion-website-with-three-js/ [V-snippet] · Awwwards: https://www.awwwards.com/inspiration/home-page-lusion-v3 [V-snippet] |
| Tec. verificadas [V-snippet] | El tutorial recrea en three.js los tubos de curl noise con dispersión de luz del sitio |
| Tec. inferidas [I] | Motor WebGL propio |
| Reutilización | Media, a través del tutorial portado a R3F |

### 22. Active Theory
| Campo | Detalle |
| --- | --- |
| Evidencia | https://www.awwwards.com/active-theory-v4-wins-january-2018-site-of-the-month.html [V-snippet] |
| Tec. verificadas | WebGL [V-snippet] |
| Tec. inferidas [I] | Framework propio (no hay fuente que confirme un nombre concreto) |
| Reutilización | Baja (código cerrado); solo inspiración |

### 23. Escaparate de Lenis
| Campo | Detalle |
| --- | --- |
| URLs | https://www.lenis.dev/showcase (bloqueado) · https://bestofjs.org/projects/lenis [V-snippet] |
| Sitios citados | DeSo (Studio Freight), Sculpting Harmony (Resn), Daylight Computer (Basement Studio), Lifeworld (Olafur Eliasson) |
| Uso | Inspiración. Tecnologías más allá de Lenis no verificadas |

## Recursos de aprendizaje

- **Three.js Journey** (Bruno Simon): https://threejs-journey.com/ [V-snippet]. Shaders, rendimiento, mezclar WebGL con HTML, R3F y un curso de WebGPU + TSL.
- **The Book of Shaders**: https://thebookofshaders.com/ [V vía repo]. Fragment shaders, noise, fBm.
- **Ejemplos oficiales de three.js** (nombres verificados en `examples/files.json` [V]): `webgl_loader_gltf_compressed` (KTX2 + Meshopt),
  `webgl_instancing_performance`, `webgl_postprocessing_unreal_bloom`, `webgl_gpgpu_birds`, `webgpu_tsl_galaxy`, `webgpu_tsl_raging_sea`,
  `webgl_materials_modified` (`onBeforeCompile`). URL: `https://threejs.org/examples/#<nombre>`.
- **Next.js View Transitions**: demo https://react-view-transitions-demo.labs.vercel.dev, código https://github.com/vercel-labs/react-view-transitions-demo
  (enlazados en la guía incluida en `next@16.4.0` [V]).

## Fuera del listado por falta de evidencia

- **GSAP Showcase** (https://gsap.com/showcase/): el fragmento del buscador menciona Apex, Škoda Vision Concept, Studio375 y Maxima Therapy,
  pero no se pudieron verificar sus URLs ni tecnologías.
- **Resn** como estudio: solo aparece a través del escaparate de Lenis.
