// Round 2 · Results hub hero: a 3D data sculpture. A field of instanced "data" bars ripples over a grid and rises
// toward the pointer; one tall tower per case study (stacked from that case's own chart data, tinted by industry)
// stands out of it. Hovering a tower lights it and shows its label; clicking opens the case. Filters dim/sink the
// towers that no longer match (setVisible). Lazy three, pause off-screen, reduced motion = still frame (gl-kit).
import { glStage, GLSL_NOISE, damp, raw } from './gl-kit.js';

export const IND = { hvac: '#38bdf8', plumbing: '#5b7cff', electrical: '#ffb020', roofing: '#ff5527', cleaning: '#2dd4bf' };

export function mountSculpture(el, { cases, labels, onOpen }) {
  let api = null;
  const stage = glStage(
    el,
    (ctx) => {
      const { THREE, scene, camera, canvas, small } = ctx;
      const root = new THREE.Group();
      scene.add(root);
      // ---------- field of bars
      const NX = small ? 18 : 30;
      const NZ = small ? 10 : 16;
      const S = 0.42;
      const count = NX * NZ;
      const fgeo = new THREE.BoxGeometry(S * 0.72, 1, S * 0.72);
      fgeo.translate(0, 0.5, 0);
      const cell = new Float32Array(count * 2);
      const field = new THREE.InstancedMesh(
        fgeo,
        new THREE.ShaderMaterial({
          uniforms: { uTime: { value: 0 }, uPtr: { value: new THREE.Vector2(99, 99) }, uIntro: { value: ctx.reduce ? 1 : 0 } },
          vertexShader: /* glsl */ `
            attribute vec2 aCell; uniform float uTime; uniform vec2 uPtr; uniform float uIntro;
            varying float vH; varying float vY; varying vec3 vN; varying float vD;
            ${GLSL_NOISE}
            void main(){
              vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
              float n = fbm(aCell * 0.16 + vec2(uTime * 0.07, -uTime * 0.05));
              float wave = sin(length(aCell) * 0.45 - uTime * 1.3) * 0.5 + 0.5;
              float d = length(base.xz - uPtr);
              float lift = exp(-d * d * 0.35) * 1.6;
              float intro = clamp(uIntro * 2.0 - (length(aCell) / 20.0), 0.0, 1.0);
              float h = (0.08 + n * n * 1.6 + wave * 0.18 + lift) * intro;
              vec3 p = position; p.y *= max(h, 0.02);
              vH = h; vY = position.y; vN = normal; vD = length(base.xz);
              gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0);
            }`,
          fragmentShader: /* glsl */ `
            varying float vH; varying float vY; varying vec3 vN; varying float vD;
            void main(){
              float lam = 0.5 + 0.5 * max(dot(normalize(vN), normalize(vec3(0.3, 1.0, 0.6))), 0.0);
              vec3 lo = vec3(0.07, 0.1, 0.28), hi = vec3(0.03, 0.57, 0.76);
              vec3 c = mix(lo, hi, clamp(vH * 0.55, 0.0, 1.0) * vY) * lam + step(0.5, vN.y) * vec3(0.1, 0.2, 0.4) * vH;
              float fade = smoothstep(9.5, 3.0, vD);
              gl_FragColor = vec4(mix(vec3(0.043, 0.063, 0.2), c, fade), 1.0);
            }`,
        }),
        count,
      );
      const m4 = new THREE.Matrix4();
      let k = 0;
      for (let ix = 0; ix < NX; ix++)
        for (let iz = 0; iz < NZ; iz++) {
          const x = (ix - (NX - 1) / 2) * S;
          const z = (iz - (NZ - 1) / 2) * S;
          field.setMatrixAt(k, m4.makeTranslation(x, 0, z));
          cell[k * 2] = ix - (NX - 1) / 2;
          cell[k * 2 + 1] = iz - (NZ - 1) / 2;
          k++;
        }
      fgeo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2));
      root.add(field);

      // ---------- grid floor
      const gridMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: /* glsl */ `varying vec3 vW;
          void main(){ vec2 q = vW.xz / 0.42; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); float l = 1.0 - min(min(g.x, g.y), 1.0);
            float fade = smoothstep(14.0, 4.0, length(vW.xz));
            gl_FragColor = vec4(vec3(0.3, 0.5, 1.0) * l, l * 0.35 * fade); }`,
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), gridMat);
      floor.position.y = -0.01;
      root.add(floor);

      // ---------- case towers (stacked segments)
      const towerMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute vec3 aColor; attribute float aGlow;
          varying vec3 vC; varying vec3 vN; varying float vY; varying float vG; varying vec3 vW;
          void main(){ vC = aColor; vN = normal; vY = position.y; vG = aGlow;
            vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; varying vec3 vC; varying vec3 vN; varying float vY; varying float vG; varying vec3 vW;
          void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW);
            float lam = 0.45 + 0.55 * max(dot(n, normalize(vec3(0.4, 1.0, 0.6))), 0.0);
            float fr = pow(1.0 - max(dot(n, v), 0.0), 2.0);
            float scan = smoothstep(0.04, 0.0, abs(fract(vW.y * 0.6 - uTime * 0.5) - 0.5) - 0.46);
            vec3 c = vC * lam * (0.55 + 0.45 * vY) + fr * vC * 0.6 + step(0.5, n.y) * 0.25 + scan * vC * 0.35 * (0.4 + vG);
            c = mix(c * 0.35, c * (1.0 + vG * 0.6), 0.35 + 0.65 * min(1.0, vG + 0.55));
            gl_FragColor = vec4(c, 1.0); }`,
      });
      const segs = [];
      const towers = cases.map((c, i) => {
        const a = (i / cases.length) * Math.PI * 2 + 0.4;
        const r = i % 2 ? 2.2 : 3.4;
        const x = Math.cos(a) * r * 1.25;
        const z = Math.sin(a) * r * 0.75;
        const vals = c.values.length ? c.values : [1, 2, 3];
        const max = Math.max(...vals);
        const total = 2.6 + (i % 3) * 0.55;
        const step = total / vals.length;
        const t = { slug: c.slug, x, z, h: total, hex: IND[c.industry] || '#0792c2', color: raw(THREE, IND[c.industry] || '#0792c2'), segs: [], vis: 1, visT: 1, glow: 0, glowT: 0 };
        vals.forEach((v, j) => {
          const w = 0.32 + (v / max) * 0.36;
          segs.push({ t, j, y: j * step, h: step * 0.86, w });
        });
        return t;
      });
      const tg = new THREE.BoxGeometry(1, 1, 1);
      tg.translate(0, 0.5, 0);
      const aColor = new Float32Array(segs.length * 3);
      const aGlow = new Float32Array(segs.length);
      segs.forEach((s, i) => aColor.set([s.t.color.r, s.t.color.g, s.t.color.b], i * 3));
      tg.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));
      const glowAttr = new THREE.InstancedBufferAttribute(aGlow, 1);
      tg.setAttribute('aGlow', glowAttr);
      const tmesh = new THREE.InstancedMesh(tg, towerMat, segs.length);
      tmesh.frustumCulled = false;
      root.add(tmesh);
      // halo rings on tower tops
      const rings = towers.map((t) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(t.hex), transparent: true, opacity: 0.8 }));
        ring.rotation.x = Math.PI / 2;
        root.add(ring);
        return ring;
      });
      // invisible hit boxes
      const hits = towers.map((t, i) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, t.h + 0.6, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
        m.position.set(t.x, (t.h + 0.6) / 2, t.z);
        m.userData.i = i;
        root.add(m);
        return m;
      });

      // ---------- pointer → floor
      const ray = new THREE.Raycaster();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitP = new THREE.Vector3();
      const ptrW = new THREE.Vector2(99, 99);
      const ptrT = new THREE.Vector2(99, 99);
      let hover = -1;
      let pointerIn = false;
      const toNdc = (e) => {
        const r = canvas.getBoundingClientRect();
        return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      };
      const host = el.closest('[data-sculpture-host]') || el;
      host.addEventListener('pointermove', (e) => {
        pointerIn = true;
        const ndc = toNdc(e);
        ray.setFromCamera(ndc, camera);
        root.updateMatrixWorld();
        if (ray.ray.intersectPlane(plane, hitP)) {
          const local = root.worldToLocal(hitP.clone());
          ptrT.set(local.x, local.z);
        }
        const h = ray.intersectObjects(hits, false)[0];
        hover = h ? h.object.userData.i : -1;
        host.classList.toggle('is-tower', hover >= 0 && towers[hover].visT > 0.5);
      });
      host.addEventListener('pointerleave', () => {
        pointerIn = false;
        hover = -1;
        host.classList.remove('is-tower');
      });
      host.addEventListener('click', (e) => {
        if (hover >= 0 && towers[hover].visT > 0.5 && !e.target.closest('a, button')) onOpen?.(cases[hover]);
      });

      // ---------- labels (HTML, aria-hidden) follow the tower tops
      const v3 = new THREE.Vector3();
      let intro = ctx.reduce ? 1 : 0;
      let scroll = 0;
      let wide = true;
      api = {
        setVisible(slugs) {
          towers.forEach((t) => (t.visT = slugs.has(t.slug) ? 1 : 0.12));
        },
        setScroll(p) {
          scroll = p;
        },
      };
      return {
        resize(w, h) {
          wide = w / h > 1.2;
        },
        update(time, dt, c) {
          intro = ctx.reduce ? 1 : Math.min(1, intro + dt * 0.6);
          field.material.uniforms.uTime.value = time;
          field.material.uniforms.uIntro.value = intro;
          towerMat.uniforms.uTime.value = time;
          if (!pointerIn) ptrT.set(Math.cos(time * 0.4) * 3, Math.sin(time * 0.3) * 1.8);
          ptrW.lerp(ptrT, ctx.reduce ? 1 : 1 - Math.exp(-5 * dt));
          field.material.uniforms.uPtr.value.copy(ptrW);
          // towers
          towers.forEach((t, i) => {
            t.vis = ctx.reduce ? t.visT : damp(t.vis, t.visT, 4, dt);
            t.glowT = i === hover ? 1 : 0;
            t.glow = ctx.reduce ? t.glowT : damp(t.glow, t.glowT, 8, dt);
          });
          segs.forEach((s, i) => {
            const t = s.t;
            const rise = Math.min(1, Math.max(0, intro * 2.2 - 0.4 - towers.indexOf(t) * 0.12 - s.j * 0.05));
            const e = 1 - Math.pow(1 - rise, 3);
            const hh = s.h * e * (0.25 + 0.75 * t.vis);
            m4.makeScale(s.w * (1 + t.glow * 0.15), Math.max(0.001, hh), s.w * (1 + t.glow * 0.15));
            m4.setPosition(t.x, s.y * e * (0.25 + 0.75 * t.vis) + Math.sin(time * 1.2 + i) * 0.01 * t.glow, t.z);
            tmesh.setMatrixAt(i, m4);
            aGlow[i] = t.glow + (t.vis < 0.5 ? -0.5 : 0);
          });
          tmesh.instanceMatrix.needsUpdate = true;
          glowAttr.needsUpdate = true;
          rings.forEach((r, i) => {
            const t = towers[i];
            const top = t.h * (0.25 + 0.75 * t.vis) * Math.min(1, intro * 1.6);
            r.position.set(t.x, top + 0.18 + Math.sin(time * 2 + i) * 0.05, t.z);
            r.scale.setScalar(1 + t.glow * 0.6 + Math.sin(time * 3 + i) * 0.04);
            r.material.opacity = (0.35 + t.glow * 0.65) * t.vis;
          });
          // camera: slow orbit + pointer parallax + scroll dolly
          const p = c.pointer;
          const orbit = ctx.reduce ? 0.5 : time * 0.05;
          const R = wide ? 17.5 : 21;
          camera.position.set(Math.sin(orbit) * R * 0.3 + p.x * 0.8 + (wide ? -1.5 : 0), (wide ? 8.6 : 13) + p.y * 0.4 + scroll * 2.5, R - scroll * 2);
          camera.lookAt(wide ? -3.2 : 0, wide ? 2.4 : -3.4, 0);
          root.position.x = wide ? 3.1 : 0;
          // labels
          labels.forEach((lab, i) => {
            const t = towers[i];
            v3.set(t.x, t.h * (0.25 + 0.75 * t.vis) + 0.55, t.z);
            root.localToWorld(v3);
            v3.project(camera);
            const x = (v3.x * 0.5 + 0.5) * ctx.w;
            const y = (-v3.y * 0.5 + 0.5) * ctx.h;
            lab.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            lab.style.opacity = (Math.min(1, intro * 1.5) * (0.25 + 0.75 * t.vis)).toFixed(2);
            lab.classList.toggle('is-hover', i === hover);
          });
        },
      };
    },
    { fov: 34, className: 'gl-sculpture', rootMargin: '0px' },
  );
  return stage.then((s) =>
    s && api
      ? {
          setVisible: (slugs) => (api.setVisible(slugs), s.invalidate()),
          setScroll: (p) => (api.setScroll(p), s.invalidate()),
          destroy: () => s.destroy(),
        }
      : null,
  );
}
