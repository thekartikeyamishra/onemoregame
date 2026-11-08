import { site } from "@/lib/site";

function Badge({ href, store, verb }: { href: string | null; store: string; verb: string }) {
  if (href) {
    return (
      <a className="store-badge" href={href} target="_blank" rel="noopener noreferrer">
        <span><small>{verb}</small><b>{store}</b></span>
      </a>
    );
  }
  // Not a button: a static, clearly labelled status so nothing appears clickable.
  return (
    <p className="store-badge" role="note" style={{ margin: 0 }}>
      <span><small>Coming soon</small><b>{store}</b></span>
      <span className="sr-only">. Not yet available. No store listing exists yet.</span>
    </p>
  );
}

export function StoreBadges() {
  return (
    <div className="stores" aria-label="Mobile app availability">
      <Badge href={site.stores.googlePlay} store="Google Play" verb="Get it on" />
      <Badge href={site.stores.appStore} store="App Store" verb="Download on the" />
    </div>
  );
}
