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

  AFFILIATE_ESSENTIALS: [
    { name: "Reusable heat pad / wheat bag", blurb: "Gentle warmth for cramps, back and muscle comfort.", url: "https://REPLACE-WITH-YOUR-AFFILIATE-LINK", cta: "View on Amazon" },
    { name: "TENS machine", blurb: "Drug-free comfort device for period and muscle aches.", url: "https://REPLACE-WITH-YOUR-AFFILIATE-LINK", cta: "View on Amazon" },
    { name: "Saline nasal spray", blurb: "Simple saline rinse for congestion and dryness comfort.", url: "https://REPLACE-WITH-YOUR-AFFILIATE-LINK", cta: "View on Amazon" },
    { name: "Wellness & symptom journal", blurb: "Track symptoms, cycles and questions before appointments.", url: "https://REPLACE-WITH-YOUR-AFFILIATE-LINK", cta: "View on Amazon" },
    { name: "Fragrance-free emollient moisturiser", blurb: "Everyday comfort for dry and sensitive skin.", url: "https://REPLACE-WITH-YOUR-AFFILIATE-LINK", cta: "View on Amazon" },
    { name: "Warm compress eye mask", blurb: "Soothing warmth for tired, dry eyes.", url: "https://REPLACE-WITH-YOUR-AFFILIATE-LINK", cta: "View on Amazon" },
  ],

  // Stripe Payment Link for the £39/mo practitioner directory listing.
  LIST_PRACTICE_STRIPE_URL: "https://REPLACE-WITH-YOUR-STRIPE-PAYMENT-LINK",
};
