export function HomePage() {
  return (
    <main className="home-page">
      <section className="home-page__hero">
        <p className="home-page__eyebrow">Feature-Sliced Design</p>
        <h1 className="home-page__title">React app scaffolded with FSD layers</h1>
        <p className="home-page__description">
          Base folders are ready. Start with page code here, then extract to widgets, features, and
          entities only when reuse appears.
        </p>
        <div className="home-page__panel">
          <code>src/app</code>
          <code>src/pages</code>
          <code>src/widgets</code>
          <code>src/features</code>
          <code>src/entities</code>
          <code>src/shared</code>
        </div>
      </section>
    </main>
  );
}
