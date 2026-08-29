import Link from "next/link";

export default function Home() {
  return (
    <main className="home-shell">
      <nav className="home-nav" aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="ReviewQR home"><span className="brand-mark">R</span>ReviewQR</Link>
        <Link className="button button-secondary button-small" href="/admin">Operator access</Link>
      </nav>
      <section className="hero">
        <div className="eyebrow">A shorter path to thoughtful feedback</div>
        <h1>Turn a table-side moment into a genuine Google review.</h1>
        <p className="hero-copy">Customers scan, share what stood out, and get an editable review suggestion. They stay in control and personally post on Google.</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/r/saffron-yard">Try the customer demo</Link>
          <Link className="text-link" href="/admin/restaurants/new">Onboard a restaurant <span aria-hidden="true">→</span></Link>
        </div>
        <div className="promise-grid" aria-label="ReviewQR benefits">
          <article><strong>3 simple choices</strong><span>Rating, highlights, approval</span></article>
          <article><strong>Customer controlled</strong><span>Edit, replace, or skip the draft</span></article>
          <article><strong>One permanent QR</strong><span>Update the Google link anytime</span></article>
        </div>
      </section>
      <section className="home-demo" aria-label="How it works">
        <div className="home-demo-card">
          <span className="step-number">1</span><h2>Rate your visit</h2>
          <div className="star-preview" aria-hidden="true">★★★★★</div>
          <span className="step-number">2</span><h2>Choose what stood out</h2>
          <div className="chip-preview"><span>Food</span><span>Ambience</span><span>Service</span></div>
          <span className="step-number">3</span><h2>Review the suggestion</h2>
          <div className="draft-preview">The ambience felt welcoming, and the service made our visit especially enjoyable…</div>
        </div>
      </section>
      <footer className="home-footer">ReviewQR never posts for you or claims a Google review was verified.</footer>
    </main>
  );
}
