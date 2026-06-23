import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  nodeEnv: optional("NODE_ENV", "development"),

  stripe: {
    secretKey: required("STRIPE_SECRET_KEY"),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
  },

  resend: {
    apiKey: required("RESEND_API_KEY"),
    from: optional("EMAIL_FROM", "orders@example.com"),
  },

  lulu: {
    apiKey: required("LULU_API_KEY"),
    apiSecret: required("LULU_API_SECRET"),
    sandbox: optional("LULU_SANDBOX", "true") === "true",
  },

  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
  },

  convertkit: {
    apiKey: required("CONVERTKIT_API_KEY"),
    formId: required("CONVERTKIT_FORM_ID"),
  },

  download: {
    baseUrl: optional("DOWNLOAD_BASE_URL", "http://localhost:3000/download"),
    expiryHours: parseInt(optional("DOWNLOAD_LINK_EXPIRY_HOURS", "48"), 10),
  },
} as const;
