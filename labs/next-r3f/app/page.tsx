import { ViewTransition } from 'react';
import { PinnedStory } from '@/components/pinned-story';

// Server Component: the text below is in the server HTML (SEO), the 3D is not.
export default function Home() {
  return (
    <main>
      <section className="hero">
        <ViewTransition name="page-title">
          <h1>We grow brands.</h1>
        </ViewTransition>
      </section>
      <PinnedStory />
      <section className="outro"><p>End of story.</p></section>
    </main>
  );
}
