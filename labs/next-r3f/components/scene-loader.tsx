'use client';

import dynamic from 'next/dynamic';

// ssr:false is only allowed inside a Client Component (Next.js docs).
// three/R3F stay out of the server bundle and out of the initial JS.
const Scene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="scene-fallback" aria-hidden />,
});

export function SceneLoader() {
  return <Scene />;
}
