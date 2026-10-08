# Arquitectura propuesta para Next.js (App Router)

Propuesta basada en lo probado en `labs/next-r3f` [L], en el starter oficial `pmndrs/react-three-next` [V] y en Satūs (darkroom) [V].
No es código implementado en el sitio: es el plan para la fase de construcción.

## 1. Estructura de carpetas

```text
src/
├── app/
│   ├── layout.tsx                  # Server Component: <Providers> + <Nav> + {children}
│   ├── template.tsx                # (opcional) animaciones de ENTRADA por ruta
│   ├── page.tsx                    # Server Components: contenido y SEO
│   └── about/page.tsx
├── components/
│   ├── providers/
│   │   ├── providers.tsx           # 'use client': SmoothScroll + MotionConfig + GSAP setup
│   │   └── smooth-scroll.tsx       # ReactLenis root + ticker GSAP + ScrollTriggerSync   [L]
│   ├── animations/                 # Reveal, SplitReveal, ScrollHighlight, Parallax, Counter, Marquee
│   ├── scroll/                     # PinnedSection, HorizontalScroll, ImageSequence, StackCards
│   ├── three/
│   │   ├── scene-loader.tsx        # 'use client' + dynamic(() => import('./scene'), { ssr:false })   [L]
│   │   ├── global-canvas.tsx       # (si hay varias piezas 3D) Canvas fijo + drei <View.Port/>
│   │   ├── scenes/                 # HeroScene, ProductScene, ParticlesScene
│   │   ├── models/                 # Componentes generados con gltfjsx --types
│   │   └── materials/              # shaderMaterial (drei) + uniforms tipados
│   ├── transitions/                # ViewTransition wrappers, Curtain, ClipReveal
│   └── interactive/                # MagneticButton, Cursor, TiltCard, ImageTrail, FullscreenMenu
├── hooks/
│   ├── use-reduced-motion.ts       # matchMedia + suscripción
│   ├── use-pointer-fine.ts         # (hover: hover) and (pointer: fine)
│   ├── use-magnetic.ts             # gsap.quickTo                                         [L]
│   ├── use-image-sequence.ts       # ImageBitmap + ScrollTrigger                          [L]
│   └── use-in-view.ts              # IntersectionObserver para pausar WebGL
├── lib/
│   ├── gsap.ts                     # registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip…) una sola vez
│   ├── scroll-store.ts             # store mutable DOM ↔ WebGL                            [L]
│   └── motion-tokens.ts            # duraciones, eases, distancias (design tokens de movimiento)
├── shaders/
│   ├── noise.glsl / displacement.frag / curve.vert
│   └── index.ts                    # export como strings (o import ?raw con el loader configurado)
└── styles/
    └── motion.css                  # CSS scroll-driven + @supports + reduced motion
```

## 2. Server vs Client Components

| Pieza | Tipo | Motivo |
| --- | --- | --- |
| `layout.tsx`, `page.tsx`, secciones de contenido | **Server** | HTML completo para SEO y LCP; cero JS por defecto |
| Proveedores (Lenis, configuración de GSAP) | Client | Hooks, `window`, rAF |
| Componentes animados (`SplitReveal`, `PinnedSection`…) | Client, **hojas pequeñas** | Reciben `children` del servidor: `<SplitReveal><h2>Texto SSR</h2></SplitReveal>` |
| Escenas 3D | Client + `dynamic(..., { ssr: false })` | three no se ejecuta en el servidor y no entra en el JS inicial [L] |
| `<ViewTransition>` | Se puede usar en Server Components (lab: en `page.tsx`) [L] | Es un componente de React, no requiere `'use client'` |

**Patrón clave:** los componentes cliente **envuelven** contenido renderizado en el servidor en lugar de generarlo. Así el texto está en el HTML
aunque la animación sea cliente (verificado: `h1` y párrafo presentes en el HTML del servidor [L]).

## 3. Proveedor de scroll (verificado)

```tsx
'use client';
// components/providers/smooth-scroll.tsx
gsap.registerPlugin(ScrollTrigger);

function ScrollTriggerSync() {
  useLenis(() => ScrollTrigger.update());
  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const ref = useRef<LenisRef>(null);
  useEffect(() => {
    const update = (t: number) => ref.current?.lenis?.raf(t * 1000); // leer el ref en cada tick [L]
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, []);
  return (
    <ReactLenis root options={{ autoRaf: false }} ref={ref}>
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}
```

Se monta **una vez** en el layout y persiste entre rutas (lab: `lenisCreated: 1` tras navegar dos veces [L]).
Importar `lenis/dist/lenis.css` en el layout [V].

## 4. Componentes de animación: contrato común

```tsx
'use client';
export function SplitReveal({ children, as: Tag = 'div' }: Props) {
  const scope = useRef<HTMLElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      SplitText.create(scope.current!.firstElementChild!, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (s) => gsap.from(s.lines, { yPercent: 110, stagger: 0.08,
          scrollTrigger: { trigger: scope.current, start: 'top 85%' } }),
      });
    });
  }, { scope });                                   // limpieza automática al desmontar [V][L]
  return <Tag ref={scope}>{children}</Tag>;
}
```

