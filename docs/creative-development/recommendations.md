# Recomendaciones priorizadas

Selección final: **10 efectos visuales de alto impacto, 10 animaciones de scroll, 5 experiencias Three.js, 5 transiciones y 5 componentes interactivos**.
Cada efecto aparece **en una sola lista**; los que tocan varias categorías se indican con *(también: …)*. Los detalles técnicos están en el
[catálogo](./effects-catalog.md) (ID E01–E35). Leyenda: [V] verificado · [L] probado en labs · [I] inferido.

**Puntuación** (1–5): **Impacto** visual · **Dificultad** (5 = muy difícil) · **Reutilización**.
**¿Proyectos reales?** ✅ sí · ⚠️ con condiciones · 🧪 solo para piezas especiales.

---

## A. 10 efectos visuales de alto impacto

| # | Efecto | Impacto | Dificultad | Reutil. | ¿Real? |
| --- | --- | --- | --- | --- | --- |
| A1 | E12 Reveal de texto con máscara | 4 | 1 | 5 | ✅ |
| A2 | E15 Preloader → intro coreografiada | 5 | 2 | 4 | ⚠️ |
| A3 | E06 Distorsión de imagen en hover | 5 | 3 | 4 | ⚠️ |
| A4 | E11 Texto como máscara de imagen o vídeo | 4 | 1 | 4 | ✅ |
| A5 | E09 Slider con transiciones de shader | 4 | 3 | 4 | ✅ |
| A6 | E07 RGB shift / distorsión líquida | 4 | 2 | 3 | ⚠️ |
| A7 | E08 Galería WebGL infinita o curva | 5 | 4 | 3 | ⚠️ |
| A8 | E13 Texto scramble / decode | 3 | 1 | 4 | ✅ |
| A9 | E10 Kinetic typography 3D | 5 | 4 | 2 | 🧪 |
| A10 | E14 Fuente variable animada | 3 | 1 | 3 | ✅ |

**A1 — E12 Reveal de texto con máscara**
1. **Por qué destaca:** es el "acabado premium" más barato: titulares que suben desde una máscara.
2. **Cómo funciona:** SplitText divide en líneas dentro de envoltorios con `overflow: clip` y GSAP anima `yPercent` con stagger.
3. **Tecnologías:** GSAP SplitText (`mask`, `aria`, `autoSplit`) + `useGSAP`.
4. **Dificultad:** baja. Probado: aria, re-split y revert correctos [L].
5. **Reutilización:** `<SplitReveal>` envolviendo cualquier `h1`/`h2` renderizado en el servidor.
6. **Referencias:** lab 02, About, docs de SplitText [V-snippet], codrops/TypographyMotion [V].
7. **¿Proyectos reales?** ✅ Sí, es la primera opción.

**A2 — E15 Preloader → intro coreografiada** *(también: Three.js si incluye el modelo)*
1. **Por qué destaca:** marca el tono de la experiencia desde el primer segundo.
2. **Cómo funciona:** una timeline única que espera fuentes y assets y encadena cortina, 3D y titular, con Lenis parado hasta que termina.
3. **Tecnologías:** GSAP timeline + Lenis `stop/start`.
4. **Dificultad:** baja-media.
5. **Reutilización:** `<IntroSequence>` configurable.
6. **Referencias:** página About [L].
7. **¿Proyectos reales?** ⚠️ Solo si el contenido LCP aparece en ≤ 1–1.5 s y con reduced motion no hay intro. Mal hecho, empeora el LCP [I].

**A3 — E06 Distorsión de imagen en hover**
1. **Por qué destaca:** la firma de los portfolios premiados de agencias.
2. **Cómo funciona:** un plano WebGL por imagen; el shader desplaza las UV con un mapa o con ondas en `uMouse`; GSAP anima `uHover`.
3. **Tecnologías:** three/R3F + shader + GSAP, sobre la arquitectura DOM → WebGL (E04).
4. **Dificultad:** media (alta la primera vez, por la infraestructura E04).
5. **Reutilización:** `<DistortImage src alt>` sobre un canvas global.
6. **Referencias:** lab 05 [L], robin-dela/hover-effect [V], akella/webgl-mouseover-effects [V].
7. **¿Proyectos reales?** ⚠️ Sí en escritorio. En táctil, activarlo al entrar en el viewport o desactivarlo.

