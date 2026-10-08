# Catálogo de efectos (E01–E35)

Cada efecto lleva su categoría, funcionamiento, referencias verificables, recomendación para Next.js y una fila de compatibilidad.
Leyenda en el [README](./README.md#cómo-leer-las-afirmaciones). La priorización está en [recommendations.md](./recommendations.md).

**Valores de la fila de compatibilidad:** Next.js/React = Compatible / Requiere adaptación · Mobile y Performance = Alta / Media / Baja ·
SEO = impacto potencial · Complejidad = Baja / Media / Alta · Reutilización = Alta / Media / Baja.

## Índice

| ID | Efecto | Categoría | Necesita WebGL |
| --- | --- | --- | --- |
| E01 | 3D Scroll Product / Logo Reveal | Three.js + ScrollTrigger | Sí |
| E02 | Campo de partículas reactivo (instanced / GPGPU) | Three.js | Sí |
| E03 | Recorrido de cámara por scroll | Three.js + ScrollTrigger | Sí |
| E04 | Imágenes WebGL sincronizadas con el DOM | Three.js / R3F + Lenis | Sí |
| E05 | Transición entre escenas con shader | Three.js | Sí |
| E06 | Distorsión de imagen en hover | WebGL shader | Sí |
| E07 | RGB shift / distorsión líquida | WebGL o filtros SVG | Opcional |
| E08 | Galería WebGL infinita o curva | WebGL | Sí |
| E09 | Slider con transiciones de shader | WebGL | Sí |
| E10 | Kinetic typography en 3D | WebGL | Sí |
| E11 | Texto como máscara de imagen o vídeo | CSS / SVG | No |
| E12 | Reveal de texto con máscara (split lines) | GSAP SplitText | No |
| E13 | Texto scramble / decode | GSAP ScrambleText | No |
| E14 | Animación de fuente variable | CSS + JS | No |
| E15 | Preloader → intro coreografiada | GSAP timeline | No (opcional) |
| E16 | Smooth scroll sincronizado (infraestructura) | Lenis + ScrollTrigger | No |
| E17 | Scroll horizontal fijado | ScrollTrigger `containerAnimation` | No |
| E18 | Secuencia de imágenes con scroll | Canvas 2D + ScrollTrigger | No |
| E19 | Resaltado palabra a palabra con scroll | SplitText + scrub | No |
| E20 | Tarjetas apiladas (sticky stacking) | CSS sticky (+ GSAP) | No |
| E21 | Escalar a pantalla completa / expandir con clip-path | ScrollTrigger | No |
| E22 | Cambios de tema o color por sección | ScrollTrigger / CSS | No |
| E23 | Parallax de imagen dentro de máscara | ScrollTrigger | No |
| E24 | Reveals y progreso sin JS | CSS scroll-driven | No |
| E25 | Marquee o skew según velocidad de scroll | Lenis + GSAP | No |
| E26 | Morph de elemento compartido entre rutas | React `<ViewTransition>` | No |
| E27 | Transición overlay / cortina | next-transition-router + GSAP | No |
| E28 | Reveal circular con clip-path desde el clic | CSS / GSAP | No |
| E29 | Flip de elemento compartido | GSAP Flip | No |
| E30 | Transición de página con shader | WebGL persistente | Sí |
| E31 | Botón magnético | GSAP quickTo | No |
| E32 | Cursor personalizado | CSS + GSAP | No |
| E33 | Tarjetas con tilt 3D y brillo | CSS 3D + JS | No |
| E34 | Rastro de imágenes / preview que sigue al cursor | GSAP | No |
| E35 | Menú fullscreen animado | GSAP + clip-path | No |

---

## Experiencias Three.js

### E01 — 3D Scroll Product / Logo Reveal
**Categoría:** Three.js + ScrollTrigger · **Complejidad:** Alta

**Descripción.** Un modelo 3D (producto, logo extruido) vive en un canvas fijo detrás del DOM y cambia de posición, rotación, escala y material
a medida que el usuario pasa por las secciones.

**Tecnologías.** R3F (o three vanilla), drei (`useGLTF`, `Environment`), GSAP + ScrollTrigger, Lenis.

**Casos de uso.** Landings de producto, presentación de marca (ya aplicado en la página About con el isologo), e-commerce, tecnología.

**Funcionamiento técnico.**
- Una timeline de GSAP con `scrub` por sección anima un **objeto de estado mutable** (`{x, y, rotY, scale, opacity}`), no la malla.
- El bucle de render (`useFrame` o `setAnimationLoop`) lee ese estado y lo aplica a la malla, con interpolación añadida (mouse, flotación).
- Así la escena no depende de React para animar, y ScrollTrigger tampoco depende de WebGL.
- Con `frameloop="demand"`, `onUpdate` llama a `invalidate()` [L].

**Referencias.** Página About de este repo (`src/about/scene.js`) [L] · `labs/next-r3f` (store + `invalidate`) [L] ·
Codrops RotatingOnScrollAnimations (variantes WebGL) [V] · tutorial de Codrops sobre experiencias 3D cinematográficas con GSAP [V-snippet].

**Recomendación Next.js.**
- `components/three/ProductScene.tsx` (`'use client'`) cargado con `dynamic(..., { ssr: false })`.
- El progreso del scroll vive en un store mutable (`lib/scroll-store.ts`) o en Zustand leído con `getState()`.
- Modelos optimizados con `gltf-transform optimize` (Meshopt + WebP/KTX2).
- Fallback: imagen estática del producto como `poster`.

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación (`ssr:false`) | Compatible | Media (DPR ≤ 1.5, modelo ligero) | Media | Canvas `aria-hidden`; el contenido real en el DOM; reduced motion = pose fija | Neutro si el texto vive en el DOM [L] | Alta | Alta |

### E02 — Campo de partículas reactivo (instanced / GPGPU)
**Categoría:** Three.js · **Complejidad:** Media (instanced) / Alta (GPGPU)

**Descripción.** Miles de puntos o instancias que forman una forma (logo, esfera, texto) y se dispersan o atraen según el cursor y el scroll.

**Tecnologías.** `THREE.Points` + ShaderMaterial, `InstancedMesh`, `GPUComputationRenderer` (WebGL) o compute de TSL (WebGPU).

**Funcionamiento.**
- Las posiciones viven en atributos de buffer y se animan en el vertex shader con uniforms (`uTime`, `uMouse`, `uProgress`).
- Con GPGPU, la simulación se hace en texturas o buffers de la GPU y la CPU no toca cada partícula.

**Referencias.** `webgl_gpgpu_birds` [V] · `webgpu_compute_particles` [V] · Codrops "Interactive Particles with Three.js" (repo jjroox/interactive-particles: three.js, GSAP, glslify) [V] · Igloo Inc como dirección de arte [V-snippet] · partículas de la página About [L].

**Recomendación.** Empezar con `Points` + shader (barato y suficiente para unas 50 000 partículas [I]). GPGPU solo si hay física o un flow field.
Pausar fuera del viewport y reducir la cantidad según `PerformanceMonitor`.

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación | Compatible | Media (reducir el número) | Media | Decorativo, `aria-hidden` | Neutro | Media/Alta | Alta |

### E03 — Recorrido de cámara por scroll
**Categoría:** Three.js + ScrollTrigger · **Complejidad:** Alta

**Descripción.** La cámara viaja por una escena siguiendo una curva mientras el usuario hace scroll (storytelling 3D).

**Funcionamiento.**
- La ruta es una `CatmullRomCurve3`, definida a mano o exportada desde Blender.
- El progreso de ScrollTrigger (0–1) se mapea a `curve.getPointAt(t)` para la posición y a `getTangentAt(t)` o a un objetivo para `lookAt`.
- Hay que asignar la posición antes del `lookAt` para evitar tirones [V-snippet], y suavizar con lerp.

**Referencias.** Codrops "Scroll-Driven 3D Gallery Using a Blender Camera Path" https://tympanus.net/codrops/?p=117076 [V-snippet] ·
drei `ScrollControls` + `useScroll().range()/curve()` [V] · hilos del foro de three.js sobre CatmullRomCurve3 [V-snippet].

**Recomendación.** Si la página es 100 % 3D, usar `ScrollControls` de drei (el scroll ocurre dentro del canvas). Si es una página DOM con secciones 3D,
usar ScrollTrigger + store, porque conserva el scroll nativo, el SEO y Lenis.

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación | Compatible | Baja/Media | Media/Baja | Ofrecer un resumen en texto; con reduced motion, saltar a los estados clave | `ScrollControls` saca el contenido del flujo DOM: riesgo | Alta | Media |

### E04 — Imágenes WebGL sincronizadas con el DOM
**Categoría:** Three.js / R3F + Lenis · **Complejidad:** Media-Alta

**Descripción.** Las imágenes del layout se pintan en WebGL sobre un canvas fijo, lo que permite distorsión por velocidad de scroll, ondas en hover y reveals con shader,
mientras el DOM sigue controlando el layout.

**Funcionamiento [L].**
- Una cámara ortográfica en píxeles CSS y un plano por cada elemento `[data-gl]`.
- En cada scroll de Lenis se lee `getBoundingClientRect()` y se colocan los planos, descartando los que están fuera de pantalla.
- La velocidad de Lenis entra al shader como uniform. El render es bajo demanda.
- Medido: **0 px** de desfase entre el plano y el DOM, y **0 renders en reposo** (lab 05).

**Referencias.** Lab 05 [L] · r3f-scroll-rig [V] · drei `View` [V] · Codrops "Distortion and Grain Effects on Scroll" (2024) [V-snippet] ·
foro de three.js: el scroll nativo se desincroniza del rAF, así que hay que usar Lenis [V-snippet].

**Recomendación.**
- Mantener `<Image>` de Next en el DOM como fuente de layout, SEO y fallback, y ocultarlo con `visibility: hidden` solo cuando WebGL esté listo.
- En R3F: drei `View` o un tracker propio. En móvil, valorar desactivarlo, como recomienda 14islands [V].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación | Compatible | Media/Baja | Media | El `<img>` real conserva su `alt` | Neutro si se conserva el `<img>` | Media/Alta | Alta |

### E05 — Transición entre escenas con shader
**Categoría:** Three.js · **Complejidad:** Alta

**Descripción.** Dos escenas (o dos estados de producto) se renderizan en render targets y un shader las mezcla (dissolve con ruido, wipe, píxeles) según el scroll o un clic.

**Funcionamiento.** Dos `WebGLRenderTarget`, más un quad a pantalla completa con un shader `mix(texA, texB, step(noise(uv), uProgress))`; `uProgress` lo anima GSAP.

**Referencias.** Codrops Interlude (transiciones WebGL dither, dissolve, ink, particles en TSL) [V] · Codrops "Creative WebGL Image Transitions" + gl-transitions [V].

**Recomendación.** Con R3F: `useFBO` de drei para los targets [I] y `createPortal` para las escenas. Reservarlo para momentos clave (cambio de capítulo).

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación | Compatible | Baja/Media (doble render) | Baja/Media | Con reduced motion, corte directo | Neutro | Alta | Media |

---

## Efectos de imagen

### E06 — Distorsión de imagen en hover
**Categoría:** WebGL shader · **Complejidad:** Media

**Descripción.** Al pasar el cursor, la imagen se ondula o transiciona a otra imagen siguiendo un mapa de desplazamiento.

**Funcionamiento.**
- Un plano con dos texturas y un mapa de desplazamiento en escala de grises.
- El shader desplaza las UV según `texture(disp).r * progress` y mezcla las texturas.
- El hover anima `progress` con GSAP. Variante: ondas centradas en `uMouse` (implementado en el lab 05 [L]).

**Referencias.** Codrops "WebGL Distortion Hover Effects" + repo robin-dela/hover-effect (three.js + TweenMax) [V] · akella/webgl-mouseover-effects [V].

**Recomendación.** Componente `<DistortImage>` sobre E04 (un solo canvas global). En táctil: activarlo al entrar en el viewport o al tocar.

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación | Compatible | Media (sin hover) | Media | `<img>` real con `alt` | Neutro | Media | Alta |

### E07 — RGB shift / distorsión líquida
**Categoría:** WebGL o filtros SVG · **Complejidad:** Baja (SVG) / Media (WebGL)

**Funcionamiento.**
- En WebGL, se lee la textura 3 veces con UVs desplazadas por canal [V-snippet] (lab 05 [L]).
- Sin WebGL: `feTurbulence` + `feDisplacementMap` en SVG, animando `baseFrequency` o `scale`.

**Referencias.** Codrops LiquidDistortion (PixiJS + GSAP) [V] · codrops/SVGImageHover (filtros SVG) [V] · codrops/ThumbHoverSVGFilter [V].

**Recomendación.** La versión SVG es suficiente para miniaturas. Cuidado con los filtros SVG en Safari: pueden ser caros [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible (SVG) / Requiere adaptación (WebGL) | Compatible | Media | Media | Desactivar con reduced motion | Neutro | Baja/Media | Alta |

### E08 — Galería WebGL infinita o curva
**Categoría:** WebGL · **Complejidad:** Alta

**Funcionamiento.**
- Planos subdivididos cuyo vertex shader curva los vértices según la posición en X.
- Un desplazamiento infinito con módulo del ancho total, controlado por drag y rueda con inercia (GSAP Observer o Draggable + Inertia).

**Referencias.** Codrops "Infinite Auto-Scrolling Gallery with OGL" (repo bizarro/infinite-webl-gallery) [V-snippet] · Codrops "Infinite Circular Gallery with OGL" [V-snippet] ·
kekkorider/codrops-tutorial-ogl-image-carousel [V].

**Recomendación.** Versión sin WebGL primero (CSS 3D + GSAP, ver codrops/3DCarousel [V]). WebGL solo si se necesita la curvatura o la distorsión.

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación | Compatible | Media (drag táctil OK) | Media | Navegación con teclado y botones; lista DOM equivalente | Las imágenes deben existir en el DOM | Alta | Media |

### E09 — Slider con transiciones de shader
**Categoría:** WebGL · **Complejidad:** Media

**Funcionamiento.** `mix(tex1, tex2, progress)` con manipulación de UV (ruido, círculo SDF, barrido). GSAP anima `progress` al cambiar de slide.

**Referencias.** akella/webGLImageTransitions (three.js + GL Transitions) [V] · Codrops "WebGL Shader Techniques for Dynamic Image Transitions" (2025) [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación | Compatible | Alta | Alta (un solo quad) | Controles accesibles, `aria-live` | Imágenes en el DOM | Media | Alta |

### E10 — Kinetic typography en 3D
**Categoría:** WebGL · **Complejidad:** Alta

**Funcionamiento.** El texto se dibuja en un render target o canvas 2D que se usa como textura de una geometría (toro, esfera, cinta) con un shader animado.
Alternativa: texto SDF con `troika-three-text` (drei `<Text>`), que admite shaders propios [V-snippet].

**Referencias.** Codrops "Kinetic Typography with Three.js" https://tympanus.net/codrops/?p=49770 [V-snippet] · Codrops "On-Scroll 3D Circle Text Animation" (three-msdf-text-utils) [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación | Compatible | Media | Media | El texto WebGL no es accesible: duplicarlo en el DOM | El texto real debe estar en el DOM | Alta | Media |

---

## Efectos de texto

### E11 — Texto como máscara de imagen o vídeo
**Categoría:** CSS / SVG · **Complejidad:** Baja

**Funcionamiento.**
- Con imagen o gradiente: `background-clip: text`.
- Con vídeo: máscara SVG sobre el `<video>`, o texto negro sobre blanco con `mix-blend-mode: screen` encima del vídeo [I].
- Para "expandir" la imagen desde el texto, ScrollTrigger anima `scale` o `clip-path`.

**Referencias.** codrops/ImageExpansionTypography [V] · Tuts+ "Introduction to Text Masking" [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta (vídeo con `playsinline muted`) | Alta | Contraste suficiente; texto real | Positivo (texto en el DOM) | Baja | Alta |

### E12 — Reveal de texto con máscara (split lines)
**Categoría:** GSAP SplitText · **Complejidad:** Baja

**Funcionamiento [L].**
- `SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit })`.
- Cada línea queda dentro de un envoltorio con `overflow: clip` y se anima `yPercent: 110 → 0` con stagger.
- `aria: 'auto'` deja `aria-label` en el padre. `autoSplit` re-divide al redimensionar. `revert()` restaura el DOM.

**Referencias.** Lab 02 [L] · docs de SplitText (masks) [V-snippet] · About page [L].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible (`useGSAP`) [L] | Compatible | Alta | Alta | Correcta con `aria:'auto'` [L]; desactivar con reduced motion [L] | Positivo | Baja | Alta |

### E13 — Texto scramble / decode
**Categoría:** GSAP ScrambleText · **Complejidad:** Baja

**Funcionamiento.** ScrambleTextPlugin (gratis, incluido en el paquete [L]) reemplaza caracteres aleatorios hasta revelar el texto final. Opciones `chars`, `revealDelay`, `speed` [V-snippet].

**Referencias.** codrops/LineTextHoverAnimations [V] · codrops/LetterShuffleMenu [V].

**Nota.** Usar una fuente monoespaciada o ancho fijo para evitar saltos de layout (CLS).

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta | Alta | Los lectores leen basura durante la animación: `aria-label` fijo | Neutro (el texto final está en el HTML) | Baja | Alta |

### E14 — Animación de fuente variable
**Categoría:** CSS + JS · **Complejidad:** Baja

**Funcionamiento.** Se mapea el cursor o el scroll a `font-variation-settings` (`wght`, `wdth`, `slnt`). Animar los ejes **no se acelera en GPU** y provoca repaints [V-snippet].

**Referencias.** 24 ways (2019) https://24ways.org/2019/interactivity-and-animation-with-variable-fonts/ [V-snippet] · Val Head https://valhead.com/2020/11/15/animating-variable-fonts-with-css/ [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible (`next/font` con ejes variables) | Compatible | Media | Media (repaint) | Reduced motion | Positivo | Baja | Media |

### E15 — Preloader → intro coreografiada
**Categoría:** GSAP timeline · **Complejidad:** Baja-Media

**Descripción.** Un loader con el isologo, una cortina que sube, el elemento 3D o hero que entra y un titular revelado por líneas.

**Funcionamiento.**
- Una timeline única que espera `Promise.all([fonts, modelo, imágenes críticas])` y luego encadena las animaciones.
- Lenis está parado (`lenis.stop()`) hasta que termina la intro.

**Referencias.** Página About de este repo [L].

**Cuidado.** Un loader que tapa el contenido **retrasa el LCP** si el elemento LCP arranca oculto [I]. Mostrar el contenido crítico tras unos 1–1.5 s como máximo y no bloquear en `networkidle`.

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta | Riesgo de LCP | Reduced motion = sin intro | Riesgo si el H1 arranca con `opacity: 0` | Baja/Media | Alta |

---

## Animaciones de scroll

### E16 — Smooth scroll sincronizado (infraestructura)
**Categoría:** Lenis + ScrollTrigger · **Complejidad:** Baja

**Funcionamiento [L].**
- `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t * 1000))` y `gsap.ticker.lagSmoothing(0)`.
- Sin esto, el scrub va por detrás del scroll en el 23 % de los frames, hasta 44 px (lab 01).
- En React: `<ReactLenis root options={{ autoRaf: false }}>` y el ref leído **dentro del tick** (bug documentado en el [lab Next.js](./lab-results.md#bug-encontrado-y-corregido-en-el-lab)).

**Referencias.** README de Lenis y de `lenis/react` [V] · labs 01 y next-r3f [L].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible [L] | Compatible | Alta (`syncTouch` desactivado por defecto) | Alta | `respectReducedMotion` por defecto [V][L] | Neutro | Baja | Alta |

### E17 — Scroll horizontal fijado
**Categoría:** ScrollTrigger `containerAnimation` · **Complejidad:** Media

**Funcionamiento.**
- El ScrollTrigger del contenedor fija la sección y anima el track con `x: () => -(scrollWidth - innerWidth)`, `ease: 'none'` e `invalidateOnRefresh`.
- Las animaciones internas usan `containerAnimation: tween`, que **no admite pin ni snap** [V-snippet].

**Referencias.** Página About (sección Values) [L] · foro de GSAP sobre `containerAnimation` [V-snippet] · codrops/ScrollPanels [V].

**Mobile.** Convertir en pila vertical o carrusel con swipe usando `gsap.matchMedia()` (hecho en About [L]).

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Media (alternativa vertical) | Alta | Cuidado con el foco por teclado dentro del track | Neutro | Media | Alta |

### E18 — Secuencia de imágenes con scroll (estilo Apple)
**Categoría:** Canvas 2D + ScrollTrigger · **Complejidad:** Media

**Funcionamiento [L].** Frames precargados como `ImageBitmap`; un tween de `{frame}` con scrub; en `onUpdate`, `drawImage` solo si cambió el frame. Dibujar cuesta ~0.06 ms; la memoria es el límite: **237 MB** para 120 frames de 960×540.

**Referencias.** Lab 07 [L] · foro de GSAP (AirPods) [V-snippet] · BSMNT `ImageSequenceCanvas` [V].

**Recomendación.** WebP/AVIF, unos 60 frames en móvil a menor resolución, carga progresiva (keyframes primero) y `poster` estático con reduced motion.

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Media (memoria y datos) | Media | Texto descriptivo; reduced motion = imagen fija | Neutro | Media | Alta |

### E19 — Resaltado palabra a palabra con scroll
**Categoría:** SplitText + ScrollTrigger scrub · **Complejidad:** Baja

**Funcionamiento.** El párrafo se divide en palabras y se anima `opacity` de 0.15 a 1 con stagger y `scrub: true` entre `top 80%` y `bottom 45%`.

**Referencias.** Página About (manifiesto) [L] · codrops/OnScrollTextHighlight [V].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta | Alta | Texto legible al cargar en reduced motion | Positivo | Baja | Alta |

### E20 — Tarjetas apiladas (sticky stacking)
**Categoría:** CSS sticky (+ GSAP) · **Complejidad:** Baja

**Funcionamiento.** Cada tarjeta tiene `position: sticky` con un `top` escalonado; la anterior se escala o oscurece con ScrollTrigger o con CSS `view()`.
**No combinar `position: sticky` con `pin` de ScrollTrigger** en el mismo elemento [V-snippet].

**Referencias.** CodyHouse "Stacking cards" [V-snippet] · codrops/3DStackMotion [V] · demos de scroll-driven-animations.style [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta (usar `dvh`) | Alta | Orden DOM lógico | Positivo | Baja | Alta |

### E21 — Escalar a pantalla completa / expandir con clip-path
**Categoría:** ScrollTrigger · **Complejidad:** Baja-Media

**Funcionamiento.**
- Sección fijada; la imagen o vídeo va de `clip-path: inset(30% 30%)` (o `scale: 0.3`) a pantalla completa con scrub.
- Animar `scale` o `clip-path`, nunca `width`/`height`.
- Partir del tamaño grande y escalar hacia abajo, más un tween de "hold" al final [V-snippet].

**Referencias.** Codrops OnScrollShapeMorph [V] · foro de GSAP "scale image and pin" [V-snippet] · codrops/ImageExpansionTypography [V].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta | Alta | — | Neutro | Baja/Media | Alta |

### E22 — Cambios de tema o color por sección
**Categoría:** ScrollTrigger / CSS · **Complejidad:** Baja

**Funcionamiento.**
- Cada sección declara `data-theme`; ScrollTrigger (`onEnter`/`onEnterBack`) anima variables CSS (`--bg`, `--fg`) en `:root`.
- Usar una sola timeline o callbacks: varios `.to()` sobre la misma propiedad reinician el valor inicial [V-snippet].
- Versión CSS: `animation-timeline: view()` con `@supports`.

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta | Alta (animar color repinta, pero es barato) | Verificar contraste en todos los temas | Neutro | Baja | Alta |

### E23 — Parallax de imagen dentro de máscara
**Categoría:** ScrollTrigger · **Complejidad:** Baja

**Funcionamiento.** Contenedor con `overflow: hidden`; la imagen a `scale(1.2–1.4)` anima `yPercent` de -10 a 10 con scrub [V-snippet]. Versión CSS: `animation-timeline: view()`.

**Referencias.** codrops/ScrollAnimationsGrid (gsap-scrolltrigger + lenis) [V] · codrops/ElasticGridScroll [V].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta (amplitud menor) | Alta | Reduced motion = estático | Neutro | Baja | Alta |

### E24 — Reveals y progreso sin JS (CSS scroll-driven)
**Categoría:** CSS · **Complejidad:** Baja

**Funcionamiento [L].**
- `animation-timeline: view()` + `animation-range: entry 0% cover 40%` para reveals.
- `animation-timeline: scroll(root)` para la barra de progreso.
- Fuera del hilo principal. Chrome 115+ y Safari 26+; Firefox con flag [V]. Envolver en `@supports (animation-timeline: view())`.

**Referencias.** Lab 03 [L] · guía de WebKit https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/ [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible (CSS Modules/Tailwind) | Compatible | Alta | **Muy alta** | `@media (prefers-reduced-motion)` | Positivo | Baja | Alta |

### E25 — Marquee o skew según velocidad de scroll
**Categoría:** Lenis + GSAP · **Complejidad:** Baja

**Funcionamiento.** Un tween infinito de `xPercent: -50` sobre el contenido duplicado; en el evento `scroll` de Lenis, `timeScale = 1 + |velocity|/k`. Variante: `skewY` proporcional a la velocidad con `quickTo`.

**Referencias.** Página About [L].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta | Alta | `aria-hidden` en la copia; pausar con reduced motion | Neutro | Baja | Alta |

---

## Transiciones de página

### E26 — Morph de elemento compartido entre rutas (React `<ViewTransition>`)
**Categoría:** View Transitions API nativa · **Complejidad:** Baja-Media

**Funcionamiento [V][L].**
- Se envuelve el elemento en `<ViewTransition name="x">` en ambas rutas. La navegación del App Router es una transition, así que React llama a `document.startViewTransition` y el navegador hace el morph.
- Funciona en Next 16.4 + React 19.3 **sin configuración**.
- Personalización con las props `share`, `enter`, `exit` y `default`, y CSS `::view-transition-*`. `<Link transitionTypes>` desde Next 16.2.
- Sin soporte del navegador, la navegación funciona sin animación.

**Referencias.** Docs de Next (incluidas en el paquete) [V] · demo de Vercel https://github.com/vercel-labs/react-view-transitions-demo [V] · `labs/next-r3f` [L].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible (16.x) [L] | Compatible (19.3) | Alta | **Alta** (snapshots del navegador) | Respetar reduced motion en CSS | Neutro | Baja/Media | Alta |

### E27 — Transición overlay / cortina
**Categoría:** next-transition-router + GSAP · **Complejidad:** Media

**Funcionamiento [V].**
- El provider `TransitionRouter` expone `leave(next, from, to)` y `enter(next)` asíncronos.
- En `leave`, GSAP cubre la pantalla y llama a `next()`; en `enter`, la descubre.
- Limitación: **atrás y adelante del navegador no disparan la transición** [V].

**Referencias.** https://github.com/ismamz/next-transition-router [V] · Codrops Interlude (curtain, wipe, columns) [V] · codrops/PageRevealEffects [V].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible (paquete beta) | Compatible | Alta (usar `dvh`) | Alta | Mover el foco al `<main>` nuevo y anunciar el cambio de ruta | Neutro | Media | Alta |

### E28 — Reveal circular con clip-path desde el clic
**Categoría:** CSS / GSAP · **Complejidad:** Baja

**Funcionamiento.** Se guardan las coordenadas del clic en variables CSS y la nueva vista anima `clip-path: circle(0% at X Y) → circle(150% at X Y)`.
Con View Transitions se hace sobre `::view-transition-new(root)`.

**Referencias.** codrops/UnrevealEffects [V] · Ahmad Shadeed "clip-path" https://ishadeed.com/article/clip-path/ [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Alta | Alta | Reduced motion = fundido | Neutro | Baja | Alta |

### E29 — Flip de elemento compartido (GSAP Flip)
**Categoría:** GSAP Flip · **Complejidad:** Media

**Funcionamiento [L].** `Flip.getState(el)` → cambio del DOM (reparent, clase, layout) → `Flip.from(state)`. Lab 04: 0 px de salto y 0 px de error final.
Para dos elementos distintos se usa el mismo `data-flip-id` [V-snippet]. Entre rutas reales hace falta un overlay persistente o View Transitions.

**Referencias.** Lab 04 [L] · codrops/MenuToGrid [V] · codrops/ScrollBasedLayoutAnimations (Flip + ScrollTrigger) [V] · Codrops "Large Image to Content Page Transition" (Lenis + Flip) [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible (dentro de una ruta) | Compatible | Alta | Alta | Gestionar el foco | Neutro | Media | Alta |

### E30 — Transición de página con shader (WebGL persistente)
**Categoría:** WebGL · **Complejidad:** Alta

**Funcionamiento.**
- Un canvas fijo en `layout.tsx` (persiste entre rutas).
- Al navegar, se anima `uProgress` de un shader de ruido o dissolve que tapa la pantalla; se hace el swap de la ruta y se descubre.
- Variante: la cámara de una escena persistente se mueve entre "salas" [V-snippet].

**Referencias.** Codrops Interlude (dither, dissolve, ink, particles) [V] · Codrops "Seamless 3D Transitions with Webflow, GSAP and Three.js" https://tympanus.net/codrops/?p=110760 [V-snippet].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requiere adaptación (canvas en el layout + router de transiciones) | Compatible | Media | Media | Fallback CSS con reduced motion o sin WebGL | Neutro | Alta | Media |

---

## Componentes interactivos

### E31 — Botón magnético
**Categoría:** GSAP · **Complejidad:** Baja

**Funcionamiento [L].** En `pointermove`, el offset al centro × fuerza va a `gsap.quickTo(el, 'x'|'y')`; en `pointerleave`, vuelve a 0 con `elastic.out`.
`quickTo` reutiliza un tween por propiedad (0 tweens nuevos frente a 200 con `gsap.to`, lab 08). Medir con `clientX/Y` [V-snippet].

**Referencias.** codrops/MagneticButtons [V] · About page [L] · lab 08 [L].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible (`useGSAP` + `contextSafe`) | Compatible | N/A: desactivar con `(hover: none)` [L] | Alta | Sin efecto con foco de teclado; respetar reduced motion | Neutro | Baja | Alta |

### E32 — Cursor personalizado
**Categoría:** CSS + GSAP · **Complejidad:** Baja

**Funcionamiento.** Un elemento fijo con `pointer-events: none` sigue al puntero con `quickTo`. `mix-blend-mode: difference` invierte los colores.
Los estados (hover en links o imágenes) se activan con `data-cursor`. Variante gooey con filtros SVG.

**Referencias.** codrops/GooeyCursor (filtros SVG + blend modes) [V] · codrops/AnimatedCustomCursor [V] · cursor glow de About [L].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | N/A (`pointer: coarse`) | Alta | **No ocultar el cursor nativo** o mantener el foco visible | Neutro | Baja | Alta |

### E33 — Tarjetas con tilt 3D y brillo
**Categoría:** CSS 3D + JS · **Complejidad:** Baja

**Funcionamiento.** El puntero se mapea a `rotateX/rotateY` con `perspective`; un gradiente radial sigue al cursor como brillo; los hijos con `translateZ` dan profundidad.

**Referencias.** vanilla-tilt.js (opciones `max`, `perspective`, `glare`, `gyroscope`) [V-snippet] · codrops/TiltHoverEffects [V] · tarjetas de equipo de About [L].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Baja/Media (giroscopio con permiso en iOS [I]) | Alta | Reduced motion | Neutro | Baja | Alta |

### E34 — Rastro de imágenes / preview que sigue al cursor
**Categoría:** GSAP · **Complejidad:** Baja-Media

**Funcionamiento.**
- Un pool de N imágenes; cuando el puntero recorre una distancia umbral, se coloca la siguiente imagen en la posición y se anima la escala o la opacidad.
- Variante "menú": al pasar por cada ítem de una lista aparece una preview que sigue al cursor.

**Referencias.** codrops/ImageTrailEffects [V] · codrops/MotionTrailAnimations (mouse y touch) [V] · codrops/RapidImageHoverMenu [V].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | Media (touch en algunas variantes) | Alta (pool, sin crear nodos) | Decorativo | Neutro | Baja/Media | Alta |

### E35 — Menú fullscreen animado
**Categoría:** GSAP + clip-path · **Complejidad:** Baja-Media

**Funcionamiento.** Un overlay fijo que se abre con `clip-path` (círculo desde el botón o polígono) y luego los links entran con máscara por líneas (E12).
Se bloquea el scroll (`lenis.stop()`), se atrapa el foco y se gestionan `aria-expanded` y `Escape`.

**Referencias.** codrops/MultiboxMenu [V] · codrops/ExpandingRoundedMenu [V] · codrops/EaseReverseClipMenu [V].

| Next.js | React | Mobile | Performance | Accesibilidad | SEO | Complejidad | Reutilización |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatible | Compatible | **Alta** (caso principal) | Alta | Trampa de foco, `aria-expanded`, `Escape`, reduced motion | Los links deben estar en el HTML | Baja/Media | Alta |
