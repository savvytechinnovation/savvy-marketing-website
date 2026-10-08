# Three.js, React Three Fiber y WebGPU

Efectos E01–E05 del catálogo, más la base técnica para cualquier 3D en Next.js. Leyenda en el [README](./README.md#cómo-leer-las-afirmaciones).

## 1. ¿Hace falta 3D?

Usar WebGL solo si el efecto necesita **geometría 3D real, iluminación, shaders sobre píxeles o miles de elementos**. Fades, parallax, tilt de tarjetas,
reveals y la mayoría de hovers se resuelven con CSS o GSAP a una fracción del coste ([technologies.md](./technologies.md#matriz-de-decisión)).

## 2. Integración con Next.js App Router (probado)

Probado en `labs/next-r3f` con Next 16.4.0, React 19.3.0, R3F 9.8.1, drei 10.7.9 y three 0.186.1 [L].

```text
app/page.tsx                (Server Component: texto, SEO)
└── <PinnedStory/>          ('use client': useGSAP + ScrollTrigger)
    └── <SceneLoader/>      ('use client': dynamic(() => import('./scene'), { ssr: false, loading }))
        └── <Scene/>        ('use client': <Canvas frameloop="demand">)
```

- `next.config`: `transpilePackages: ['three']` [V].
- `dynamic(..., { ssr: false })` **solo** está permitido dentro de un componente cliente [V]. three y R3F quedan fuera del bundle del servidor y del JS inicial.
- El HTML del servidor contiene todo el texto y un placeholder, sin `<canvas>` [L]. El SEO no depende del 3D.
- Peer de R3F 9.8.1: `react >=19 <19.4` [V]. Comprobarlo al actualizar React.
- **StrictMode** (dev): el canvas se monta, desmonta y vuelve a montar sin duplicados (1 canvas) [L].
- **Navegación entre rutas:** al salir, R3F desmonta y libera la escena (0 canvas en la otra ruta) y `useGSAP` revierte los ScrollTriggers (2 → 0) [L].
- **Aviso conocido:** `THREE.Clock: This module has been deprecated` con R3F 9.8.1 + three r186 [L]. Es inofensivo; desaparecerá cuando R3F migre a `THREE.Timer` [I].

### ¿Un canvas o varios?

| Opción | Cuándo | Notas |
| --- | --- | --- |
| Un `<Canvas>` por sección | 1–2 escenas aisladas | Simple. Cada canvas es un contexto WebGL y los navegadores limitan cuántos puede haber [V] |
| **Un canvas global fijo** + drei `View` | Varias piezas 3D en la página | `View` usa `gl.scissor` para pintar varias vistas en un canvas, cada una ligada a un div [V]. Lo usa el starter oficial `react-three-next` [V] |
| r3f-scroll-rig | Muchas imágenes o mallas que siguen al DOM | Ver la advertencia de compatibilidad en [references.md](./references.md#4-r3f-scroll-rig--14islands) |

## 3. Sincronizar scroll y 3D

**Patrón store mutable** [L]: ScrollTrigger escribe el progreso en un objeto plano y `useFrame` lo lee. Nunca `setState` [V].

```ts
// lib/scroll-store.ts
export const scrollStore = { progress: 0 };

// DOM (useGSAP)
ScrollTrigger.create({ trigger, pin: true, scrub: true, end: '+=1600',
  onUpdate: (self) => { scrollStore.progress = self.progress; invalidate(); } });

// WebGL (useFrame)
useFrame(() => { mesh.current.rotation.y = scrollStore.progress * Math.PI * 2; });
```

Resultado medido: **0 renders en 1 s de reposo** y 24 renders durante un recorrido de scroll [L].
Con varias escenas o más estado, usar Zustand leyendo con `useStore.getState()` dentro de `useFrame` [V].

**Alternativas.**
- **drei `ScrollControls`** [V]: el scroll ocurre dentro del canvas (`pages`, `damping`, `useScroll().range()`). Es ideal para experiencias 100 % 3D,
  pero el contenido queda fuera del flujo normal del documento (SEO y accesibilidad) y no convive con Lenis.
- **Página About actual (vanilla):** la timeline de GSAP anima un objeto `state` que el bucle de render aplica [L].

## 4. Rendimiento en R3F (docs oficiales [V] + labs [L])

| Práctica | Detalle |
| --- | --- |
| `frameloop="demand"` + `invalidate()` | Renderiza solo si algo cambia. 0 renders en reposo [L] |
| Instancing | 3000 objetos: 2582 draw calls como mallas separadas frente a **1** con `InstancedMesh` [L]. R3F aconseja como máximo ~1000 draw calls, idealmente unos cientos [V]. drei: `<Instances>`, `<Merged>` |
| Reutilizar geometrías y materiales | `useLoader` y `useGLTF` cachean por URL [V] |
| DPR | `dpr={[1, 2]}`; en móvil, 1.5 como máximo [I]. `<AdaptiveDpr>` + `performance.regress()` [V] |
| `PerformanceMonitor` | `onDecline` / `onIncline` / `onFallback` para bajar calidad (partículas, sombras, postprocesado) [V] |
| `visible` frente a montar | Ocultar con `visible={false}` es más barato que montar y desmontar [V] |
| Dispose | R3F hace dispose al desmontar, salvo `<primitive object>` y `dispose={null}` [V]. En three vanilla es obligatorio: sin `dispose()` quedan +40 geometrías y +40 texturas en GPU [L] |
| Pausar fuera de pantalla | IntersectionObserver sobre el contenedor; si no se ve, no invalidar |

## 5. Modelos 3D (GLTF/GLB)

**Pipeline recomendado [V]:**

```bash
# Optimización general: Meshopt para geometría + WebP (o KTX2) para texturas, máximo 2048 px por defecto
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024
# Componente tipado para R3F
npx gltfjsx out.glb --types --transform   # --transform: Draco + texturas 1024 WebP + dedup/prune
```

| Elección | Recomendación |
| --- | --- |
| Draco o Meshopt | Draco comprime geometría; Meshopt comprime **geometría y animación** [V]. Por defecto, Meshopt (es el valor de `optimize`) |
| WebP/AVIF o KTX2 | WebP/AVIF reducen la **descarga**; KTX2/Basis reduce la **VRAM** y el tiempo de subida a GPU [V]. KTX2 para escenas con muchas texturas o en móvil |
| Tamaño de textura | No hay cifra oficial universal. gltfjsx usa 1024 por defecto y `optimize` 2048 [V]. Guía práctica: hero ≤ 2048, resto ≤ 1024 [I] |
| Decoders | `useGLTF(url, '/draco-gltf')` para servir Draco local en lugar del CDN de gstatic [V] |
| Precarga | `useGLTF.preload(url)` [V] |
| Entorno | drei `Environment preset` **no es para producción** (depende de CDNs). Usar `files` con un HDR o una gainmap local [V] |
| Referencia real | Bruno Simon Folio 2025 usa gltf-transform + KTX/ETC1S [V] |

## 6. Shaders

| Enfoque | Uso |
| --- | --- |
| `ShaderMaterial` / drei `shaderMaterial` | Efectos propios en planos (imágenes, partículas). Uniforms animables con GSAP [V][L] |
| `onBeforeCompile` | Inyectar código en materiales estándar sin perder la iluminación. Ejemplo oficial `webgl_materials_modified` [V]. La wiki lo considera legado frente a TSL |
| **TSL (`three/tsl`)** | Nodos JS que compilan a WGSL o GLSL; necesario para WebGPU [V]. Es el camino a futuro |

**Técnicas comunes:** desplazamiento de vértices con ruido (simplex/curl), fresnel (`pow(1. - dot(normal, viewDir), p)`), mapas de desplazamiento sobre UVs,
separación RGB, mezcla de texturas con máscara de ruido.
**Color:** marcar las texturas de color con `texture.colorSpace = SRGBColorSpace` [V][L].

**Aprender:** The Book of Shaders (fragment shaders, noise) [V] · Three.js Journey (shaders, R3F, WebGPU + TSL) [V-snippet].

## 7. Partículas

| Escala | Técnica |
| --- | --- |
| Hasta decenas de miles | `THREE.Points` + `ShaderMaterial`, con animación en el vertex shader (About [L]) |
| Física o flow field | GPGPU con `GPUComputationRenderer` (`webgl_gpgpu_birds`) [V] |
| Cientos de miles, con WebGPU | Compute de TSL (`webgpu_compute_particles`, 200k en el código) [V] |

Usar mezcla aditiva y `depthWrite: false` para que brillen; ajustar `gl_PointSize` por distancia y por `pixelRatio`.

## 8. WebGPU: ¿ya?

- **Soporte [V]:** Chrome/Edge (escritorio y Android 12+ con ciertas GPUs), Safari 26 (macOS, iOS, iPadOS), Firefox en Windows y macOS recientes. Linux y algunos Android siguen parciales.
- **WebGPURenderer cae a WebGL2** si no hay WebGPU [V], así que es viable empezar con él cuando se quiera TSL o compute.
- **En R3F 9** se puede usar con un `gl` asíncrono, pero la guía lo marca como trabajo en curso [V].
- **Recomendación:** WebGLRenderer para producción ahora; WebGPU/TSL para experimentos con compute o partículas masivas, siempre con fallback.

## 9. Accesibilidad y fallback

- `<Canvas aria-hidden>`: el contenido semántico vive en el DOM [L].
- Fallback mientras carga (`loading` de `dynamic`) y si WebGL falla: imagen estática o póster.
- `prefers-reduced-motion`: pose final fija, sin auto-rotación ni partículas animadas.
- Detección de capacidad: si `PerformanceMonitor` cae varias veces, `onFallback` → imagen estática.
