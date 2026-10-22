export default function Loading() {
  return (
    <section className="section" style={{ paddingTop: "2rem" }} aria-busy="true" aria-label="Loading">
      <div className="container">
        <div className="skeleton" style={{ height: 44, width: 280, marginBottom: "1.5rem" }} />
        <div className="play-layout">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </div>
    </section>
  );
}
