# Efectos de imagen

Efectos E04 y E06–E09, más E21 y E23 del catálogo. Leyenda en el [README](./README.md#cómo-leer-las-afirmaciones).

## 1. ¿WebGL o CSS?

| Efecto | Sin WebGL (CSS/SVG/GSAP) | Con WebGL |
| --- | --- | --- |
| Reveal al entrar (clip, máscara) | ✅ `clip-path` / `mask` + ScrollTrigger o CSS `view()` | Innecesario |
| Parallax dentro de máscara | ✅ `yPercent` con scrub | Innecesario |
| Escalar a pantalla completa | ✅ `scale` / `clip-path` | Innecesario |
| Hover con zoom, tilt o brillo | ✅ CSS transform + gradiente | Innecesario |
| Distorsión líquida o ondas | ⚠️ filtros SVG (`feTurbulence` + `feDisplacementMap`) | ✅ shader (mejor control) |
| RGB shift | ⚠️ 3 capas con `mix-blend-mode` [I] | ✅ 3 lecturas de textura |
| Transición de imagen con ruido o dissolve | ❌ | ✅ |
| Curvatura o deformación de la geometría de la imagen | ❌ | ✅ |
| Distorsión por velocidad de scroll | ⚠️ `skewY` (plano) | ✅ curvatura real (lab 05 [L]) |

## 2. Reveals sin WebGL

- **Clip-path con scrub:** `clip-path: inset(100% 0 0 0)` → `inset(0%)`. Con `polygon()`, **todas las coordenadas con unidades, incluso los ceros**, y sin `transition` CSS
  en el elemento que anima GSAP [V-snippet].
- **Shape morph a pantalla completa:** Codrops OnScrollShapeMorph [V].
- **Cortina:** un pseudo-elemento que escala en `scaleX` y deja ver la imagen, más un ligero `scale` de la imagen.
- **Pixelado progresivo:** codrops/ImagePixelLoading [V].
- **Double image hover con clip-path:** codrops/DoubleImageHoverEffects [V].

## 3. Parallax (E23)

```text
.media (overflow:hidden; aspect-ratio fijo)
└── img (scale: 1.3) → yPercent -12 → 12 con scrub
```

- Reservar siempre el `aspect-ratio` para evitar CLS.
- `next/image` con `fill` + `sizes` correctos dentro del contenedor.
- Versión CSS: `animation-timeline: view()` animando `translate` [L].
- Mobile: amplitud menor o desactivado.

## 4. Arquitectura DOM → WebGL (E04)

Es la base para E06–E09 cuando hay varias imágenes. **Probado sin librerías en el lab 05 [L]:**

1. **Un canvas fijo** a pantalla completa con `pointer-events: none`.
2. **Cámara ortográfica en píxeles CSS:** `left = -w/2, right = w/2, top = h/2, bottom = -h/2`. Así 1 unidad = 1 px.
3. **Un plano por imagen** con `PlaneGeometry(1, 1, 32, 32)` (subdividido para poder curvarlo), escalado al `width`/`height` del rect.
4. **Sincronización** en cada evento de scroll de Lenis: `position = (rect.left + w/2 - innerWidth/2, innerHeight/2 - rect.top - h/2)`. Medido: **0 px de error**.
5. **Culling:** `mesh.visible = false` fuera del viewport. Resultado: 3 draw calls con 4 planos.
6. **Render bajo demanda:** solo con scroll, hover o resize. **0 renders en reposo**.
7. **Las imágenes del DOM** se ocultan (`visibility: hidden`) solo cuando WebGL está listo; si falla, se ven las originales.

En R3F: drei `View`, `Image` de drei (plano con textura y `zoom`/`grayscale`) [V], o r3f-scroll-rig (`useImageAsTexture`) [V].
**Textura desde `next/image`:** usar la URL optimizada (`/_next/image?url=…&w=…`) o un `<img>` ya cargado como fuente de `TextureLoader` [I].

## 5. Distorsión en hover (E06) y RGB shift (E07)

**Shader base (fragment), basado en el lab 05 [L]:**

```glsl
float d = distance(vUv, uMouse);
vec2 uv = vUv + normalize(vUv - uMouse) * sin(d * 30.0) * 0.015 * uHover * smoothstep(0.5, 0.0, d);
float r = texture2D(uTex, uv + vec2(0.01 * uHover, 0.0)).r;   // RGB shift
vec2 gb = texture2D(uTex, uv).gb;
gl_FragColor = vec4(r, gb, 1.0);
```

- `uHover` (0 → 1) lo anima GSAP en `pointerenter`/`pointerleave`; `uMouse` se actualiza en `pointermove`.
- **Mapa de desplazamiento** (hover-effect de robin-dela [V]): `uv += texture(disp, uv).r * progress * intensity`, mezclando dos texturas.
- **Táctil:** no hay hover. Activar el efecto al entrar en el viewport, al tocar, o desactivarlo.

## 6. Galerías WebGL (E08)

- **Infinita con auto-scroll:** las posiciones viven en el DOM y se reflejan en WebGL; un módulo del ancho total da el bucle infinito
  (Codrops + repo bizarro/infinite-webl-gallery, OGL [V-snippet]).
- **Circular o curva:** planos subdivididos curvados en el vertex shader según su X en pantalla (Codrops "Infinite Circular Gallery" [V-snippet]).
- **Input:** wheel + drag con inercia → GSAP Observer o Draggable + InertiaPlugin (gratis [V]).
- **Alternativa sin WebGL:** carrusel 3D con CSS (`perspective` + `rotateY`) y GSAP (codrops/3DCarousel [V]).
- **Accesibilidad:** botones anterior/siguiente, teclado y una lista DOM con las imágenes y sus `alt`.

## 7. Transiciones de imagen con shader (E09)

```glsl
float n = noise(vUv * 4.0);
float m = smoothstep(uProgress - 0.1, uProgress + 0.1, n);
gl_FragColor = mix(texture2D(tNext, vUv), texture2D(tCurrent, vUv), m);
```

- Biblioteca de patrones: GL Transitions, usadas en akella/webGLImageTransitions [V].
- Variantes 2025: SDF de círculo, ruido, smooth merging (Codrops, Arlind Aliu [V-snippet]).
- **Corregir el aspect ratio** (`object-fit: cover` en el shader) con un uniform `uResolution` y otro con el tamaño de la imagen.

## 8. Rendimiento de imágenes en WebGL

| Riesgo | Mitigación |
| --- | --- |
| Texturas enormes (VRAM) | Servir el tamaño mostrado × DPR, máximo 2048. KTX2 si son muchas [V] |
| Subida a GPU (bloquea el frame) | Precargar y `renderer.initTexture(t)` antes de mostrarla [I]; `ImageBitmap` |
| Fugas al cambiar de ruta | `texture.dispose()`; en R3F, automático al desmontar [V][L] |
| Demasiados contextos | Un canvas global (E04) en lugar de un canvas por imagen [V] |
| Móvil | DPR ≤ 1.5, menos segmentos, o desactivar como sugiere 14islands [V] |
