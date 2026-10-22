/**
 * Privacy-conscious analytics shim. It is a no-op until a provider is chosen and consent handling is in place.
 * Never pass emails, tokens, referral codes or other identifiers as event properties.
 */
export type FunnelEvent =
  | "landing_view"
  | "early_access_cta_clicked"
  | "waitlist_form_started"
  | "waitlist_submit_succeeded"
  | "email_verification_completed"
  | "invite_accepted"
  | "referral_signup_completed"
  | "campus_interest_submitted"
  | "first_game_completed"
  | "friend_challenge_opened"
  | "share_clicked"
  | "social_clicked"
  | "guest_claim_started";

declare global {
  interface Window { dataLayer?: unknown[] }
}

export function track(event: FunnelEvent, props: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined" || !Array.isArray(window.dataLayer)) return;
  window.dataLayer.push({ event, ...props });
}
