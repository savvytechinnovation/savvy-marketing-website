'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Mesh } from 'three';
import { diag, scrollStore } from '@/lib/scroll-store';

function Knot() {
  const mesh = useRef<Mesh>(null);
  // Runs only on rendered frames (frameloop="demand"): read the store, mutate refs, never setState
  useFrame(() => {
    diag().renders++;
    if (!mesh.current) return;
    mesh.current.rotation.y = scrollStore.progress * Math.PI * 2;
    mesh.current.rotation.x = scrollStore.progress * Math.PI;
  });
  return (
    <mesh ref={mesh}>
      <torusKnotGeometry args={[1, 0.32, 160, 24]} />
      <meshStandardMaterial color="#0396c7" metalness={0.4} roughness={0.25} />
    </mesh>
  );
}

export default function Scene() {
  useEffect(() => {
    diag().sceneMounts++;
    return () => void diag().sceneUnmounts++;
  }, []);
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [0, 0, 6], fov: 40 }} aria-hidden>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <Knot />
    </Canvas>
  );
}
