import { site } from "@/lib/site";

/** Honest status note, shown at the end of legal documents until a professional review has happened. */
export function LegalDraftBanner() {
  return (
    <p className="updated" role="note" style={{ marginTop: "2rem", borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
      This document describes how the site works today. It is maintained by {site.operatorName ?? "the operator"} and has not yet been reviewed by a lawyer; questions are welcome at {site.contactEmail}.
    </p>
  );
}

export function Operator() {
  return <>{site.operatorName ?? "the operator of ONE MORE"}</>;
}

export function ContactLink() {
  return site.contactEmail ? <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> : <a href="/contact">the contact page</a>;
}
