const STATIC_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.27,
  CHF: 1.13,
  CAD: 0.74,
  AUD: 0.66,
  JPY: 0.0067,
  SEK: 0.096,
  NOK: 0.094,
  DKK: 0.146,
  PLN: 0.25,
  CZK: 0.044,
  HUF: 0.0028,
  RON: 0.22,
  BGN: 0.56,
  HRK: 0.145,
  INR: 0.012,
  ZAR: 0.055,
  BRL: 0.2,
  MXN: 0.058,
  KES: 0.0078,
  NGN: 0.00065,
  GHS: 0.065,
  EGP: 0.021,
  AED: 0.272,
  SAR: 0.267,
  KRW: 0.00075,
  SGD: 0.74,
  THB: 0.028,
  PHP: 0.018,
  MYR: 0.22,
};

export function convertToUsd(amount: number, fromCurrency: string): number | null {
  const currency = fromCurrency.toUpperCase();
  const rate = STATIC_RATES[currency];
  if (rate === undefined) return null;
  return Math.round(amount * rate * 100) / 100;
}

export function parseCurrencyValue(raw: string): { amount: number; currency: string } | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();

  const patterns = [
    /(?<currency>[A-Z]{3})\s*(?<amount>[\d,]+(?:\.\d+)?)/,
    /(?<amount>[\d,]+(?:\.\d+)?)\s*(?<currency>[A-Z]{3})/,
    /€\s*(?<amount>[\d,]+(?:\.\d+)?)/,
    /£\s*(?<amount>[\d,]+(?:\.\d+)?)/,
    /\$\s*(?<amount>[\d,]+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.groups) {
      const amount = parseFloat(match.groups.amount?.replace(/,/g, "") ?? "0");
      let currency = match.groups.currency ?? "";

      if (!currency) {
        if (cleaned.includes("€")) currency = "EUR";
        else if (cleaned.includes("£")) currency = "GBP";
        else if (cleaned.includes("$")) currency = "USD";
      }

      if (amount > 0 && currency) {
        return { amount, currency: currency.toUpperCase() };
      }
    }
  }

  return null;
}

export function getSupportedCurrencies(): string[] {
  return Object.keys(STATIC_RATES);
}
