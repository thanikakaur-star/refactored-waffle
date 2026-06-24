import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function run() {
  console.log("Connecting to Supabase...", SUPABASE_URL);
  const client = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Test connection
  const { error: pingErr } = await client.from("_test_ping_").select("*").limit(1);
  // 42P01 = table doesn't exist, which is fine — means we connected
  if (pingErr && !pingErr.message.includes("does not exist") && !pingErr.code?.startsWith("42")) {
    console.error("Connection failed:", pingErr.message);
    process.exit(1);
  }
  console.log("Connected to Supabase successfully");

  // Execute schema via Supabase SQL REST endpoint
  const schemaSQL = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    DO $$ BEGIN
      CREATE TYPE tender_source AS ENUM ('ted_europa', 'sam_gov', 'who_procurement', 'nhs_supply_chain', 'manual');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE tender_status AS ENUM ('open', 'closed', 'awarded', 'cancelled', 'planned');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE procurement_category AS ENUM (
        'medical_devices', 'pharmaceuticals', 'health_it', 'laboratory_equipment',
        'hospital_infrastructure', 'personal_protective_equipment', 'diagnostics',
        'surgical_instruments', 'telemedicine', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE api_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS tenders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      external_id TEXT NOT NULL,
      source tender_source NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      buyer_name TEXT NOT NULL,
      buyer_country TEXT NOT NULL,
      buyer_region TEXT DEFAULT '',
      category procurement_category DEFAULT 'other',
      status tender_status DEFAULT 'open',
      published_at TIMESTAMPTZ NOT NULL,
      deadline TIMESTAMPTZ,
      original_currency TEXT NOT NULL DEFAULT 'USD',
      original_value NUMERIC,
      value_usd NUMERIC,
      compliance_criteria TEXT[] DEFAULT '{}',
      cpv_codes TEXT[] DEFAULT '{}',
      url TEXT NOT NULL,
      raw_data JSONB DEFAULT '{}',
      scraped_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source, external_id)
    );

    CREATE TABLE IF NOT EXISTS contract_awards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
      award_date TIMESTAMPTZ NOT NULL,
      supplier_name TEXT NOT NULL,
      supplier_country TEXT DEFAULT '',
      original_currency TEXT NOT NULL DEFAULT 'USD',
      award_value NUMERIC NOT NULL,
      award_value_usd NUMERIC NOT NULL,
      framework_type TEXT,
      duration TEXT,
      source tender_source NOT NULL,
      scraped_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS supply_chain_benchmarks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      region TEXT NOT NULL,
      category procurement_category NOT NULL,
      avg_lead_time_days NUMERIC,
      avg_contract_value_usd NUMERIC,
      tender_count INTEGER DEFAULT 0,
      award_count INTEGER DEFAULT 0,
      compliance_rate NUMERIC,
      period TEXT NOT NULL,
      calculated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(region, category, period)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      key TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      tier api_tier DEFAULT 'free',
      is_active BOOLEAN DEFAULT true,
      request_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT
    );

    CREATE TABLE IF NOT EXISTS scrape_runs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      source tender_source NOT NULL,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      tenders_found INTEGER DEFAULT 0,
      tenders_new INTEGER DEFAULT 0,
      tenders_updated INTEGER DEFAULT 0,
      awards_found INTEGER DEFAULT 0,
      errors TEXT[] DEFAULT '{}',
      duration_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running'
    );
  `;

  // Use the SQL endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  }).catch(() => null);

  // Supabase doesn't expose raw SQL via REST, so we use the management API
  // Instead, let's create tables by trying to insert and checking errors,
  // or use the pg_net extension. The most reliable approach: use the SQL
  // endpoint at /rest/v1/rpc with a custom function, OR just create via
  // the Supabase client's RPC.

  // Simpler approach: verify tables exist by trying to select from them
  const tables = ["tenders", "contract_awards", "supply_chain_benchmarks", "api_keys", "scrape_runs"];
  const missing: string[] = [];

  for (const table of tables) {
    const { error } = await client.from(table).select("id").limit(1);
    if (error) {
      missing.push(table);
      console.log(`Table '${table}': NOT FOUND (${error.message})`);
    } else {
      console.log(`Table '${table}': OK`);
    }
  }

  if (missing.length > 0) {
    console.log("\n⚠️  Missing tables:", missing.join(", "));
    console.log("\nYou need to run the schema SQL in the Supabase SQL Editor:");
    console.log("1. Go to https://supabase.com/dashboard/project/hhteyfywuenflsekntgz/sql/new");
    console.log("2. Paste the contents of src/db/schema.sql");
    console.log("3. Click 'Run'");
    console.log("4. Then re-run: npx tsx src/db/setup.ts");
    process.exit(1);
  }

  console.log("\n✅ All tables exist! Database is ready.");
  console.log("Run 'npx tsx src/db/seed-supabase.ts' to seed sample data.");
}

run().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
