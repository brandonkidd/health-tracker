#!/usr/bin/env node
// Verifies the BFIT Supabase setup: loads .env.local, connects with the secret
// (service role) key, and confirms every expected table is reachable. Read-only
// — it never writes. Run:  node scripts/verify-supabase.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // No .env.local — fall back to whatever is already in the environment.
  }
}

const TABLES = [
  "daily_logs",
  "supplement_logs",
  "meal_logs",
  "weekly_check_ins",
  "body_composition",
  "lab_panels",
  "lab_results",
  "workout_scans",
  "daily_insights",
  "health_state_snapshots",
];

async function main() {
  loadEnvLocal();

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("✗ Missing SUPABASE_URL and/or SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  console.log(`Connecting to ${url} …\n`);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let failures = 0;
  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error(`✗ ${table.padEnd(24)} ${error.message}`);
      failures++;
    } else {
      console.log(`✓ ${table.padEnd(24)} reachable (${count ?? 0} rows)`);
    }
  }

  console.log();
  if (failures) {
    console.error(
      `${failures} table(s) failed. If they're "does not exist", run supabase-setup.sql ` +
        `in the SQL editor. If it's a permission error, confirm you're using the SECRET key.`
    );
    process.exit(1);
  }
  console.log("All tables reachable — Supabase is set up correctly. ✅");
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
