# Resultados de las pruebas de código (labs)

Código en [`labs/`](../../labs/README.md). Ejecutado el 8 de octubre de 2026 en **Chromium 141 headless con SwiftShader (GL por software)**.

- Labs 01–08: `node labs/run-labs.mjs` → `labs/results/results.json`. También están publicados en `/labs/` del sitio desplegado,
  donde cada lab muestra sus mediciones en un panel, con la GPU real del dispositivo que lo abre.
- Lab Next.js: `cd labs/next-r3f && npm run build && npm test` → `labs/next-r3f/results.json`

> **Cómo interpretar los números.** Los conteos (frames, renders, draw calls, objetos en GPU, píxeles de error) son
> deterministas y fiables. Los tiempos en milisegundos vienen de una GPU emulada por CPU: solo sirven para comparar
> dentro de una ejecución. No reflejan FPS en dispositivos reales.

## Lab 01 — Lenis + ScrollTrigger: ¿hace falta sincronizarlos?

**Montaje:** una sección fija (`pin`) con un tween `scrub: true`, recorrida con 40 eventos de rueda reales.
La medición se hace justo antes del paint (callback de `ResizeObserver`, que corre después de todos los `requestAnimationFrame`),
así que refleja lo que ve el usuario en cada frame.

| Modo | Frames con scroll | Frames con la animación por detrás | Desfase máximo | Desplazamiento del pin |
| --- | --- | --- | --- | --- |
| `synced`: Lenis en `gsap.ticker` + `lenis.on('scroll', ScrollTrigger.update)` (receta oficial) | 163 | **0** | **0 px** | 0 px |
| `unsynced`: Lenis con `autoRaf: true`, sin conectar a ScrollTrigger | 165 | **38** | **44 px** | 0 px |
| `synced` + `prefers-reduced-motion: reduce` | 121 | 0 | 0 px | 0 px |

**Conclusiones**
- **[L]** Sin la sincronización, ScrollTrigger solo se entera del scroll por el evento nativo `scroll`, que llega un frame después
  de que Lenis mueva la página. Resultado: en el 23 % de los frames la animación pinta un estado viejo. Visualmente es *jitter*
  en elementos con scrub o con parallax.
- **[L]** Con `respectReducedMotion` (activo por defecto en Lenis 1.3.26 [V]), `lenis.prefersReducedMotion === true` y el scroll
  deja de interpolarse: hay menos frames con movimiento porque cada evento de rueda salta directamente.

## Lab 02 — GSAP SplitText (3.15)

| Comprobación | Resultado |
| --- | --- |
| `type: 'lines,words,chars'` sobre un titular | 3 líneas, 8 palabras, 43 caracteres |
| `mask: 'lines'` | 3 envoltorios con `overflow: clip` |
| `aria: 'auto'` | `aria-label` en el elemento padre con el texto completo; los fragmentos quedan dentro de `aria-hidden="true"` |
| `autoSplit: true` + cambio de ancho | Se re-divide sola: 3 → 7 líneas, `onSplit` ejecutado 2 veces |
| `revert()` | Restaura el HTML original exacto |

**[L]** SplitText resuelve en el plugin oficial lo que antes requería Splitting.js: accesibilidad, re-split responsive y limpieza.
Hay que esperar a `document.fonts.ready` o usar `autoSplit`.

## Lab 03 — Plataforma nativa (sin librerías)

| Comprobación (Chromium 141) | Resultado |
| --- | --- |
| `CSS.supports('animation-timeline: view()')` / `scroll()` | `true` / `true` |
| `ScrollTimeline` en JS | `true` |
| Reveal con `animation-timeline: view()`: opacidad antes de entrar / centrado | 0 → 1 |
| Barra de progreso con `scroll(root)` a mitad de página | `scaleX ≈ 0.34` (refleja el scroll real) |
| `document.startViewTransition` | disponible; la transición terminó en ~318 ms |

**[L]** Las animaciones de scroll con CSS funcionan sin JavaScript y fuera del hilo principal. **[V]** Soporte según MDN BCD: Chrome/Edge 115+,
Safari 26+, Firefox solo detrás de un flag. Hay que usarlas con `@supports` como mejora progresiva.

## Lab 04 — GSAP Flip (elemento compartido)

| Comprobación | Resultado |
| --- | --- |
| Primer frame tras mover el nodo del grid al contenedor de detalle | 0 px de diferencia con la posición original (no hay salto) |
| Final de la animación | 0 px de error respecto al contenedor destino |
| Limpieza de estilos inline | correcta |

## Lab 05 — Planos WebGL sincronizados con el DOM

Un único canvas fijo, una cámara ortográfica en píxeles CSS y un plano por cada `[data-gl]`, posicionado con `getBoundingClientRect()`.
Shader con curvatura según la velocidad de Lenis, ondas y separación RGB al hacer hover. Render bajo demanda.

| Métrica | Desktop 1280×800 | Mobile 390×844 @3x |
| --- | --- | --- |
| Renders durante 1 s en reposo | **0** | **0** |
| Error entre el plano proyectado y el rect del DOM tras el scroll | **0 px** | **0 px** |
| Draw calls por frame (planos fuera de pantalla descartados) | 3 | 3 |

**[L]** El patrón "DOM como layout + WebGL como capa visual" es viable sin librerías. El elemento del DOM sigue existiendo
(con `role="img"` y `aria-label`) para el layout, la accesibilidad y el fallback.