**A4 — E11 Texto como máscara de imagen o vídeo**
1. **Por qué destaca:** tipografía gigante con la imagen o el vídeo de marca dentro.
2. **Cómo funciona:** `background-clip: text` (imagen o gradiente) o una máscara SVG (vídeo); expansión con ScrollTrigger.
3. **Tecnologías:** CSS (+ GSAP).
4. **Dificultad:** baja.
5. **Reutilización:** `<MaskedHeadline media>`.
6. **Referencias:** codrops/ImageExpansionTypography [V], Tuts+ [V-snippet], gradiente en About [L].
7. **¿Proyectos reales?** ✅ Sí. Vigilar el contraste.

**A5 — E09 Slider con transiciones de shader**
1. **Por qué destaca:** las transiciones dissolve o ruido entre imágenes se ven cinematográficas con un solo quad.
2. **Cómo funciona:** `mix(tex1, tex2, mask(noise, progress))` con `progress` animado por GSAP.
3. **Tecnologías:** three/OGL + GLSL + GSAP.
4. **Dificultad:** media.
5. **Reutilización:** `<ShaderSlider images transition="noise|circle|wipe">`.
6. **Referencias:** akella/webGLImageTransitions (GL Transitions) [V].
7. **¿Proyectos reales?** ✅ Sí. Es barato en GPU y debe tener controles accesibles.

**A6 — E07 RGB shift / distorsión líquida**
1. **Por qué destaca:** aporta energía a miniaturas y CTA.
2. **Cómo funciona:** 3 lecturas de textura desplazadas (WebGL) o `feTurbulence` + `feDisplacementMap` (SVG).
3. **Tecnologías:** filtros SVG + GSAP, o un shader.
4. **Dificultad:** baja (SVG) / media (WebGL).
5. **Reutilización:** variante de `<DistortImage>` o `<SvgDistort>`.
6. **Referencias:** codrops/SVGImageHover [V], codrops/LiquidDistortion [V].
7. **¿Proyectos reales?** ⚠️ Con moderación. Los filtros SVG pueden ser caros en Safari [V-snippet].

**A7 — E08 Galería WebGL infinita o curva**
1. **Por qué destaca:** es una forma de explorar el portfolio con mucha personalidad.
2. **Cómo funciona:** planos curvados en el vertex shader, desplazamiento infinito con módulo e input de drag y rueda con inercia.
3. **Tecnologías:** OGL o three + GSAP Observer/Draggable/Inertia.
4. **Dificultad:** alta.
5. **Reutilización:** media (cada marca la personaliza).
6. **Referencias:** tutoriales OGL de Codrops [V-snippet], kekkorider/codrops-tutorial-ogl-image-carousel [V].
7. **¿Proyectos reales?** ⚠️ Solo para la sección de portfolio, con lista DOM y teclado.

**A8 — E13 Texto scramble / decode**
1. **Por qué destaca:** un toque tech para hovers de navegación, etiquetas y números.
2. **Cómo funciona:** ScrambleTextPlugin sustituye caracteres hasta revelar el texto.
3. **Tecnologías:** GSAP ScrambleText (gratis [V][L]).
4. **Dificultad:** baja.
5. **Reutilización:** `<ScrambleText>` / `useScrambleOnHover`.
6. **Referencias:** codrops/LineTextHoverAnimations [V].
7. **¿Proyectos reales?** ✅ Sí, con una fuente monoespaciada y `aria-label`.

**A9 — E10 Kinetic typography 3D**
1. **Por qué destaca:** es una pieza de "wow" para campañas.
2. **Cómo funciona:** el texto pasa a un render target y de ahí a la textura de una geometría animada con un shader.
3. **Tecnologías:** three/R3F + GLSL (+ troika/MSDF).
4. **Dificultad:** alta.
5. **Reutilización:** baja.
6. **Referencias:** Codrops `?p=49770` y `?p=86085` [V-snippet].
7. **¿Proyectos reales?** 🧪 Solo en campañas o heroes especiales, con el texto duplicado en el DOM.

**A10 — E14 Fuente variable animada**
1. **Por qué destaca:** tipografía que "respira" con el cursor o el scroll.
2. **Cómo funciona:** el input se mapea a `font-variation-settings`.
3. **Tecnologías:** CSS + JS (`quickTo` sobre variables CSS).
4. **Dificultad:** baja.
5. **Reutilización:** media.
6. **Referencias:** 24 ways, Val Head [V-snippet].
7. **¿Proyectos reales?** ✅ Sí, en titulares (provoca repaint [V-snippet]).