Reglas:
1. **`useGSAP` con `scope`** siempre; nada de `useEffect` con GSAP [V].
2. **`contextSafe()`** para handlers que crean animaciones después del montaje (clic, hover) [V].
3. **Listeners nativos** (`pointermove`, `resize`) se quitan en el return de `useGSAP` o en un `useEffect` propio.
4. **`gsap.matchMedia()`** para reduced motion y breakpoints, en lugar de `if` sueltos [V][L].
5. **Props declarativas** (`delay`, `stagger`, `start`) con valores por defecto desde `lib/motion-tokens.ts`.
6. **Lógica en hooks, presentación en componentes:** `useMagnetic(ref, { strength })` y `<MagneticButton>` solo compone.

## 5. Capa 3D

```text
<SceneLoader/> ('use client')
  └── dynamic(() => import('./scene'), { ssr: false, loading: () => <Poster/> })
        └── <Canvas frameloop="demand" dpr={[1, 2]} aria-hidden>
              ├── <PerformanceMonitor onDecline=… onFallback=…/>
              ├── <Suspense fallback={null}><Model/></Suspense>
              └── <ScrollDriven/>  // useFrame lee scrollStore; ScrollTrigger.onUpdate → invalidate()  [L]
```

- **Un canvas por página** si hay una sola pieza 3D. Con varias, `global-canvas.tsx` en el layout + drei `View` [V].
- **Lazy loading real:** montar `<SceneLoader>` solo cuando su sección está cerca del viewport (IntersectionObserver), no al cargar la página [I].
- **Recursos:** R3F libera al desmontar [V][L]. Con `<primitive>` hay que hacer `dispose()` manual. Modelos precargados con `useGLTF.preload` solo en las rutas que los usan.
- **Estado DOM ↔ WebGL:** `lib/scroll-store.ts` (objeto mutable) o Zustand con `getState()` en `useFrame` [V]. Nunca `setState` por frame.

## 6. Transiciones de ruta

- **Por defecto:** `<ViewTransition name=…>` en los elementos compartidos de `page.tsx` + CSS en `styles/motion.css` [V][L].
- **Cortina o clip-path:** `components/transitions/` con View Transitions CSS, o `next-transition-router` dentro de `providers.tsx` si se necesita GSAP en la salida [V].
- **Al cambiar de ruta:** `ScrollTrigger.refresh()` tras el montaje de la nueva página (lo hace `useGSAP` al crear triggers) y `lenis.scrollTo(0, { immediate: true })` [I].

## 7. Ciclo de vida y limpieza (checklist)

| Recurso | Quién lo limpia |
| --- | --- |
| Tweens, timelines, ScrollTriggers, SplitText | `useGSAP` (`gsap.context().revert()`) [V]. Verificado: 2 → 0 al salir de la ruta, sin duplicados en StrictMode [L] |
| `gsap.matchMedia()` | Creado dentro de `useGSAP` → revertido con el contexto [V] |
| Lenis | El proveedor del layout. No crear instancias por página |
| Ticker de GSAP | `gsap.ticker.remove(fn)` en el cleanup |
| Listeners de `window`/`document` | `removeEventListener` en el cleanup; `contextSafe` en handlers |
| Escena R3F | Desmontaje automático + `dispose` [V][L] |
| three vanilla | `geometry.dispose()`, `material.dispose()`, `texture.dispose()`, `renderer.dispose()` [L] |
| `ImageBitmap` (secuencias) | `bitmap.close()` al desmontar [V] |
| Observers | `observer.disconnect()` |

## 8. Hidratación

- Nada que dependa de `window` en el render: solo en efectos (`useGSAP` es isomórfico [V]).
- No cambiar el texto o la estructura del DOM antes de hidratar. SplitText corre en efecto y `revert()` restaura el DOM [L].
- Estados iniciales ocultos (`opacity: 0`) **en CSS con una clase que añade JS**, por ejemplo `.js .reveal { opacity: 0 }`, para que sin JS el contenido sea visible [I].
- Verificado en el lab: 0 errores de hidratación en prod y dev [L].

## 9. Configuración

```ts
// next.config.ts
const nextConfig = { transpilePackages: ['three'] };   // [V]
```

- **Shaders `.glsl`:** importar como string con un loader (`raw-loader` / regla `asset/source` en Turbopack o webpack) o usar template strings en `.ts` [I].
- **Versiones:** fijar `react` dentro del peer de R3F (`<19.4` con fiber 9.8.1) [V].
- **Presupuesto de JS:** three + R3F + drei son el bloque más pesado (en este repo, el bundle Vite de la página About pesa 207 kB gzip, mayormente three [L]).
  Cargarlos siempre en diferido.
