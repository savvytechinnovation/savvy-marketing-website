# Transiciones entre páginas

Efectos E26–E30 del catálogo. Leyenda en el [README](./README.md#cómo-leer-las-afirmaciones).

## 1. El problema en Next.js App Router

Al navegar, el App Router **desmonta la ruta saliente de inmediato**. Por eso:

- `AnimatePresence` de Motion **no ejecuta animaciones de salida** entre rutas sin trucos. El truco "FrozenRouter" congela `LayoutRouterContext`,
  un contexto **interno** de Next: es frágil y puede romperse entre versiones [V-snippet][I].
- `template.tsx` se vuelve a montar en cada navegación: sirve para **animaciones de entrada**, no de salida [V-snippet].
- Para la salida hay dos caminos sólidos: **retrasar la navegación** (router de transiciones) o la **View Transitions API** (el navegador hace un snapshot de la página saliente).

## 2. Opciones comparadas

| Opción | Salida | Entrada | Elemento compartido | Atrás/adelante | Dependencias | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| **React `<ViewTransition>`** (Next 16.x) | ✅ snapshot | ✅ | ✅ `name` | ✅ (navegación normal) [I] | Ninguna | Estable en React 19.3 / Next 16.4 [V][L] |
| **next-transition-router** + GSAP | ✅ `leave()` | ✅ `enter()` | ⚠️ manual | ❌ **no dispara** [V] | ~8 KB | Beta [V] |
| **next-view-transitions** (shuding) | ✅ | ✅ | ✅ | — | Pequeña | Solo casos básicos, sin Suspense ni streaming [V] |
| `template.tsx` + Motion/GSAP | ❌ | ✅ | ❌ | ✅ | — | Estable |
| Canvas WebGL persistente + router | ✅ | ✅ | ✅ (en 3D) | depende del router | three/R3F | Custom |

## 3. React `<ViewTransition>` (E26), la opción por defecto

**Verificado** en las docs incluidas en `next@16.4.0` [V] y en `labs/next-r3f` [L]:
- "View transitions work in the App Router with no configuration". React 19.3 incluye `<ViewTransition>` y `addTransitionType`.
- Se activan con transitions, `<Suspense>` y `useDeferredValue`. Las navegaciones del router son transitions; un `setState` normal **no** las activa.
- **Elemento compartido:** el mismo `name` en el origen y el destino → morph automático. En el lab, React llamó a `document.startViewTransition` al navegar [L].
- **Personalizar:** `share="morph"` + `default="none"` y CSS sobre `::view-transition-group(.morph)` / `::view-transition-old/new`.
- **Direccional:** `<Link transitionTypes={['forward']}>` (desde Next 16.2) + `addTransitionType`. El envoltorio direccional va en cada `page.tsx`, no en el layout,
  porque el layout persiste [V].
- **Fallback:** sin soporte del navegador, la navegación funciona sin animación [V].
- **Soporte del navegador [V]:** same-document en Chrome 111, Safari 18 y Firefox 144 (Baseline "low" desde 10-2025). Transition types en Firefox desde la 147.
  React usa transition types y `view-transition-class` (Chromium 125+ y Safari/Firefox recientes) [V].
- **Historia del flag:** `experimental.viewTransition` existió desde Next 15.2 (`unstable_ViewTransition`); en la 16.4 ya no aparece en el schema [V].

```tsx
// app/work/page.tsx y app/work/[slug]/page.tsx
import { ViewTransition } from 'react';
<ViewTransition name={`project-${slug}`}><Image … /></ViewTransition>
```

```css
::view-transition-old(root), ::view-transition-new(root) { animation-duration: .5s; }
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation: none; } }
```

## 4. Overlay / cortina con GSAP (E27)

`next-transition-router` [V]:

```tsx
<TransitionRouter
  auto
  leave={(next) => { const tl = gsap.timeline({ onComplete: next }).to('.curtain', { scaleY: 1, transformOrigin: 'bottom' }); return () => tl.kill(); }}
  enter={(next) => { const tl = gsap.timeline({ onComplete: next }).to('.curtain', { scaleY: 0, transformOrigin: 'top' }); return () => tl.kill(); }}
>
```

- `leave(next, from, to)` permite elegir la animación según la ruta.
- `data-transition-ignore` en los links que no deben animar.
- **Limitación:** atrás y adelante del navegador no animan [V]. Aceptable si la transición es decorativa.
- Catálogo de ideas: Codrops Interlude (curtain, wipe, circle, columns, stack, slide-over, peel, cube, tear) [V], codrops/PageRevealEffects [V], codrops/RotatedRevealers [V].
- **Combinación posible [I]:** la View Transitions API para el morph de contenido y una cortina corta en CSS con `::view-transition-new(root)`. Así se evita el router extra.

## 5. Reveal circular desde el clic (E28)

1. En el `onClick` del link, guardar `--x/--y` en `document.documentElement.style`.
2. Con View Transitions:
   ```css
   ::view-transition-new(root) { animation: reveal .6s ease-in-out; }
   @keyframes reveal { from { clip-path: circle(0% at var(--x) var(--y)); } to { clip-path: circle(150% at var(--x) var(--y)); } }
   ```
3. Sin View Transitions: un overlay con el mismo `clip-path` animado por GSAP en `leave`.

Referencias: codrops/UnrevealEffects [V] · Ahmad Shadeed sobre `clip-path` [V-snippet].

## 6. Flip de elemento compartido (E29)

Dentro de una misma ruta (grid → detalle, filtros, carrito), GSAP Flip es más flexible que View Transitions: anima elementos vivos (no snapshots),
admite interrupción e integra timelines. **Lab 04: sin salto inicial y 0 px de error final [L].**
Entre rutas reales, View Transitions (E26) cubre el caso sin overlays persistentes.

Referencias: codrops/MenuToGrid [V] · codrops/ScrollBasedLayoutAnimations [V] · Codrops "Large Image to Content Page Transition" (Lenis + Flip) [V-snippet].

## 7. Transición con shader (E30)

1. `app/layout.tsx` monta un `<TransitionCanvas/>` fijo (cliente, `dynamic` sin SSR) que **persiste** entre rutas.
2. En `leave`: GSAP anima el uniform `uProgress` (0 → 1) de un quad a pantalla completa con un shader de ruido, dither o tinta que tapa la página; `next()`.
3. En `enter`: `uProgress` (1 → 0).
4. Variante avanzada: capturar la página saliente como textura no es trivial (html2canvas es lento [I]). Mejor tapar con un color o patrón de marca, o usar una
   escena 3D persistente donde la cámara viaja entre "salas" [V-snippet].
5. Fallback: con reduced motion o sin WebGL, usar E27 o E26.

Referencias: Codrops Interlude (dither, dissolve, ink, particles en TSL, cargados en diferido) [V] · Codrops "Seamless 3D Transitions with Webflow, GSAP and Three.js" [V-snippet].

## 8. Accesibilidad en transiciones

- **Foco:** tras navegar, mover el foco al `<h1>` o `<main>` de la nueva página. El App Router anuncia los cambios de ruta [I]: verificarlo con un lector de pantalla.
- **Duración:** 300–700 ms. Más tiempo bloquea la navegación percibida e influye en el INP si hay trabajo JS durante la transición [I].
- **Reduced motion:** fundido corto o corte directo.
- **No bloquear:** si la transición falla (excepción en GSAP), la navegación debe completarse igualmente (`next()` en un `finally` [I]).

## 9. Recomendación

1. **Por defecto:** React `<ViewTransition>` (E26) para fundidos y morphs de elementos compartidos. Sin dependencias y probado [L].
2. **Marca o agencia:** una cortina o clip-path (E27/E28). Preferiblemente con CSS de View Transitions; next-transition-router si se necesita GSAP en la salida.
3. **Experiencias inmersivas:** un canvas persistente (E30) solo si el sitio ya tiene una escena 3D global.
