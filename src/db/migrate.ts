import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSupabaseClient } from "./client.js";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const client = getSupabaseClient();
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  const statements = sql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  logger.info("Running migration", { statements: statements.length });

  for (const statement of statements) {
    const { error } = await client.rpc("exec_sql", { sql: statement + ";" });
    if (error) {
      logger.error("Migration statement failed", { error: error.message, statement: statement.slice(0, 100) });
    }
  }

  logger.info("Migration complete");
}

migrate().catch((err) => {
  logger.error("Migration failed", { error: String(err) });
  process.exit(1);
});
