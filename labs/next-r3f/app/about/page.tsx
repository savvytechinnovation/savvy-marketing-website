import { ViewTransition } from 'react';

export default function About() {
  return (
    <main>
      <section className="hero">
        <ViewTransition name="page-title">
          <h1>About us.</h1>
        </ViewTransition>
      </section>
    </main>
  );
}
