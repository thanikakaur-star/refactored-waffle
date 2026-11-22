/*
 * CarePath Fast-Track: founder config. Edit THIS file only.
 * Everything here is passive and self-serve. No manual lead chasing.
 *
 * 1) AFFILIATE_ESSENTIALS: drop your Amazon Associates / affiliate product
 *    URLs into the `url` fields below. These render as "Recommended Comfort
 *    Essentials" cards in Tab 3. Keep them to general comfort/wellbeing items
 *    only (no medical/treatment claims) so they stay ASA-compliant.
 *
 * 2) LIST_PRACTICE_STRIPE_URL: paste your Stripe Checkout / Payment Link for
 *    the £39/mo practitioner listing subscription. Practitioners self-onboard;
 *    you never have to call anyone.
 *
 * 3) AFFILIATE_DISCLOSURE: shown above the cards. Required for ASA/Amazon.
 */
window.FAST_TRACK_CONFIG = {
  AFFILIATE_DISCLOSURE:
    "These are general comfort and wellbeing products, not treatments or cures. We may earn a small commission from these links at no extra cost to you. Speak to your pharmacist or GP about symptoms.",

  // OPTIONAL and empty by default. Leave empty to show no product cards at all
  // (Tab 3 then stays pure self-care tips). To enable later, add items like:
  //   { name: "Reusable heat pad", blurb: "Gentle warmth for comfort.",
  //     url: "https://your-affiliate-link", cta: "View on Amazon" }
  // Keep to general comfort/wellbeing items only (no medical/treatment claims).
  AFFILIATE_ESSENTIALS: [],

  // Stripe Payment Link for the £39/mo practitioner directory listing.
  LIST_PRACTICE_STRIPE_URL: "https://REPLACE-WITH-YOUR-STRIPE-PAYMENT-LINK",
};