---

## B. 10 animaciones de scroll

| # | Efecto | Impacto | Dificultad | Reutil. | ¿Real? |
| --- | --- | --- | --- | --- | --- |
| B1 | E16 Smooth scroll sincronizado (base) | 4 | 1 | 5 | ✅ |
| B2 | E19 Resaltado palabra a palabra | 4 | 1 | 5 | ✅ |
| B3 | E17 Scroll horizontal fijado | 5 | 3 | 4 | ✅ |
| B4 | E21 Escalar a pantalla completa / clip-path | 5 | 2 | 5 | ✅ |
| B5 | E20 Tarjetas apiladas (sticky) | 4 | 1 | 5 | ✅ |
| B6 | E23 Parallax dentro de máscara | 3 | 1 | 5 | ✅ |
| B7 | E22 Cambios de tema por sección | 4 | 1 | 5 | ✅ |
| B8 | E18 Secuencia de imágenes estilo Apple | 5 | 3 | 4 | ⚠️ |
| B9 | E24 Reveals y progreso sin JS (CSS) | 3 | 1 | 5 | ✅ |
| B10 | E25 Marquee o skew por velocidad | 3 | 1 | 4 | ✅ |

**B1 — E16 Smooth scroll sincronizado**
1. **Por qué:** es la base de todo lo demás; sin la sincronización hay jitter medible.
2. **Cómo funciona:** Lenis dentro del ticker de GSAP y `ScrollTrigger.update` en cada scroll.
3. **Tecnologías:** Lenis + GSAP.
4. **Dificultad:** baja, pero con una trampa en React que hay que conocer.
5. **Reutilización:** `<SmoothScroll>` en el layout.
6. **Referencias:** lab 01 (0 frames con desfase frente a 38) [L], lab next-r3f (bug del ref) [L], README de Lenis [V].
7. **¿Proyectos reales?** ✅ Sí. Valorar desactivarlo en móvil si hay WebGL de scroll.

**B2 — E19 Resaltado palabra a palabra**
1. **Por qué:** convierte un párrafo de misión en un momento narrativo.
2. **Cómo funciona:** palabras con `opacity` 0.12 → 1 en stagger con scrub.
3. **Tecnologías:** SplitText + ScrollTrigger.
4. **Dificultad:** baja.
5. **Reutilización:** `<ScrollHighlight>`.
6. **Referencias:** About [L], codrops/OnScrollTextHighlight [V].
7. **¿Proyectos reales?** ✅ Sí.

**B3 — E17 Scroll horizontal fijado**
1. **Por qué:** cambio de eje en la narrativa; ideal para servicios, procesos y casos.
2. **Cómo funciona:** pin del contenedor, `x` del track con `ease: 'none'` e hijos con `containerAnimation`.
3. **Tecnologías:** ScrollTrigger.
4. **Dificultad:** media (restricciones de `containerAnimation` [V-snippet]).
5. **Reutilización:** `<HorizontalScroll>` con versión vertical en móvil.
6. **Referencias:** About [L], codrops/ScrollPanels [V].
7. **¿Proyectos reales?** ✅ Sí, en escritorio; en móvil, pila vertical.

**B4 — E21 Escalar a pantalla completa / clip-path**
1. **Por qué:** una imagen o vídeo que "absorbe" la pantalla es de los efectos más cinematográficos con coste mínimo.
2. **Cómo funciona:** sección fijada; `clip-path` o `scale` hasta pantalla completa con scrub.
3. **Tecnologías:** ScrollTrigger (CSS `view()` como alternativa).
4. **Dificultad:** baja-media.
5. **Reutilización:** `<ExpandMedia>`.
6. **Referencias:** Codrops OnScrollShapeMorph [V], foro de GSAP [V-snippet].
7. **¿Proyectos reales?** ✅ Sí.

**B5 — E20 Tarjetas apiladas (sticky)**
1. **Por qué:** muestra servicios o valores con profundidad y sin JS pesado.
2. **Cómo funciona:** `position: sticky` con `top` escalonado; la tarjeta anterior se escala.
3. **Tecnologías:** CSS (+ ScrollTrigger o `view()`).
4. **Dificultad:** baja.
5. **Reutilización:** `<StackCards>`.
6. **Referencias:** CodyHouse [V-snippet], codrops/3DStackMotion [V].
7. **¿Proyectos reales?** ✅ Sí. Funciona muy bien en móvil.

