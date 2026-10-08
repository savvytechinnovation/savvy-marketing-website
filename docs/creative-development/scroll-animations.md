# Animaciones de scroll

Cómo funcionan las técnicas de scroll del catálogo (E16–E25, más E01 y E03 en 3D). Leyenda en el [README](./README.md#cómo-leer-las-afirmaciones).

## 1. Los tres motores de scroll

| Motor | Qué hace | Hilo | Cuándo |
| --- | --- | --- | --- |
| **Scroll nativo + CSS scroll-driven** (`animation-timeline`) | El navegador vincula una animación CSS al scroll | Compositor (fuera del hilo principal) | Reveals, progreso, parallax simple. Mejora progresiva [L] |
| **Scroll nativo + IntersectionObserver** | Dispara clases o animaciones al entrar o salir del viewport | Principal, pero sin cálculo por frame | Animaciones "una vez" (fade-in, contadores) |
| **Lenis + GSAP ScrollTrigger** | Lenis interpola la posición de scroll; ScrollTrigger mapea la posición a progreso, pin y callbacks | Principal (rAF) | Storytelling, pin, scrub, horizontal, sincronía con WebGL |

**Regla:** si un efecto es "aparecer al entrar", empezar por CSS `view()` o IntersectionObserver. ScrollTrigger se justifica cuando hay **scrub**
(la animación sigue el dedo), **pin** o **coordinación** entre varias piezas.

## 2. Lenis + ScrollTrigger: la integración correcta

**Qué ocurre sin sincronizar [L].**
1. Lenis, en su propio `requestAnimationFrame`, llama a `window.scrollTo(y)`.
2. El evento nativo `scroll` se despacha en el siguiente ciclo de render.
3. ScrollTrigger actualiza un frame tarde y pinta un progreso viejo.

Medido en el lab 01: **38 de 165 frames** con desfase, hasta **44 px**.

**Receta oficial [V], 0 frames con desfase [L]:**

```js
lenis.on('scroll', ScrollTrigger.update);           // misma pasada que el scroll
gsap.ticker.add((time) => lenis.raf(time * 1000));   // un solo rAF para ambos (s → ms)
gsap.ticker.lagSmoothing(0);                         // sin saltos tras frames lentos
```

**En React / Next.js [L]:**

```tsx
// Proveedor en app/layout.tsx (componente cliente)
<ReactLenis root options={{ autoRaf: false }} ref={lenisRef}>
  <ScrollTriggerSync />   {/* useLenis(() => ScrollTrigger.update()) */}
  {children}
</ReactLenis>

useEffect(() => {
  const update = (t: number) => lenisRef.current?.lenis?.raf(t * 1000); // leer el ref EN el tick
  gsap.ticker.add(update);
  return () => gsap.ticker.remove(update);
}, []);
```

> ⚠️ **Trampa verificada:** leer `ref.current.lenis` una sola vez en `useEffect([])` devuelve `undefined`, así que el ticker nunca se conecta y,
> con `autoRaf: false`, **la página deja de hacer scroll sin dar ningún error** ([lab-results](./lab-results.md#bug-encontrado-y-corregido-en-el-lab)).

**Otras reglas.**
- `data-lenis-prevent` (o la opción `prevent`) en modales, menús y cualquier zona con scroll propio [V].
- `lenis.stop()` y `lenis.start()` para bloquear el scroll (intro, menú abierto).
- `anchors: true` o `lenis.scrollTo(el, { offset })` para los enlaces internos.
- `respectReducedMotion` (por defecto `true`) quita la interpolación [V][L].
- **No combinar Lenis con ScrollSmoother** [I]: son dos sistemas pidiendo la misma posición.

## 3. Pinning

- **Pin con ScrollTrigger:** `pin: true` envuelve el elemento en un `.pin-spacer` que reserva el espacio y lo fija con `position: fixed` durante el tramo.
  `end: '+=1500'` define cuánto scroll dura el pin. **Lab 01: 0 px de desplazamiento del pin con Lenis sincronizado [L].**
- **Sticky con CSS:** `position: sticky` no necesita JS ni crea spacers. Es preferible si no hay scrub ni coordinación.
  **No usar sticky y `pin` sobre el mismo elemento** [V-snippet].
- **En React:** `useGSAP` revierte el pin-spacer al desmontar. Verificado en StrictMode: 1 solo pin-spacer tras el doble montaje [L].
- `anticipatePin: 1` reduce el salto visual cuando el pin empieza con scroll rápido [V-snippet].

## 4. Scroll horizontal (E17)

```text
section.values (trigger, pin)
└── .values__track (display:flex, se anima x)
    └── .card × N (containerAnimation: tween → animaciones internas)
```

- El track usa `x: () => -(track.scrollWidth - innerWidth)` con `ease: 'none'` (obligatorio para `containerAnimation`) e `invalidateOnRefresh: true` [V-snippet].
- El pin va en el ScrollTrigger del contenedor; los triggers internos con `containerAnimation` **no admiten pin ni snap** [V-snippet].
- **Mobile:** `gsap.matchMedia()` separa la versión horizontal (≥ 900 px) de una pila vertical (implementado en About [L]).

## 5. Scroll storytelling con timelines

Patrón recomendado: **una timeline por capítulo**, con `scrollTrigger: { trigger: capitulo, pin: true, scrub: 1, end: '+=N' }`, y en ella `.to()` encadenados
con posiciones relativas (`'<'`, `'+=0.2'`, etiquetas).

- `scrub: true` sigue el scroll exactamente; `scrub: 1` añade un segundo de suavizado. Con Lenis, `true` suele bastar [I].
- Para 3D: la timeline anima un **objeto de estado**, no la malla (ver [threejs-effects.md](./threejs-effects.md#3-sincronizar-scroll-y-3d)).
- `snap: { snapTo: 'labels' }` para capítulos con paradas.
- Lenis no soporta CSS scroll-snap; existe `lenis/snap` para eso [V].

## 6. Secuencias de imágenes (E18)

| Decisión | Recomendación |
| --- | --- |
| Formato | WebP o AVIF. PNG → WebP redujo 21 MB a ~4 MB en un caso del foro de GSAP [V-snippet] |
| Memoria | ancho × alto × 4 × frames. 120 × 960×540 = **237 MB** [L]. En móvil: ~60 frames a 640 px |
| Carga | Primero los frames clave (0, 30, 60…) y luego el resto; dibujar el más cercano ya cargado |
| Dibujo | `drawImage` sobre un `ImageBitmap`, saltando frames repetidos (~0.06 ms por frame [L]) |
| Alternativa | Vídeo con `currentTime` (más ligero; el scrub en iOS es menos fino [I]) o escena 3D real si el producto existe como modelo |

## 7. Reveals, parallax y progreso con CSS (E24)

```css
@supports (animation-timeline: view()) {
  .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% cover 40%; }
}
@media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }
```

Verificado en Chromium (lab 03): opacidad 0 antes de entrar y 1 centrado; la barra de progreso refleja el scroll real [L].
Soporte: Chrome/Edge 115+, Safari 26+, Firefox con flag [V]. Fallback: contenido visible (sin animación) o IntersectionObserver.

## 8. Velocidad de scroll como input (E25)

`lenis.on('scroll', ({ velocity }) => …)` expone la velocidad. Usos:
- `timeScale` de un marquee (About [L]);
- `skewY` del contenido con `quickTo`;
- uniform `uVelocity` para curvar planos WebGL (lab 05 [L]).

Limitar el valor con `gsap.utils.clamp` para que los scrolls muy rápidos no rompan el efecto.

## 9. Mobile y touch

- Lenis deja el touch nativo por defecto (`syncTouch: false`), que es lo recomendable: el scroll inercial de iOS/Android ya es suave [V].
- 14islands recomienda **desactivar el smooth scroll y el WebGL de scroll en móvil** cuando van con tirones [V].
- Pins largos en móvil cansan: acortar los `end` o convertirlos en secciones normales con `gsap.matchMedia`.
- Usar `svh/dvh` para las alturas de sección, porque la barra de URL cambia `vh`.
- `ScrollTrigger.config({ ignoreMobileResize: true })` y `ScrollTrigger.normalizeScroll()` existen [V] para problemas de resize en móvil; probar caso por caso [I].

## 10. Checklist por animación de scroll

1. ¿Se puede hacer con CSS `view()` o IntersectionObserver? → hacerlo así.
2. ¿Necesita scrub o pin? → ScrollTrigger dentro de `useGSAP` con `scope`.
3. ¿Hay Lenis? → asegurar la receta de sincronización (una sola vez, en el layout).
4. ¿Solo se anima `transform`/`opacity` (o `clip-path`)? Evitar `width`/`height`/`top`.
5. ¿Hay versión `prefers-reduced-motion` y versión móvil (`gsap.matchMedia`)?
6. ¿El contenido es legible si el JS falla? (No dejar texto con `opacity: 0` en el HTML del servidor.)
