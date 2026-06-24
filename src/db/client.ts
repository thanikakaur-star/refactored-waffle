import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config/index.js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const config = getConfig();
    _client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _client;
}

export function createTestClient(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}