**B6 — E23 Parallax dentro de máscara**
1. **Por qué:** profundidad sutil en todas las imágenes del sitio.
2. **Cómo funciona:** imagen escalada que se desplaza en `yPercent` dentro de un contenedor con `overflow: hidden`.
3. **Tecnologías:** ScrollTrigger o CSS `view()`.
4. **Dificultad:** baja.
5. **Reutilización:** `<ParallaxImage>` sobre `next/image`.
6. **Referencias:** codrops/ScrollAnimationsGrid [V].
7. **¿Proyectos reales?** ✅ Sí.

**B7 — E22 Cambios de tema por sección**
1. **Por qué:** ritmo visual entre capítulos (claro y oscuro de marca).
2. **Cómo funciona:** `data-theme` por sección; ScrollTrigger anima variables CSS en `:root`.
3. **Tecnologías:** ScrollTrigger (o CSS `view()`).
4. **Dificultad:** baja.
5. **Reutilización:** `<ThemeSection theme="dark">`.
6. **Referencias:** foro de GSAP [V-snippet].
7. **¿Proyectos reales?** ✅ Sí. Verificar el contraste en cada tema.

**B8 — E18 Secuencia de imágenes estilo Apple** *(también: alternativa a Three.js para productos)*
1. **Por qué:** realismo de render 3D sin WebGL.
2. **Cómo funciona:** frames precargados dibujados en un canvas según el progreso del scroll.
3. **Tecnologías:** canvas 2D + ScrollTrigger.
4. **Dificultad:** media (pipeline de assets).
5. **Reutilización:** `useImageSequence` / `<ImageSequence>`.
6. **Referencias:** lab 07 (237 MB para 120 frames) [L], BSMNT ImageSequenceCanvas [V].
7. **¿Proyectos reales?** ⚠️ Sí, con presupuesto de memoria y frames reducidos en móvil.

**B9 — E24 Reveals y progreso sin JS**
1. **Por qué:** animación de entrada en todo el sitio con coste de JS cero.
2. **Cómo funciona:** `animation-timeline: view()/scroll()` dentro de `@supports`.
3. **Tecnologías:** CSS.
4. **Dificultad:** baja.
5. **Reutilización:** utilidades CSS (`.reveal`, `.progress`).
6. **Referencias:** lab 03 [L], WebKit [V-snippet].
7. **¿Proyectos reales?** ✅ Sí, como mejora progresiva (no es Baseline [V]).

**B10 — E25 Marquee o skew por velocidad**
1. **Por qué:** el sitio "reacciona" a la energía del scroll.
2. **Cómo funciona:** la velocidad de Lenis se aplica a `timeScale` o a `skewY` con `quickTo`.
3. **Tecnologías:** Lenis + GSAP.
4. **Dificultad:** baja.
5. **Reutilización:** `<VelocityMarquee>`.
6. **Referencias:** About [L].
7. **¿Proyectos reales?** ✅ Sí.

---

## C. 5 experiencias con Three.js

| # | Efecto | Impacto | Dificultad | Reutil. | ¿Real? |
| --- | --- | --- | --- | --- | --- |
| C1 | E01 3D Scroll Product / Logo Reveal | 5 | 4 | 4 | ✅ |
| C2 | E04 Imágenes WebGL sincronizadas con el DOM | 5 | 4 | 5 | ⚠️ |
| C3 | E02 Campo de partículas reactivo | 5 | 3–5 | 4 | ⚠️ |
| C4 | E03 Recorrido de cámara por scroll | 5 | 5 | 3 | 🧪 |
| C5 | E05 Transición entre escenas con shader | 5 | 5 | 3 | 🧪 |

**C1 — E01 3D Scroll Product / Logo Reveal**
1. **Por qué:** es el formato más reconocible de "experiencia inmersiva" y ya está validado con el isologo de Savvy.
2. **Cómo funciona:** una timeline de GSAP con scrub anima un estado mutable; `useFrame` lo aplica; `invalidate()` en `onUpdate`.
3. **Tecnologías:** R3F + drei + GSAP + Lenis.
4. **Dificultad:** alta (sobre todo el modelo y la dirección de arte).
5. **Reutilización:** `<ScrollModel src keyframes>` con keyframes por sección.
6. **Referencias:** About + lab next-r3f (0 renders en reposo, sin fugas entre rutas) [L], Codrops RotatingOnScrollAnimations [V].
7. **¿Proyectos reales?** ✅ Sí, con modelo optimizado y póster de respaldo.

