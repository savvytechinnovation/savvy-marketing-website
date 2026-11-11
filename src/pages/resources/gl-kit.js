// Round-2 WebGL kit for the Resources, article and company pages (page-local; the shared kit is src/ds/fx3d.js).
//
//   stage(el, builder, opts)   → mounts one WebGL canvas in `el` (lazy three import, pauses off-screen,
//                                DPR ≤ 2 / ≤ 1.5 on mobile, reduced motion = one still frame).
//   renderCovers(seeds, w, h)  → generative, slug-seeded brand covers rendered once in a throw-away
//                                context and returned as object URLs (cards never hold a live context).
//   Builders: library (paper sheets → book → helix), cover (domain-warped brand shader),
//             particles (points morphing between shapes, incl. the Savvy isologo).
import { gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';

export const BRAND = { darker: '#141a40', navy: '#0b0f2e', primary: '#0792c2', cyan: '#3ec4f0', dark: '#293baa', accent: '#ff5527', paper: '#f6f8fc' };
export const small = () => innerWidth < 768;

/** FNV-1a → uint32 */
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** mulberry32 PRNG */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hasGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

/**
 * Mount a scene. opts: { trigger, start, end, scrub (bool), eager (bool), onReady(api) }
 * The builder gets ctx { THREE, scene, camera, renderer, el, pointer, progress, mobile } and returns
 * { update(t, dt, ctx), resize?(w, h), dispose? }. Returned api: { setProgress, set(key, v), ctx, destroy }.
 */
export function stage(el, builder, opts = {}) {
  if (!el) return Promise.resolve(null);
  return new Promise((resolve) => {
    const go = () =>
      start(el, builder, opts).then(resolve, (err) => {
        console.warn('[gl-kit]', err);
        resolve(null);
      });
    if (opts.eager) return go();
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        go();
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
  });
}

async function start(el, builder, opts) {
  if (!hasGL()) return null;
  const THREE = await import('three');
  const mobile = small();
  // an opaque canvas (opts.clear) is much cheaper to composite than an alpha one
  const renderer = new THREE.WebGLRenderer({ antialias: opts.antialias ?? !mobile, alpha: !opts.clear, powerPreference: 'high-performance' });
  if (opts.clear) renderer.setClearColor(opts.clear, 1);
  renderer.setPixelRatio(opts.dpr ?? Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'gl-canvas';
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.1, 200);
  camera.position.set(0, 0, 10);
  const ctx = { THREE, scene, camera, renderer, el, mobile, pointer: new THREE.Vector2(), progress: 0, values: {} };
  const api = await builder(ctx);

  const resize = () => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    api.resize?.(w, h, ctx);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  const target = new THREE.Vector2();
  const onMove = (e) => target.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  if (!reduceMotion) addEventListener('pointermove', onMove, { passive: true });

  let st;
  if (opts.scrub && !reduceMotion) {
    st = ScrollTrigger.create({
      trigger: opts.trigger || el,
      start: opts.start || 'top top',
      end: opts.end || 'bottom top',
      onUpdate: (s) => (ctx.progress = s.progress),
    });
    ctx.progress = st.progress;
  }

  let visible = true;
  const vis = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  vis.observe(el);
  const t0 = performance.now();
  let last = t0;
  // Adaptive resolution: if the device can't hold ~30 fps, step the pixel ratio down (min 0.5).
  let acc = 0;
  let frames = 0;
  const adapt = (raw) => {
    if (raw > 0.25) return; // tab switch / long task, not a GPU signal
    acc += raw;
    if (++frames < 45 && acc < 0.8) return;
    const avg = acc / frames;
    acc = 0;
    frames = 0;
    const pr = renderer.getPixelRatio();
    if (avg > 1 / 32 && pr > 0.5) {
      renderer.setPixelRatio(Math.max(0.5, pr * 0.75));
      resize();
    }
  };
  const tick = () => {
    if (!visible || document.hidden) return;
    const now = performance.now();
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = now;
    adapt(raw);
    ctx.pointer.lerp(target, 0.05);
    api.update((now - t0) / 1000, dt, ctx);
    renderer.render(scene, camera);
  };
  if (reduceMotion) {
    api.update(opts.stillTime ?? 4, 0, ctx);
    renderer.render(scene, camera);
  } else gsap.ticker.add(tick);

  canvas.style.opacity = '0';
  requestAnimationFrame(() => gsap.to(canvas, { opacity: 1, duration: reduceMotion ? 0 : 1.4, ease: 'power2.out' }));

  const out = {
    ctx,
    setProgress: (p) => (ctx.progress = p),
    set: (k, v) => (ctx.values[k] = v),
    redraw: () => reduceMotion && (api.update(opts.stillTime ?? 4, 0, ctx), renderer.render(scene, camera)),
    destroy() {
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', onMove);
      ro.disconnect();
      vis.disconnect();
      st?.kill();
      api.dispose?.();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      canvas.remove();
    },
  };
  opts.onReady?.(out);
  return out;
}

// ---------------------------------------------------------------------------
// GLSL chunks
// ---------------------------------------------------------------------------
const NOISE = /* glsl */ `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
    vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
    m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.0*dot(m,g);
  }
  float fbm(vec2 p){ float f=0.0; float a=0.5; for(int i=0;i<4;i++){ f+=a*snoise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return f; }
`;

// ---------------------------------------------------------------------------
// Cover shader — palette + pattern seeded by a string (post slug, job slug…)
// ---------------------------------------------------------------------------
const PALETTES = [
  ['#0b0f2e', '#293baa', '#0792c2', '#7fd8f5'],
  ['#0b0f2e', '#0792c2', '#3ec4f0', '#ff5527'],
  ['#141a40', '#293baa', '#7b5cff', '#3ec4f0'],
  ['#0a1a2b', '#0792c2', '#21c7a8', '#e8f6ff'],
  ['#141a40', '#293baa', '#0792c2', '#ff5527'],
  ['#0b0f2e', '#1b4fd6', '#0792c2', '#ffd2c2'],
];

export function coverParams(seedStr) {
  const r = rng(hash(seedStr || 'savvy'));
  const pal = PALETTES[Math.floor(r() * PALETTES.length)];
  return { pal, seed: [r() * 100, r() * 100, r(), r()], mode: Math.floor(r() * 3) };
}

const COVER_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime; uniform vec2 uRes; uniform vec4 uSeed; uniform float uMode; uniform vec2 uPointer; uniform float uScroll; uniform float uGrain;
  uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
  varying vec2 vUv;
  ${NOISE}
  float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  void main(){
    vec2 uv=vUv; float asp=uRes.x/max(uRes.y,1.0);
    vec2 p=(uv-0.5)*vec2(asp,1.0)*(0.95-uScroll*0.25);
    float t=uTime*0.06;
    vec2 q=vec2(fbm(p+uSeed.xy+t), fbm(p+uSeed.yx*0.7-t));
    vec2 m=uPointer*vec2(asp,1.0)*0.5;
    float d=length(p-m); q+=0.25*exp(-d*d*3.0)*vec2(sin(uTime*0.8),cos(uTime*0.7));
    float f=fbm(p*0.85+q*1.2+uSeed.zw*10.0);
    float v;
    if(uMode<0.5){ v=f*0.5+0.5; }
    else if(uMode<1.5){ float c=fract((f+q.x)*3.0); v=smoothstep(0.0,0.06,c)*smoothstep(0.5,0.42,c)*0.55+f*0.45+0.35; }
    else { float s=sin((p.x*2.0+p.y*1.2+f*2.4)*6.0+uTime*0.15); v=0.5+0.28*s+0.3*f; }
    v=clamp(v,0.0,1.0);
    vec3 col=mix(uC0,uC1,smoothstep(0.15,0.55,v));
    col=mix(col,uC2,smoothstep(0.5,0.85,v));
    col=mix(col,uC3,smoothstep(0.82,1.0,v)*0.85);
    // grid + glow + vignette + grain
    vec2 g=abs(fract(uv*vec2(asp,1.0)*8.0)-0.5);
    float grid=(1.0-smoothstep(0.0,0.012,min(g.x,g.y)))*0.06;
    col+=grid;
    col+=0.18*uC2*exp(-d*d*4.0);
    float vig=smoothstep(1.25,0.25,length((uv-0.5)*vec2(asp*0.8,1.0)));
    col*=0.55+0.45*vig;
    col+=(hash12(uv*uRes+fract(uTime)*91.0)-0.5)*uGrain;
    gl_FragColor=vec4(col,1.0);
  }
`;
const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

function coverMaterial(THREE, seedStr) {
  const { pal, seed, mode } = coverParams(seedStr);
  const c = (h) => new THREE.Color(h);
  return new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: COVER_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uSeed: { value: new THREE.Vector4(...seed) },
      uMode: { value: mode },
      uPointer: { value: new THREE.Vector2() },
      uScroll: { value: 0 },
      uGrain: { value: 0.05 },
      uC0: { value: c(pal[0]) },
      uC1: { value: c(pal[1]) },
      uC2: { value: c(pal[2]) },
      uC3: { value: c(pal[3]) },
    },
  });
}

/** Live full-bleed cover (article / job heroes). ctx.progress zooms, pointer bends the flow. */
export const cover = (seedStr) => async (ctx) => {
  const { THREE, scene, renderer } = ctx;
  const mat = coverMaterial(THREE, seedStr);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);
  return {
    resize(w, h) {
      mat.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    },
    update(t, _dt, { pointer, progress }) {
      mat.uniforms.uTime.value = t + 20;
      mat.uniforms.uPointer.value.copy(pointer);
      mat.uniforms.uScroll.value = progress;
    },
  };
};

/** Render one static cover per seed in a single temporary context. Returns object URLs (or [] without WebGL). */
export async function renderCovers(seeds, w = 640, h = 420) {
  if (!seeds.length || !hasGL()) return [];
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.Camera();
  const geo = new THREE.PlaneGeometry(2, 2);
  const out = [];
  for (const s of seeds) {
    const mat = coverMaterial(THREE, s);
    mat.uniforms.uRes.value.set(w, h);
    mat.uniforms.uTime.value = 30 + (hash(s) % 1000) / 10;
    mat.uniforms.uGrain.value = 0.035;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    renderer.render(scene, cam);
    // eslint-disable-next-line no-await-in-loop
    const blob = await new Promise((r) => renderer.domElement.toBlob(r, 'image/webp', 0.86));
    out.push(blob ? URL.createObjectURL(blob) : '');
    scene.remove(mesh);
    mat.dispose();
  }
  geo.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}

// ---------------------------------------------------------------------------
// Library — instanced paper sheets: chaos → riffling open book → helix (scroll)
// ---------------------------------------------------------------------------
export const library = () => async (ctx) => {
  const { THREE, scene, camera, mobile } = ctx;
  const N = mobile ? 64 : 110;
  const base = new THREE.PlaneGeometry(1, 1, 18, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('uv', base.getAttribute('uv'));
  geo.instanceCount = N;
  const r = rng(7);
  const seeds = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) seeds.set([i / (N - 1), r(), r(), r()], i * 4);
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uMorph: { value: reduceMotion ? 1 : 0 },
      uOpen: { value: 0 },
      uBg: { value: new THREE.Color(BRAND.darker) },
      uP: { value: new THREE.Color(BRAND.primary) },
      uD: { value: new THREE.Color(BRAND.dark) },
      uA: { value: new THREE.Color(BRAND.accent) },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; uniform float uTime; uniform float uMorph; uniform float uOpen;
      varying vec2 vUv; varying vec4 vSeed; varying float vShade; varying float vFog;
      mat3 rY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
      mat3 rX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
      mat3 rZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
      void main(){
        vUv=uv; vSeed=aSeed; float i=aSeed.x;
        vec3 p=position; p.x+=0.5; p*=vec3(1.55,2.1,1.0);
        float bendAmt=0.22+0.18*sin(uTime*0.9+aSeed.z*6.2831);
        float bend=sin(p.x/1.55*3.1416)*bendAmt;
        // book: pages fanned around the spine, riffling
        float rif=sin(uTime*0.7-i*7.0)*0.5+0.5;
        float th=mix(-1.5,1.5,clamp(i+(rif-0.5)*0.16,0.,1.));
        vec3 pb=p; pb.z+=bend; vec3 nb=vec3(0.,0.,1.);
        pb=rY(th)*pb; nb=rY(th)*nb; pb.y+=(aSeed.w-0.5)*0.05;
        // chaos: loose sheets drifting around the stage
        mat3 rc=rZ(aSeed.y*6.2831+uTime*0.1)*rX(aSeed.z*6.2831+uTime*0.13)*rY(aSeed.w*6.2831);
        vec3 pc=rc*(p-vec3(0.775,0.,0.)+vec3(0.,0.,bend)); vec3 nc=rc*vec3(0.,0.,1.);
        pc+=(vec3(aSeed.y,aSeed.z,aSeed.w)*2.-1.)*vec3(10.,6.,6.)+vec3(0.,sin(uTime*0.3+aSeed.y*9.)*0.4,-2.);
        // helix: the library opens up as you scroll
        float a=i*21.0+uTime*0.12; float rad=4.2;
        mat3 rh=rY(-a+1.5708);
        vec3 ph=rh*(p-vec3(0.775,0.,0.)+vec3(0.,0.,bend*0.6)); vec3 nh=rh*vec3(0.,0.,1.);
        ph+=vec3(cos(a)*rad,(i-0.5)*11.0,sin(a)*rad);
        float m=smoothstep(0.,1.,clamp(uMorph*1.5-aSeed.y*0.5,0.,1.));
        vec3 pos=mix(pc,pb,m); vec3 n=normalize(mix(nc,nb,m));
        float o=smoothstep(0.,1.,clamp(uOpen*1.4-i*0.4,0.,1.));
        pos=mix(pos,ph,o); n=normalize(mix(n,nh,o));
        vec4 mv=modelViewMatrix*vec4(pos,1.0);
        vec3 nw=normalize(normalMatrix*n);
        vShade=0.45+0.55*abs(dot(nw,normalize(vec3(0.35,0.55,1.0))));
        vFog=smoothstep(9.0,26.0,-mv.z);
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBg; uniform vec3 uP; uniform vec3 uD; uniform vec3 uA;
      varying vec2 vUv; varying vec4 vSeed; varying float vShade; varying float vFog;
      float h(float n){return fract(sin(n)*43758.5453);}
      void main(){
        vec2 uv=vUv; float s=vSeed.w;
        vec3 paper=vec3(0.965,0.972,0.985);
        bool cover=s>0.86; bool tinted=s>0.70&&s<=0.86;
        vec3 ink=vec3(0.55,0.6,0.7);
        vec3 col=paper;
        if(cover){ col=mix(uD,uP,uv.y); ink=vec3(1.0); if(vSeed.y>0.8) col=mix(uA,uD,uv.y*0.6); }
        else if(tinted){ col=mix(paper,uP,0.12); }
        // text lines
        float row=floor(uv.y*24.0); float fy=fract(uv.y*24.0);
        float len=0.45+0.4*h(row+s*91.0);
        float inBody=step(0.1,uv.x)*step(uv.x,0.1+0.8*len)*step(0.1,uv.y)*step(uv.y,0.7);
        float line=inBody*step(0.35,fy)*step(fy,0.62);
        col=mix(col,ink,line*(cover?0.35:0.45));
        // headline block
        float head=step(0.1,uv.x)*step(uv.x,0.62+0.2*vSeed.z)*step(0.78,uv.y)*step(uv.y,0.86);
        col=mix(col,cover?vec3(1.0):uD,head*0.85);
        float chip=step(0.1,uv.x)*step(uv.x,0.24)*step(0.9,uv.y)*step(uv.y,0.93);
        col=mix(col,uA,chip*0.9);
        // edges
        float e=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
        col*=0.86+0.14*smoothstep(0.0,0.04,e);
        col*=gl_FrontFacing?vShade:vShade*0.82;
        col=mix(col,uBg,vFog*0.85);
        gl_FragColor=vec4(col,1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);

  // dust
  const D = mobile ? 300 : 900;
  const dp = new Float32Array(D * 3);
  for (let i = 0; i < D; i++) dp.set([(r() - 0.5) * 30, (r() - 0.5) * 18, (r() - 0.5) * 20 - 4], i * 3);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#7fd8f5', size: 0.05, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  camera.position.set(0, 0.4, 11);
  if (!reduceMotion) gsap.to(mat.uniforms.uMorph, { value: 1, duration: 3.2, ease: 'power3.inOut', delay: 0.2 });
  return {
    resize(w) {
      const wide = w > 900;
      group.position.set(wide ? 3.1 : 0, wide ? 1.0 : 1.9, 0);
      group.scale.setScalar(wide ? 1.0 : 0.85);
    },
    update(t, _dt, { pointer, progress }) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uOpen.value = progress;
      group.rotation.order = 'YXZ';
      group.rotation.x = -0.75 - pointer.y * 0.15 + progress * 0.6;
      group.rotation.y = -0.5 + pointer.x * 0.3 + Math.sin(t * 0.2) * 0.1 + progress * 1.4;
      group.rotation.z = 0.18;
      camera.position.z = 11 - progress * 2.5;
      camera.position.y = progress * 1.2;
      camera.lookAt(0, progress * 1.2, 0);
      dust.rotation.y = t * 0.015;
    },
  };
};

// ---------------------------------------------------------------------------
// Particles that morph between shapes (who-we-are story, work-with-us, careers)
// ---------------------------------------------------------------------------
async function logoPoints(n, r) {
  const img = new Image();
  img.src = '/brand/isologo-gradient.svg';
  await img.decode();
  const S = 160;
  const c = Object.assign(document.createElement('canvas'), { width: S, height: S });
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, S, S);
  const data = g.getImageData(0, 0, S, S).data;
  const pts = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (data[(y * S + x) * 4 + 3] > 140) pts.push(x, y);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * (pts.length / 2)) * 2;
    out.set([((pts[k] + r()) / S - 0.5) * 5.2, -((pts[k + 1] + r()) / S - 0.5) * 5.2, (r() - 0.5) * 0.5], i * 3);
  }
  return out;
}

const SHAPES = {
  scatter: (n, r) => {
    const o = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = 3 + Math.pow(r(), 0.6) * 9;
      o.set([Math.cos(a) * d, (r() - 0.5) * 7, Math.sin(a) * d - 3], i * 3);
    }
    return o;
  },
  sphere: (n, r) => {
    const o = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const R = 2.7 + (r() - 0.5) * 0.12;
      o.set([Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R], i * 3);
    }
    return o;
  },
  grid: (n, r) => {
    // a lattice of connected nodes: systems
    const o = new Float32Array(n * 3);
    const G = 5;
    const s = 1.2;
    for (let i = 0; i < n; i++) {
      const ax = Math.floor(r() * 3);
      const p = [Math.floor(r() * G), Math.floor(r() * G), Math.floor(r() * G)].map((v) => (v - (G - 1) / 2) * s);
      p[ax] += (r() - 0.5) * s;
      if (r() < 0.25) p.forEach((_, k) => (p[k] += (r() - 0.5) * 0.12));
      o.set(p, i * 3);
    }
    return o;
  },
  bars: (n, r) => {
    // rising bar chart: measurement
    const o = new Float32Array(n * 3);
    const B = 7;
    for (let i = 0; i < n; i++) {
      const b = Math.floor(r() * B);
      const h = 0.8 + (b / (B - 1)) * 4.4;
      o.set([(b - (B - 1) / 2) * 0.9 + (r() - 0.5) * 0.5, -2.4 + r() * h, (r() - 0.5) * 0.5], i * 3);
    }
    return o;
  },
  clusters: (n, r) => {
    // five industries
    const o = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const c = i % 5;
      const a = (c / 5) * Math.PI * 2 - Math.PI / 2;
      const u = r() * 2 - 1;
      const t = r() * Math.PI * 2;
      const R = 0.85 * Math.cbrt(r());
      const q = Math.sqrt(1 - u * u);
      o.set([Math.cos(a) * 2.8 + q * Math.cos(t) * R, -Math.sin(a) * 2.8 + u * R, q * Math.sin(t) * R], i * 3);
    }
    return o;
  },
  helix: (n, r) => {
    const o = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const strand = i % 2;
      const a = k * Math.PI * 8 + strand * Math.PI;
      o.set([Math.cos(a) * 1.6 + (r() - 0.5) * 0.25, (k - 0.5) * 7, Math.sin(a) * 1.6 + (r() - 0.5) * 0.25], i * 3);
    }
    return o;
  },
  ring: (n, r) => {
    const o = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const b = r() * Math.PI * 2;
      const R = 3;
      const rr = 0.35 + r() * 0.35;
      o.set([(R + rr * Math.cos(b)) * Math.cos(a), rr * Math.sin(b), (R + rr * Math.cos(b)) * Math.sin(a)], i * 3);
    }
    return o;
  },
  plane: (n, r) => {
    // a tilted board of cards (careers)
    const o = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const c = Math.floor(r() * 5);
      o.set([(c - 2) * 1.9 + (r() - 0.5) * 1.5, (r() - 0.5) * 2.2 + Math.sin(c) * 0.4, (r() - 0.5) * 0.15 - Math.abs(c - 2) * 0.6], i * 3);
    }
    return o;
  },
};

/**
 * shapes: array of shape names ('logo' | keys of SHAPES). ctx.values.shape (float index) picks / blends shapes;
 * ctx.values.burst (0..1) adds a swirl. options: { count, light (bool: dark points on a light page) }.
 */
export const particles = (shapes, options = {}) => async (ctx) => {
  const { THREE, scene, camera, mobile } = ctx;
  const N = Math.round((options.count || 9000) * (mobile ? 0.4 : 1));
  const r = rng(11);
  const geo = new THREE.BufferGeometry();
  const arrays = [];
  for (const s of shapes) arrays.push(s === 'logo' ? await logoPoints(N, r) : SHAPES[s](N, r));
  geo.setAttribute('position', new THREE.BufferAttribute(arrays[0].slice(), 3));
  arrays.forEach((a, k) => geo.setAttribute(`aS${k}`, new THREE.BufferAttribute(a, 3)));
  const rnd = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) rnd.set([r(), r(), r(), r()], i * 4);
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
  const K = shapes.length;
  const decl = shapes.map((_, k) => `attribute vec3 aS${k};`).join('\n');
  const blend = shapes.map((_, k) => `p+=aS${k}*max(0.0,1.0-abs(s-${k}.0));`).join('\n');
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: options.light ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uShape: { value: 0 },
      uBurst: { value: 0 },
      uPR: { value: Math.min(devicePixelRatio, mobile ? 1.5 : 2) },
      uPointer: { value: new THREE.Vector3(99, 99, 0) },
      uA: { value: new THREE.Color(options.light ? BRAND.dark : BRAND.primary) },
      uB: { value: new THREE.Color(options.light ? BRAND.primary : '#9be6ff') },
      uC: { value: new THREE.Color(BRAND.accent) },
      uSize: { value: options.size || 1 },
    },
    vertexShader: /* glsl */ `
      ${decl}
      attribute vec4 aRnd; uniform float uTime; uniform float uShape; uniform float uBurst; uniform float uPR; uniform vec3 uPointer; uniform float uSize;
      varying vec3 vCol; varying float vA;
      uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
      void main(){
        float s=clamp(uShape+(aRnd.x-0.5)*0.6*sin(fract(uShape)*3.1416),0.0,${K - 1}.0);
        vec3 p=vec3(0.0);
        ${blend}
        float tr=sin(fract(s)*3.1416);
        float n1=sin(p.y*1.3+uTime*0.6+aRnd.y*6.28); float n2=cos(p.x*1.1-uTime*0.5+aRnd.z*6.28);
        p+=vec3(n1,n2,n1*n2)*(0.05+0.9*tr+uBurst*0.8)*aRnd.w;
        float sw=uBurst*2.0*aRnd.y; float ca=cos(sw), sa=sin(sw); p.xz=mat2(ca,-sa,sa,ca)*p.xz;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        // pointer repulsion in view space
        vec2 dp=mv.xy-uPointer.xy; float d=length(dp);
        mv.xy+=normalize(dp+1e-4)*exp(-d*d*1.2)*0.6;
        gl_Position=projectionMatrix*mv;
        gl_PointSize=uSize*uPR*(1.8+aRnd.z*2.6)*(10.0/-mv.z);
        vCol=mix(uA,uB,aRnd.y); if(aRnd.x>0.965) vCol=uC;
        vA=(0.55+0.45*aRnd.w)*smoothstep(30.0,5.0,-mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA;
      void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=smoothstep(0.5,0.1,d)*vA; if(a<0.01) discard; gl_FragColor=vec4(vCol,a); }
    `,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const group = new THREE.Group();
  group.add(pts);
  scene.add(group);
  camera.position.set(0, 0, 11);
  ctx.values.shape = ctx.values.shape ?? 0;
  ctx.values.burst = 0;
  let shape = ctx.values.shape;
  const ray = new THREE.Vector3();
  return {
    group,
    resize(w) {
      const off = options.offsetX ? (w > 900 ? options.offsetX : 0) : 0;
      group.position.x = off;
      group.position.y = w > 900 ? 0 : options.mobileY || 0;
      group.scale.setScalar(w > 900 ? 1 : options.mobileScale || 0.7);
    },
    update(t, dt, c) {
      shape += (c.values.shape - shape) * (dt ? Math.min(1, dt * 3.2) : 1);
      mat.uniforms.uShape.value = shape;
      mat.uniforms.uBurst.value += ((c.values.burst || 0) - mat.uniforms.uBurst.value) * Math.min(1, dt * 4 || 1);
      mat.uniforms.uTime.value = t;
      ray.set(c.pointer.x * 4.6 * camera.aspect, c.pointer.y * 4.6, 0);
      mat.uniforms.uPointer.value.copy(ray);
      group.rotation.y = c.pointer.x * 0.35 + Math.sin(t * 0.15) * 0.2 + (c.values.spin || 0);
      group.rotation.x = -c.pointer.y * 0.2;
      options.onUpdate?.(t, c, { group, camera });
    },
  };
};

/** Paint every [data-cover] element under root with its slug-seeded generative cover (idle, one temp context). */
export function paintCovers(root = document, { w = 520, h = 360 } = {}) {
  const els = [...root.querySelectorAll('[data-cover]')].filter((el) => !el.classList.contains('has-cover'));
  if (!els.length) return Promise.resolve();
  const seeds = [...new Set(els.map((el) => el.dataset.cover))];
  const run = async () => {
    const urls = await renderCovers(seeds, w, h).catch(() => []);
    if (!urls.length) return;
    const map = new Map(seeds.map((s, i) => [s, urls[i]]));
    els.forEach((el) => {
      const u = map.get(el.dataset.cover);
      if (!u) return;
      el.style.backgroundImage = `url("${u}")`;
      el.classList.add('has-cover');
    });
  };
  return new Promise((resolve) => {
    const go = () => run().then(resolve, resolve);
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 });
    else setTimeout(go, 300);
  });
}
