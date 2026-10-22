import { site } from "@/lib/site";

function Badge({ href, store }: { href: string | null; store: string }) {
  if (href) {
    return (
      <a className="store-badge" href={href} target="_blank" rel="noopener">
        <span><small>Get it on</small><b>{store}</b></span>
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
      <Badge href={site.stores.googlePlay} store="Google Play" />
      <Badge href={site.stores.appStore} store="App Store" />
    </div>
  );
}