**C2 — E04 Imágenes WebGL sincronizadas con el DOM** *(también: es la base de A3, A6 y A7)*
1. **Por qué:** desbloquea toda la familia de efectos de imagen manteniendo layout, SEO y accesibilidad en el DOM.
2. **Cómo funciona:** canvas fijo, cámara ortográfica en px y un plano por `[data-gl]` sincronizado en cada scroll de Lenis.
3. **Tecnologías:** three/R3F + Lenis (+ drei `View`).
4. **Dificultad:** alta la primera vez y baja después.
5. **Reutilización:** muy alta (infraestructura).
6. **Referencias:** lab 05 (0 px de error, 0 renders en reposo) [L], r3f-scroll-rig [V].
7. **¿Proyectos reales?** ⚠️ Sí en escritorio; en móvil valorar desactivarlo [V].

**C3 — E02 Campo de partículas reactivo**
1. **Por qué:** fondos vivos y logos que se forman con partículas; muy "tech".
2. **Cómo funciona:** `Points` + vertex shader con uniforms (`uMouse`, `uProgress`); GPGPU para física.
3. **Tecnologías:** three/R3F + GLSL (TSL/WebGPU opcional).
4. **Dificultad:** media (Points) / alta (GPGPU).
5. **Reutilización:** `<ParticleField shape count>`.
6. **Referencias:** `webgl_gpgpu_birds` [V], `webgpu_compute_particles` [V], partículas de About [L].
7. **¿Proyectos reales?** ⚠️ Sí, con número adaptativo (`PerformanceMonitor`) y pausa fuera del viewport.

**C4 — E03 Recorrido de cámara por scroll**
1. **Por qué:** storytelling espacial de máximo impacto.
2. **Cómo funciona:** el progreso se mapea a `CatmullRomCurve3.getPointAt` + `lookAt`; la escena puede venir de Blender.
3. **Tecnologías:** three/R3F + GSAP (o drei `ScrollControls`).
4. **Dificultad:** muy alta (contenido 3D).
5. **Reutilización:** media.
6. **Referencias:** Codrops `?p=117076` [V-snippet], drei `ScrollControls` [V].
7. **¿Proyectos reales?** 🧪 Solo en campañas o lanzamientos, con presupuesto 3D.

**C5 — E05 Transición entre escenas con shader**
1. **Por qué:** cambios de capítulo cinematográficos dentro de una experiencia 3D.
2. **Cómo funciona:** dos render targets mezclados con una máscara de ruido según `uProgress`.
3. **Tecnologías:** three/R3F (`useFBO`) + GLSL/TSL.
4. **Dificultad:** muy alta.
5. **Reutilización:** media.
6. **Referencias:** Codrops Interlude [V].
7. **¿Proyectos reales?** 🧪 Solo dentro de experiencias que ya tienen 3D.

---

## D. 5 transiciones entre páginas

| # | Efecto | Impacto | Dificultad | Reutil. | ¿Real? |
| --- | --- | --- | --- | --- | --- |
| D1 | E26 Morph de elemento compartido (`<ViewTransition>`) | 5 | 2 | 5 | ✅ |
| D2 | E28 Reveal circular desde el clic | 4 | 1 | 5 | ✅ |
| D3 | E27 Overlay / cortina | 4 | 3 | 5 | ✅ |
| D4 | E29 Flip de elemento compartido (en la misma ruta) | 4 | 3 | 4 | ✅ |
| D5 | E30 Transición con shader | 5 | 5 | 3 | 🧪 |

**D1 — E26 `<ViewTransition>`**
1. **Por qué:** continuidad visual entre rutas (grid → detalle) sin librerías.
2. **Cómo funciona:** el mismo `name` en las dos rutas; la navegación es una transition y el navegador hace el morph.
3. **Tecnologías:** React 19.3 + Next 16.x + View Transitions API.
4. **Dificultad:** baja-media.
5. **Reutilización:** muy alta.
6. **Referencias:** docs de Next en el paquete [V], vercel-labs/react-view-transitions-demo [V], lab next-r3f [L].
7. **¿Proyectos reales?** ✅ Sí. Es la opción por defecto; sin soporte, simplemente no anima.

