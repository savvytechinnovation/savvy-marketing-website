# Rendimiento, accesibilidad y mobile

Leyenda en el [README](./README.md#cómo-leer-las-afirmaciones). Números de [lab-results.md](./lab-results.md).

## 1. Qué animar

| Propiedad | Coste | Uso |
| --- | --- | --- |
| `transform`, `opacity` | Composición (GPU) | **Por defecto** [V] |
| `filter` | Composición en muchos casos (Motion lo acelera [V-snippet]) | Con moderación; `blur` grande es caro |
| `clip-path` | Paint barato | Reveals y máscaras |
| Colores, `background`, variables CSS | Repaint | Cambios de tema (aceptable) |
| `width`, `height`, `top`, `left`, `margin` | **Layout** | Evitar: provoca CLS si mueve otros elementos [V-snippet] |
| `font-variation-settings` | Repaint, sin GPU [V-snippet] | Solo titulares |

**`will-change`:** último recurso para problemas existentes, no para prevenirlos. Abusar de él consume memoria [V-snippet]. Activarlo y desactivarlo alrededor de la animación.

## 2. Un solo bucle de animación

- **GSAP ticker como rAF único:** Lenis (`autoRaf: false`) y ScrollTrigger dentro del ticker [V][L].
- **three vanilla:** `renderer.setAnimationLoop` **o** el ticker de GSAP, nunca dos bucles para la misma escena.
- **R3F:** su propio loop; con `frameloop="demand"` solo dibuja tras `invalidate()` [V][L].
- **Pausar** cuando la pestaña no es visible (`visibilitychange`; el rAF ya se pausa) y cuando la sección sale del viewport (IntersectionObserver).

## 3. WebGL: GPU y memoria

| Práctica | Evidencia |
| --- | --- |
| Render bajo demanda | 0 renders en reposo frente a un render por frame [L] |
| Instancing | 2582 → 1 draw calls para 3000 objetos [L]. Objetivo: unos cientos [V] |
| `dispose()` | Sin él, +40 geometrías y +40 texturas vivas [L] |
| DPR limitado | `dpr={[1, 2]}`; móvil ≤ 1.5 [I]; `AdaptiveDpr` [V] |
| Texturas | ≤ 2048 px; KTX2 para VRAM; WebP/AVIF para descarga [V] |
| Modelos | `gltf-transform optimize` (Meshopt + compresión de texturas); gltfjsx `--transform` dice reducir un 70–90 % [V] |
| Postprocesado | Bloom y DOF son caros; desactivarlos con `PerformanceMonitor.onDecline` [V] |
| Contextos | Un canvas global en lugar de muchos (los navegadores limitan los contextos WebGL [V]) |

## 4. Core Web Vitals

| Métrica | Riesgo con experiencias animadas | Mitigación |
| --- | --- | --- |
| **LCP** | Hero con loader o con el `h1` en `opacity: 0` hasta que termina la intro [I] | Texto LCP visible pronto; loader ≤ 1–1.5 s; el 3D **no** es el elemento LCP (un póster sí puede serlo) |
| **CLS** | Animaciones de layout; fuentes que cambian los saltos de línea; imágenes sin tamaño | Solo `transform`/`opacity` [V-snippet]; `aspect-ratio`; `next/font`; SplitText `autoSplit` [L] |
| **INP** | rAF de JS y bucles de WebGL compiten con el hilo principal durante las interacciones [I] | Render bajo demanda; trabajo pesado fuera de los handlers; `startTransition` para trabajo de React [V] |
| **TBT / JS** | three + R3F + drei pesan mucho | `dynamic(..., { ssr: false })` [L], carga al acercarse al viewport, `LazyMotion` si se usa Motion [V-snippet] |

## 5. Evitar problemas de hidratación

- Todo acceso a `window`, `matchMedia` o `localStorage` dentro de efectos (`useGSAP`, `useEffect`).
- Las escenas 3D con `ssr: false` [L].
- SplitText y otras mutaciones del DOM **después** de hidratar (dentro de `useGSAP`) y reversibles [L].
- Resultado del lab: 0 errores de hidratación con App Router + Lenis + R3F + SplitText [L].

## 6. Mobile

| Tema | Recomendación |
| --- | --- |
| Smooth scroll | Touch nativo (`syncTouch: false` por defecto) [V]. Valorar desactivar Lenis en móvil si hay WebGL de scroll [V] |
| WebGL | DPR ≤ 1.5, menos partículas y segmentos, sin postprocesado; fallback estático si `PerformanceMonitor` cae [V][I] |
| Hover | Efectos de cursor solo con `(hover: hover) and (pointer: fine)` [L] |
| Pins largos | Acortarlos o convertirlos en flujo vertical (`gsap.matchMedia`) [L] |
| Scroll horizontal | Pila vertical o carrusel con swipe [L] |
| Secuencias de imágenes | Menos frames y menor resolución: 237 MB con 120 × 960×540 [L] |
| Alturas | `svh/dvh` en lugar de `vh` |
| Safari | Lenis limitado a 60 fps (30 en bajo consumo) [V]; filtros SVG caros [V-snippet]; probar en dispositivo real (no se hizo en esta investigación) |

## 7. Accesibilidad y `prefers-reduced-motion`

| Capa | Cómo |
| --- | --- |
| CSS | `@media (prefers-reduced-motion: reduce)` desactiva keyframes y View Transitions |
| GSAP | `gsap.matchMedia()` con `(prefers-reduced-motion: no-preference)`: las animaciones ni se crean [L] |
| Lenis | `respectReducedMotion: true` por defecto → sin interpolación [V][L] |
| Motion | `<MotionConfig reducedMotion="user">` / `useReducedMotion()` [V] |
| R3F | Pose estática, sin auto-rotación; `invalidate` solo con interacción |

Otros:
- Canvas `aria-hidden` y contenido real en el DOM.
- Texto dividido con `aria: 'auto'` [L].
- Foco visible siempre (no ocultar el cursor nativo).
- Menús con trampa de foco.
- Las transiciones de ruta deben mover el foco.
- Sin parpadeos de más de 3 por segundo.

## 8. Fallbacks

1. **Sin JS:** todo el contenido visible y legible (HTML del servidor) [L].
2. **Sin WebGL o con error:** `loading` de `dynamic` → póster; `onFallback` de `PerformanceMonitor` → imagen estática.
3. **Sin soporte de CSS scroll-driven:** `@supports` y la animación simplemente no ocurre (o IntersectionObserver).
4. **Sin View Transitions:** la navegación funciona sin animación [V].
5. **Reduced motion:** estados finales estáticos.

## 9. Medir

- Chrome DevTools → Performance (frames, long tasks), Rendering → Paint flashing y Layout shift regions.
- `renderer.info` (draw calls, geometrías, texturas) y `stats-gl` o r3f-perf durante el desarrollo [V para stats-gl en Folio 2025].
- Lighthouse / PageSpeed para LCP, CLS y TBT. Lighthouse CI con budgets, como Satūs [V].
- **Dispositivos reales** de gama media (Android) y iPhone. Los números del lab con SwiftShader no sustituyen esto.