## Lab 06 — Rendimiento en Three.js

| Prueba | Resultado |
| --- | --- |
| 3000 mallas separadas | **~2580 draw calls** (las demás se descartan por frustum culling; varía entre ejecuciones por las posiciones aleatorias) |
| 3000 instancias en un `InstancedMesh` | **1 draw call** |
| Renders en 1 s de reposo: bucle continuo vs bajo demanda | 8 (limitado por el GL por software; en una GPU real serían ~60) vs **1** |
| Objetos en GPU tras quitar 40 mallas texturizadas **sin** `dispose()` | +40 geometrías, +40 texturas (fuga) |
| Lo mismo **con** `geometry/material/texture.dispose()` | +0 / +0 |

**Notas**
- **[L]** El tiempo por frame fue *peor* con instancing en SwiftShader (118 ms frente a 81 ms), porque la GPU emulada no tiene el coste de CPU
  por draw call que el instancing elimina, y el `InstancedMesh` no se descarta por partes. **No se puede concluir nada sobre FPS reales.**
  Lo verificable es la reducción de draw calls: el propio R3F recomienda como máximo unos 1000 y, idealmente, unos cientos [V].
- **[L]** Quitar una malla de la escena **no** libera memoria de GPU. En React, R3F hace `dispose()` al desmontar [V], salvo `<primitive>` y `dispose={null}`.

## Lab 07 — Secuencia de imágenes con scroll (canvas 2D)

| Métrica | Resultado |
| --- | --- |
| 120 frames de 960×540 decodificados como `ImageBitmap` | **237 MB** de memoria decodificada |
| Coste de `drawImage` por frame | ~0.06 ms |
| Frames pintados en un recorrido de rueda (redundantes omitidos) | 44; último frame = 119 (llega al final) |

**[L]** Dibujar es barato; el problema es la **memoria** (ancho × alto × 4 bytes × frames) y el peso de descarga. En móvil:
menos frames, menor resolución y carga progresiva, o un vídeo como alternativa.

## Lab 08 — Interacciones

| Comprobación | Desktop | Mobile + reduced motion |
| --- | --- | --- |
| Botón magnético con `gsap.to()` en cada `pointermove` (200 eventos en ráfaga) | 200 tweens creados y vivos | — |
| Mismo efecto con `gsap.quickTo()` | **0 tweens nuevos** (reutiliza uno por propiedad) | — |
| `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` | animación de entrada creada | **no se crea** |
| `(hover: hover) and (pointer: fine)` | `true` | `false`: hay que desactivar los efectos de cursor |

## Lab Next.js — Next 16.4 + React 19.3 + R3F 9.8.1 + drei 10.7.9 + Lenis + GSAP

Stack: App Router; `layout.tsx` como Server Component con un proveedor cliente `SmoothScroll` (`ReactLenis root`, `autoRaf: false`,
ticker de GSAP); escena R3F cargada con `dynamic(..., { ssr: false })` dentro de un componente cliente; `useGSAP` con `scope`
(ScrollTrigger con pin que escribe el progreso en un store mutable + `invalidate()`); SplitText bajo `gsap.matchMedia`;
`<ViewTransition name="page-title">` de React en dos rutas.

| Comprobación | Resultado |
| --- | --- |
| `next build` (TypeScript estricto) | ✓ Rutas `/` y `/about` generadas como estáticas |
| HTML del servidor contiene el `h1` y el texto de la sección | ✓ / ✓ |
| HTML del servidor contiene `<canvas>` | ✗ (correcto: solo un placeholder `scene-fallback`) |
| Errores de consola o hidratación (prod y dev) | **0** |
| Renders de R3F en 1 s de reposo (`frameloop="demand"`) | **0** |
| Renders durante el scroll | 24 (solo cuando cambia el progreso) |
| Navegar `/` → `/about` | ScrollTriggers 2 → **0**, canvas 1 → **0**, escena desmontada |
| Volver a `/` | ScrollTriggers **2** (sin duplicados), 1 canvas |
| Lenis global en el layout | creado 1 vez, persiste entre rutas |
| `document.startViewTransition` invocado por React al navegar | sí (3 llamadas en 2 navegaciones) |
| `next dev` (StrictMode monta los efectos dos veces) | 1 canvas, 1 pin-spacer, 2 ScrollTriggers: la limpieza de `useGSAP` y R3F funciona |
| Mobile 390×844 + reduced motion | SplitText no se crea (0 máscaras), 1 ScrollTrigger (solo el pin) |
| Avisos | `THREE.Clock: This module has been deprecated` (R3F 9.8.1 con three r186) |

### Bug encontrado y corregido en el lab

Primera versión del proveedor:

```tsx
useEffect(() => {
  const lenis = ref.current?.lenis;   // ← undefined en este momento
  if (!lenis) return;                 // ← sale sin conectar nada
  gsap.ticker.add((t) => lenis.raf(t * 1000));
}, []);
```

**Resultado medido:** `lenisCreated: 0` y **0 renders durante el scroll**: con `autoRaf: false`, Lenis intercepta la rueda pero nadie llama a `raf()`,
así que **la página no se desplaza** y no aparece ningún error. Corrección (igual que el README de `lenis/react` [V]): leer el ref dentro del tick
(`ref.current?.lenis?.raf(time * 1000)`) y sincronizar ScrollTrigger con `useLenis(() => ScrollTrigger.update())`. Tras el cambio: `lenisCreated: 1` y el scroll funciona.