**D2 — E28 Reveal circular desde el clic**
1. **Por qué:** la página nueva "nace" del botón pulsado.
2. **Cómo funciona:** coordenadas del clic en variables CSS y `clip-path: circle()` sobre `::view-transition-new(root)`.
3. **Tecnologías:** CSS + View Transitions (o GSAP).
4. **Dificultad:** baja.
5. **Reutilización:** muy alta.
6. **Referencias:** codrops/UnrevealEffects [V].
7. **¿Proyectos reales?** ✅ Sí.

**D3 — E27 Overlay / cortina**
1. **Por qué:** transición de marca (color o logo en la cortina).
2. **Cómo funciona:** `leave` cubre la pantalla con GSAP, `next()`, y `enter` la descubre.
3. **Tecnologías:** next-transition-router + GSAP.
4. **Dificultad:** media.
5. **Reutilización:** alta.
6. **Referencias:** ismamz/next-transition-router [V], Codrops Interlude [V].
7. **¿Proyectos reales?** ✅ Sí. Atrás y adelante del navegador no animan [V]; paquete en beta.

**D4 — E29 Flip de elemento compartido**
1. **Por qué:** filtros, expansiones y carrito animados con elementos vivos (interrumpibles).
2. **Cómo funciona:** `Flip.getState` → cambio del DOM → `Flip.from`.
3. **Tecnologías:** GSAP Flip.
4. **Dificultad:** media.
5. **Reutilización:** alta.
6. **Referencias:** lab 04 [L], codrops/MenuToGrid [V].
7. **¿Proyectos reales?** ✅ Sí, dentro de una ruta. Entre rutas, mejor D1.

**D5 — E30 Transición con shader**
1. **Por qué:** máxima espectacularidad (ruido, tinta, píxeles).
2. **Cómo funciona:** un canvas persistente en el layout; `uProgress` tapa y descubre la página alrededor del cambio de ruta.
3. **Tecnologías:** three/R3F + GLSL/TSL + router de transiciones.
4. **Dificultad:** alta.
5. **Reutilización:** media.
6. **Referencias:** Codrops Interlude [V], Codrops `?p=110760` [V-snippet].
7. **¿Proyectos reales?** 🧪 Solo si el sitio ya tiene un canvas global; siempre con fallback CSS.

---

## E. 5 componentes interactivos

| # | Efecto | Impacto | Dificultad | Reutil. | ¿Real? |
| --- | --- | --- | --- | --- | --- |
| E1 | E31 Botón magnético | 4 | 1 | 5 | ✅ |
| E2 | E35 Menú fullscreen animado | 5 | 2 | 5 | ✅ |
| E3 | E32 Cursor personalizado | 4 | 1 | 4 | ⚠️ |
| E4 | E33 Tarjetas con tilt 3D | 3 | 1 | 5 | ✅ |
| E5 | E34 Rastro de imágenes / preview con el cursor | 4 | 2 | 4 | ✅ |

**E1 — E31 Botón magnético**
1. **Por qué:** los CTA se sienten "vivos".
2. **Cómo funciona:** el offset del puntero al centro × fuerza va a `quickTo`; al salir, vuelve con un ease elástico.
3. **Tecnologías:** GSAP `quickTo`.
4. **Dificultad:** baja.
5. **Reutilización:** `useMagnetic` + `<MagneticButton>`.
6. **Referencias:** lab 08 (0 tweens nuevos frente a 200) [L], codrops/MagneticButtons [V].
7. **¿Proyectos reales?** ✅ Sí, solo con `(hover: hover)`.

**E2 — E35 Menú fullscreen animado** *(también: usa A1 para los links)*
1. **Por qué:** es el componente más visto en móvil y el que más eleva la percepción de calidad.
2. **Cómo funciona:** overlay con `clip-path` y links con reveal por líneas; Lenis parado; foco atrapado.
3. **Tecnologías:** GSAP + SplitText (+ Lenis).
4. **Dificultad:** baja-media.
5. **Reutilización:** muy alta.
6. **Referencias:** codrops/MultiboxMenu [V], codrops/ExpandingRoundedMenu [V].
7. **¿Proyectos reales?** ✅ Sí, con `aria-expanded`, `Escape` y trampa de foco.

