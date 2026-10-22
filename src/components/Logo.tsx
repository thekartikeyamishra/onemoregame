export function LogoMark({ title }: { title?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      <circle cx="16" cy="16" r="13" fill="none" stroke="#3ee6f0" strokeWidth="3" />
      <circle cx="16" cy="16" r="5" fill="#ffbf47" />
      <path d="M25 5.5 L29 1.5" stroke="#8b7bff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
