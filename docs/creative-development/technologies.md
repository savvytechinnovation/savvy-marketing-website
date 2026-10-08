# Tecnologías: comparativa y cuándo usar cada una

Versiones publicadas en npm a 8 de octubre de 2026 [V]. Leyenda en el [README](./README.md#cómo-leer-las-afirmaciones).

## Resumen de versiones

| Paquete | Versión | Licencia | Notas clave |
| --- | --- | --- | --- |
| `three` | 0.186.1 (r186) | MIT | Exports `three`, `three/webgpu`, `three/tsl`, `three/addons` [V] |
| `@react-three/fiber` | 9.8.1 | MIT | Peer `react >=19 <19.4`; v8 = React 18, v9 = React 19 [V]. Existe `10.0.0-alpha` (contenido no verificado) |
| `@react-three/drei` | 10.7.9 | MIT | Peer `@react-three/fiber ^9` [V] |
| `@react-three/postprocessing` | 3.1.3 | MIT | Peer `fiber >=9.7.0` [V] |
| `gsap` | 3.15.0 | "Standard no-charge license" | **Gratis con todos los plugins**, también en uso comercial [V]. No es MIT |
| `@gsap/react` | 2.1.2 | — | Hook `useGSAP` [V] |
| `lenis` | 1.3.26 | MIT | Incluye `lenis/react`, `lenis/snap`, `lenis/vue` [V][L] |
| `motion` (antes Framer Motion) | 14.0.0 | MIT | Se importa desde `motion/react` [V] |
| `next` | 16.4.0 | MIT | `<ViewTransition>` de React 19.3 funciona sin configuración [V][L] |
| `react` | 19.3.0 | MIT | Exporta `ViewTransition` y `addTransitionType` [L] |
| `@14islands/r3f-scroll-rig` | 8.15.0 | MIT | Última versión de 12-2024; peer `fiber >=8`. **Compatibilidad con R3F 9 / React 19 no verificada** |
| `next-transition-router` | 0.2.11 | MIT | Beta; Next 14+ App Router [V] |
| `next-view-transitions` | 0.3.5 | MIT | Solo casos básicos; no cubre Suspense ni streaming según su propio README [V] |
| `@barba/core` | 2.10.3 | MIT | Sin versiones desde 08-2024 [V] |
| `@gltf-transform/cli` | 4.5.1 | MIT | Compresión de modelos y texturas [V] |
| `gltfjsx` | 6.5.3 | MIT | GLB → componente JSX/TSX [V] |

---

## Three.js

**Qué es:** motor 3D sobre WebGL2 y, cada vez más, WebGPU.

- **WebGPURenderer** [V]: desarrollo muy activo (r184–r186). Si el navegador no tiene WebGPU, cae automáticamente a un backend WebGL2
  y avisa con *"WebGPU is not available, running under WebGL2 backend"* (código fuente). `forceWebGL: true` fuerza WebGL2.
  La inicialización es asíncrona (`await renderer.init()`).
- **TSL (Three Shading Language)** [V]: shaders como nodos en JavaScript que compilan a WGSL (WebGPU) o GLSL (WebGL2). La wiki oficial
  lo presenta como el sustituto de `onBeforeCompile`.
- **Soporte de WebGPU** [V] (wiki gpuweb): Chrome/Edge 113+ en Windows, macOS y ChromeOS; Android 12+ desde Chrome 121 (con GPUs concretas);
  Linux parcial; Firefox 141+ en Windows y 145+/147+ en macOS; **Safari 26** activado por defecto en macOS, iOS y iPadOS.

**Úsalo cuando:** necesitas geometría 3D real, iluminación, partículas en GPU, shaders sobre imágenes o una escena continua.
**No lo uses** para fades, slides, parallax, reveals de texto ni efectos de hover que CSS o GSAP resuelven.

## React Three Fiber (R3F) + drei

**Qué es:** un renderer de React para Three.js. Los objetos 3D se escriben como JSX y heredan el ciclo de vida de React.

- **Ventajas en Next.js** [V][L]: montaje y desmontaje declarativos con `dispose()` automático; `frameloop="demand"` + `invalidate()`;
  drei aporta `View`, `ScrollControls`, `useGLTF`, `Environment`, `PerformanceMonitor`, `AdaptiveDpr`, `Instances`, `shaderMaterial` y `Text`.
- **Reglas** [V]: nunca hacer `setState` dentro de `useFrame`; mutar refs; no crear objetos en cada frame; usar `getState()` en lugar de suscripciones reactivas.
- **Next.js** [V][L]: `transpilePackages: ['three']`; el `<Canvas>` va en un componente `'use client'`, cargado con `dynamic(..., { ssr: false })`
  desde otro componente cliente (la opción `ssr: false` solo se permite en componentes cliente).
- **WebGPU en R3F 9** [V]: `gl={async (props) => { const r = new WebGPURenderer(props); await r.init(); return r }}`. La guía de migración lo marca
  como trabajo en curso.

**Úsalo cuando:** el proyecto ya es React/Next y la escena tiene que convivir con estado de React, rutas y componentes reutilizables.
**Vanilla Three.js** sigue siendo mejor para sitios sin React (como la página About actual, en Vite) o escenas con un bucle propio muy controlado.

## GSAP + ScrollTrigger (+ SplitText, Flip, Observer…)

**Qué es:** un motor de animación imperativo sobre timelines. ScrollTrigger vincula animaciones a la posición del scroll (`scrub`),
fija secciones (`pin`) y hace scroll horizontal (`containerAnimation`).

- **Licencia** [V]: gratis al 100 % desde la 3.13 (abril de 2025), incluidos SplitText, MorphSVG, DrawSVG, ScrambleText, Inertia y ScrollSmoother.
  Todos vienen en el paquete público [L].
- **React** [V]: `useGSAP({ scope, dependencies, revertOnUpdate })` hace la limpieza con `gsap.context()` y es seguro con SSR (isomorphic layout effect).
  `contextSafe()` envuelve los handlers que se ejecutan más tarde.
- **Responsive / a11y** [V]: `gsap.matchMedia()` crea y revierte animaciones por media query, incluida `prefers-reduced-motion` [L].

**Úsalo cuando:** necesitas timelines secuenciales, scroll storytelling, pin, scrub, animación de texto o coreografía entre DOM y WebGL.
Es la herramienta por defecto para el 80 % de los efectos de este catálogo.

## Lenis

**Qué es:** smooth scroll ligero que trabaja **sobre el scroll nativo** [V], de modo que `position: sticky`, las anclas, la barra de scroll y la accesibilidad siguen funcionando.

- Opciones clave [V]: `lerp` (0.1), `duration` (1.2), `smoothWheel`, `syncTouch` (desactivado por defecto; inestable en iOS < 16), `autoRaf`, `anchors`,
  `prevent`, `allowNestedScroll`, `orientation`, `respectReducedMotion` (por defecto `true`) y el atributo `data-lenis-prevent`.
- Limitaciones [V]: Safari a 60 fps como máximo (30 en modo de bajo consumo); no funciona sobre iframes; `position: fixed` puede ir con retraso en Safari
  en Macs anteriores a M1; no soporta CSS scroll-snap (para eso existe `lenis/snap`).
- **Integración con GSAP** [V][L]: obligatoria cuando hay ScrollTrigger (ver el lab 01).

**Lenis vs ScrollSmoother (GSAP):** ScrollSmoother suaviza también el teclado y la barra de scroll y se integra de serie con GSAP, pero necesita un wrapper
`#smooth-wrapper/#smooth-content` y solo admite una instancia [V]. No se deben combinar ambos [I]. **Recomendación:** Lenis, porque no envuelve el DOM,
tiene un proveedor para React y conserva el comportamiento nativo.

## Motion (antes Framer Motion)

**Qué es:** animación declarativa para React (`motion/react`) [V].

- APIs [V]: `useScroll`, `useTransform`, `useSpring`, `useInView`, `AnimatePresence`, `layout`/`layoutId`, `MotionConfig reducedMotion="user"` y `useReducedMotion`.
- Las animaciones de scroll usan `ScrollTimeline` nativo cuando el navegador lo soporta [V-snippet], así que pueden ir fuera del hilo principal.
- Tamaño: con `LazyMotion` + `m`, `domAnimation` añade unos 15 kB y `domMax` unos 25 kB [V-snippet] (conviene medirlo).

**Úsalo cuando:** son microinteracciones de UI ligadas al estado de React (menús, modales, listas, layout animations, presencia y salida de componentes).
**GSAP es mejor** para timelines largas, scroll storytelling con pin, SplitText y coordinación con WebGL.

## CSS nativo

| Técnica | Soporte | Uso recomendado |
| --- | --- | --- |
| `transition` / `@keyframes` | Universal | Hover, focus, estados, loaders |
| Scroll-driven animations (`animation-timeline: scroll()/view()`) | Chrome/Edge 115+, Safari 26+, Firefox solo con flag. **No es Baseline** [V] | Reveals, barras de progreso y parallax simple como mejora progresiva con `@supports` [L] |
| View Transitions (mismo documento) | Chrome 111, Safari 18, Firefox 144. **Baseline "low" desde 10-2025** [V] | Cambios de estado y navegación SPA; React `<ViewTransition>` [L] |
| View Transitions entre documentos (`@view-transition`) | Chrome 126, Safari 18.2, **Firefox no** [V] | Sitios MPA |
| `clip-path`, `mask`, `mix-blend-mode`, `background-clip: text` | Amplio | Reveals, máscaras de texto, cursores |
| `position: sticky` | Universal | Tarjetas apiladas y layouts pegajosos sin JS |

## WebGL propio (raw, OGL, PixiJS)

- **OGL**: alternativa mínima a three.js usada en tutoriales de galerías de Codrops [V-snippet]. Conviene si solo hay planos con shaders y el peso importa.
- **PixiJS**: 2D en WebGL con filtros de desplazamiento (Liquid Distortion de Codrops) [V].
- **WebGL a mano**: solo para equipos con experiencia en gráficos. El coste de mantenimiento es alto.

---

## Matriz de decisión

| Efecto | CSS | GSAP | Motion | Three.js | R3F | WebGL propio |
| --- | --- | --- | --- | --- | --- | --- |
| Hover, focus, estados | ✅ | — | ✅ (en React) | ❌ | ❌ | ❌ |
| Fade o slide al entrar en pantalla | ✅ (`view()` + fallback) | ✅ | ✅ `whileInView` | ❌ | ❌ | ❌ |
| Scroll storytelling con pin y scrub | ⚠️ limitado | ✅✅ | ⚠️ | — | — | — |
| Scroll horizontal fijado | ❌ | ✅✅ `containerAnimation` | ⚠️ | — | — | — |
| Split text / kinetic type en DOM | ⚠️ | ✅✅ SplitText | ✅ | ❌ | ❌ | ❌ |
| Transiciones de layout en React | ⚠️ View Transitions | ✅ Flip | ✅✅ `layoutId` | — | — | — |
| Transición entre rutas | ✅ `<ViewTransition>` | ✅ con un router de transiciones | ⚠️ (problemas de salida en App Router) | — | — | ✅ (shader) |
| Distorsión de imagen | ⚠️ filtros SVG | ❌ | ❌ | ✅ | ✅✅ | ✅ |
| Modelo 3D o producto | ❌ | — | — | ✅ | ✅✅ | ❌ |
| Partículas (miles o más) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Secuencia de frames con scroll | — | ✅ (canvas 2D) | — | ❌ (innecesario) | ❌ | ❌ |

✅✅ = opción preferida · ✅ = válida · ⚠️ = posible con límites · ❌ = desaconsejado.

**Regla general:** usar la herramienta más simple que consiga el efecto. **No recurrir a Three.js para nada que CSS o GSAP resuelvan
con transform y opacity.** WebGL solo cuando el efecto necesita píxeles o geometría que el DOM no puede producir.
