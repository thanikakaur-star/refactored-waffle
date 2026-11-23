/**
 * Whether a Family & Women's Health Pass (monthly) should keep the prep tools
 * unlocked, given the Stripe subscription status.
 *
 * Returns:
 *  - true  : (re)grant access
 *  - false : revoke access
 *  - null  : leave as is (for example while a failed payment is being retried)
 *
 * The one-off £4.99 pass has no subscription and is never revoked.
 */
export function unlockStateForSubscriptionStatus(status: string): boolean | null {
  switch (status) {
    case "active":
    case "trialing":
      return true;
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return false;
    default:
      // past_due, incomplete, paused: Stripe is still retrying or waiting, so do not flip access yet.
      return null;
  }
}
