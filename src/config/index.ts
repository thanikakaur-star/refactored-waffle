import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  SCRAPE_INTERVAL_HOURS: z.coerce.number().default(24),
  PLAYWRIGHT_HEADLESS: z.coerce.boolean().default(true),
  API_PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string().url().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  BASE_CURRENCY: z.string().default("USD"),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid env vars: ${missing}`);
  }
  return result.data;
}

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export function getConfigSafe(): Partial<Config> {
  const result = envSchema.safeParse(process.env);
  return result.success ? result.data : (process.env as unknown as Partial<Config>);
}
