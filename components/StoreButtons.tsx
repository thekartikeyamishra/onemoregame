import { stores } from "@/lib/site";

function Badge({
  href,
  store,
  icon,
  compact,
}: {
  href: string;
  store: string;
  icon: React.ReactNode;
  compact?: boolean;
}) {
  const live = Boolean(href);
  const inner = (
    <>
      <span aria-hidden="true">{icon}</span>
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[0.72rem] font-medium">{live ? "Download on" : "Coming soon to"}</span>
        <span className={compact ? "text-[0.95rem] font-semibold" : "text-base font-semibold"}>{store}</span>
      </span>
    </>
  );
  const cls = `inline-flex items-center gap-2.5 rounded-xl border px-3.5 ${compact ? "h-12" : "h-14"} transition-colors`;

  return live ? (
    <a href={href} target="_blank" rel="noopener" className={`${cls} border-ink bg-band text-band-ink hover:opacity-90`}>
      {inner}
    </a>
  ) : (
    <span
      role="img"
      aria-label={`${store}: coming soon`}
      title="Not released yet. Request an invite to hear first."
      className={`${cls} cursor-default border-dashed border-line bg-surface text-slate`}
    >
      {inner}
    </span>
  );
}

export function StoreButtons({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Badge
        compact={compact}
        href={stores.playStore}
        store="Google Play"
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.6-9.7-9.6-9.7Zm10.6 10.7 2.7 2.7-11.4 6.5 8.7-9.2Zm0-2L5.5 1.8l11.4 6.5-2.7 2.7Zm3.9.1 2.9 1.6c.8.5.8 1.2 0 1.7l-2.9 1.6-3-2.9 3-2Z" />
          </svg>
        }
      />
      <Badge
        compact={compact}
        href={stores.appStore}
        store="the App Store"
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1ZM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5Z" />
          </svg>
        }
      />
    </div>
  );
}