**E3 — E32 Cursor personalizado**
1. **Por qué:** refuerza la personalidad de marca y comunica estados ("ver", "arrastrar").
2. **Cómo funciona:** un elemento fijo sigue al puntero con `quickTo`; `mix-blend-mode: difference`; estados con `data-cursor`.
3. **Tecnologías:** CSS + GSAP.
4. **Dificultad:** baja.
5. **Reutilización:** `<Cursor>` global.
6. **Referencias:** codrops/GooeyCursor [V], cursor glow de About [L].
7. **¿Proyectos reales?** ⚠️ Sí, pero **sin ocultar el cursor nativo** y nunca en táctil.

**E4 — E33 Tarjetas con tilt 3D**
1. **Por qué:** profundidad en equipo, servicios y casos con muy poco código.
2. **Cómo funciona:** el puntero se mapea a `rotateX/Y` con `perspective` + brillo radial; hijos en `translateZ`.
3. **Tecnologías:** CSS 3D + GSAP.
4. **Dificultad:** baja.
5. **Reutilización:** `<TiltCard>`.
6. **Referencias:** vanilla-tilt.js [V-snippet], tarjetas de About [L].
7. **¿Proyectos reales?** ✅ Sí.

**E5 — E34 Rastro de imágenes / preview con el cursor**
1. **Por qué:** listas de proyectos o servicios que muestran imágenes al pasar el cursor; muy de agencia.
2. **Cómo funciona:** un pool de imágenes reposicionadas al superar una distancia umbral, o una preview que sigue al cursor por ítem.
3. **Tecnologías:** GSAP.
4. **Dificultad:** baja-media.
5. **Reutilización:** `<HoverPreviewList>` / `<ImageTrail>`.
6. **Referencias:** codrops/ImageTrailEffects [V], codrops/RapidImageHoverMenu [V], codrops/MotionTrailAnimations (touch) [V].
7. **¿Proyectos reales?** ✅ Sí.

---

## Efectos en varias categorías

| Efecto | Lista principal | También relevante en |
| --- | --- | --- |
| E04 DOM → WebGL | C2 (Three.js) | Base de A3, A6 y A7 (imagen) |
| E12 Split text | A1 (visual) | Lo usan B2, E2 y la intro A2 |
| E15 Intro | A2 (visual) | Three.js (si incluye el modelo), scroll (Lenis parado) |
| E18 Secuencia de imágenes | B8 (scroll) | Alternativa a C1 cuando no hay modelo 3D |
| E16 Smooth scroll | B1 (scroll) | Requisito de C1–C4, A3 y A7 |
| E29 Flip | D4 (transición) | Interactivo (filtros, grid → detalle) |

## Orden de implementación sugerido

**Fase 1 — Base (alto impacto, baja dificultad, máxima reutilización):**
B1 Smooth scroll · A1 Split reveal · B9 Reveals CSS · B6 Parallax · B2 Highlight · E1 Magnetic · E2 Menú · D1 `<ViewTransition>`

**Fase 2 — Secciones de marca:**
B4 Expand media · B3 Horizontal · B5 Stack cards · B7 Temas · B10 Marquee · E4 Tilt · E5 Hover preview · D2 Clip reveal · A4 Masked headline · A8 Scramble

**Fase 3 — 3D y WebGL (requiere aprobación de presupuesto y assets):**
C1 Logo/Producto 3D (migrar el de About a R3F) · C2 Infraestructura DOM → WebGL · A3 Distorsión en hover · A5 Shader slider · C3 Partículas

**Fase 4 — Piezas especiales (por campaña):**
B8 Secuencia de imágenes · A7 Galería WebGL · D3 Cortina de marca · C4 Cámara por scroll · C5/D5 Shaders de transición · A9 Kinetic 3D

## No recomendados (o solo con justificación)

- **Lenis + ScrollSmoother juntos:** dos sistemas compitiendo por el scroll [I].
- **`AnimatePresence` + FrozenRouter para salidas de ruta:** depende de internals de Next [V-snippet]. Usar D1 o D3.
- **r3f-scroll-rig sin verificar la compatibilidad** con R3F 9 / React 19 (última versión de 2024, peer `fiber >=8`) [V].
- **Three.js para fades, parallax, tilt o reveals:** CSS y GSAP lo hacen mejor y más barato.
- **drei `Environment preset` en producción:** depende de CDNs externos [V].
- **Animar `width`, `height` o `top`** en scroll: provoca layout y CLS.
