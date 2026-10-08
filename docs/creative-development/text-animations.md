# Animaciones de texto

Efectos E10–E14 y E19 del catálogo. Leyenda en el [README](./README.md#cómo-leer-las-afirmaciones).

## 1. Principio: el texto real siempre en el DOM

El texto es contenido, SEO y accesibilidad. Toda animación debe partir de **texto real en el HTML del servidor**:
- se anima por encima (split en DOM);
- o se duplica de forma decorativa (WebGL con `aria-hidden`).

**Nunca** dejar un titular con `opacity: 0` en el HTML inicial sin un mecanismo que lo muestre aunque falle el JS [I], porque afecta al LCP y a quien no tiene JS.

## 2. Split text (E12, E19)

**Herramienta recomendada: GSAP SplitText** (gratis desde la 3.13, reescrito: aproximadamente la mitad de tamaño y 14 funciones nuevas [V-snippet]).

| Opción | Efecto | Verificado |
| --- | --- | --- |
| `type: 'lines,words,chars'` | Divide en los niveles indicados | [L] 3 líneas / 8 palabras / 43 caracteres |
| `mask: 'lines'\|'words'\|'chars'` | Envuelve cada pieza en un contenedor con `overflow: clip` para reveals | [L] |
| `aria: 'auto'` | `aria-label` en el padre y `aria-hidden` en los fragmentos | [L] |
| `autoSplit: true` + `onSplit(self)` | Re-divide al cambiar el ancho o cargar fuentes; si `onSplit` devuelve el tween, se sincroniza | [L] 3 → 7 líneas al estrechar |
| `revert()` | Restaura el HTML original | [L] |
| `deepSlice`, `smartWrap`, `ignore`, `prepareText`, `wordDelimiter` | Casos avanzados (anidados, idiomas) | [V] (tipos) |

**Patrones:**
- **Reveal por líneas:** `mask: 'lines'` + `from(lines, { yPercent: 110, stagger: 0.08 })`.
- **Caracteres en cascada:** `type: 'chars'` + `from(chars, { opacity: 0, y: 20, rotateX: -90, stagger: 0.02 })`. Usar con moderación: muchos nodos.
- **Resaltado con scroll (E19):** `type: 'words'` + `fromTo(words, { opacity: 0.12 }, { opacity: 1, stagger: 0.05, scrollTrigger: { scrub: true } })` (About [L]).
- **Cambio de palabras:** SplitText sobre la palabra saliente y la entrante, en una timeline con `repeat: -1`.

**En React:** dentro de `useGSAP` con `scope`, y dentro de `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` para no crear el split con reduced motion [L].

**Alternativas:** Motion (stagger de `motion.span` generados a mano) o Splitting.js (usado en tutoriales antiguos de Codrops [V-snippet]).
SplitText es superior en accesibilidad y re-split responsive.

## 3. Tipografía controlada por scroll

- **Escala, rotación y `transform-origin`** por línea o carácter con scrub: Codrops "On-Scroll Typography Animations" (repo codrops/OnScrollTypographyAnimations) [V-snippet].
- **Texto que se recorta con clip-path SVG:** codrops/TextClipScroll [V].
- **Blur por scroll:** codrops/ScrollBlurTypography [V]. Cuidado: `filter: blur` es caro en móvil [I].
- **Texto horizontal gigante** que se desplaza con el scroll: `x` con scrub sobre un `h2` con `white-space: nowrap`.

## 4. Kinetic typography (E10)

| Variante | Técnica | WebGL |
| --- | --- | --- |
| Palabras repetidas o apiladas que se desplazan | DOM + GSAP (codrops/RepetitiveTypography [V]) | No |
| Texto envuelto en una forma 3D (toro, cinta) | Texto → canvas o render target → textura en una geometría con shader (Codrops, `?p=49770` [V-snippet]) | Sí |
| Texto 3D distorsionado por velocidad | MSDF (`three-msdf-text-utils`) o `troika-three-text` / drei `<Text>` (SDF, admite shaders) [V-snippet] | Sí |
| Texto como transición de página | codrops/KineticTypePageTransition [V] | No |

El texto WebGL **no es seleccionable ni accesible**: mantener el equivalente en el DOM (visualmente oculto o detrás del canvas).

## 5. Scramble / decode (E13)

`ScrambleTextPlugin` [V-snippet][L: incluido en el paquete]: `{ scrambleText: { text, chars: 'upperCase', revealDelay: 0.3, speed: 0.4 } }`.
- Fuente monoespaciada o ancho fijo para evitar saltos de layout.
- `aria-label` con el texto final en el contenedor, para que el lector de pantalla no lea la fase aleatoria [I].

## 6. Máscaras de texto (E11)

| Contenido dentro del texto | Técnica |
| --- | --- |
| Gradiente | `background: linear-gradient(...)`; `background-clip: text`; `color: transparent` (About [L]) |
| Imagen | Igual, con `background-image` |
| Vídeo | `background-clip` no funciona con `<video>` [V-snippet]. Usar una máscara SVG o un `mix-blend-mode` sobre el vídeo [I] |
| Expandir imagen desde el texto | ScrollTrigger escala la imagen recortada (codrops/ImageExpansionTypography [V]) |

## 7. Fuentes variables (E14)

Se animan los ejes `wght`, `wdth` y `slnt` con `font-variation-settings` según el cursor, el hover o el scroll.
- Provoca **repaint**: no se acelera en GPU [V-snippet]. Limitar a titulares y pausar fuera del viewport.
- En Next.js: `next/font` con fuentes variables (por ejemplo, Montserrat es variable en Google Fonts [I]).

## 8. Stroke / outline text

`-webkit-text-stroke` + `color: transparent` (usado en About para números y marquee [L]). Para dibujar el trazo, convertir el texto a SVG y usar DrawSVG (gratis [V]).

## 9. Checklist de texto animado

- [ ] El texto completo está en el HTML del servidor.
- [ ] SplitText con `aria: 'auto'` y `autoSplit` (o re-split tras `document.fonts.ready`).
- [ ] Nada de `opacity: 0` permanente si falla el JS.
- [ ] Versión reduced motion: texto estático.
- [ ] Sin cambios de layout durante la animación (CLS): animar `transform` y `opacity` dentro de máscaras.
- [ ] Probar los saltos de línea en móvil (autoSplit cubre el resize [L]).
