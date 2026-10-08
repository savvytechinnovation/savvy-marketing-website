import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import 'lenis/dist/lenis.css';
import './globals.css';
import { SmoothScroll } from '@/components/smooth-scroll';

export const metadata: Metadata = { title: 'Lab — Next.js + R3F + Lenis + GSAP' };

// Server Component: only the providers below are client code
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SmoothScroll>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
          </nav>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
