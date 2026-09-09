-- ============================================================================
-- BFIT Health Tracker — complete Supabase setup (single paste)
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query
-- → paste → Run). It is fully idempotent, so it is safe to re-run any time.
--
-- This consolidates, in order:
--   1. supabase-health-schema.sql        (core tables)
--   2. supabase-migration-intelligence.sql (workout scans + AI insights)
--   3. supabase-migration-snapshots.sql   (point-in-time recovery snapshots)
--   4. supabase-migration-security.sql    (RLS + privilege hardening)
--
-- The app talks to Supabase ONLY from the Next.js server using the secret
-- (service role) key, so browser-facing roles (anon / authenticated) are
-- intentionally denied all access.
-- ============================================================================

-- ─── 1. Core tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  water_oz INTEGER NOT NULL DEFAULT 0,
  calories INTEGER NOT NULL DEFAULT 0,
  protein INTEGER NOT NULL DEFAULT 0,
  carbs INTEGER NOT NULL DEFAULT 0,
  fat INTEGER NOT NULL DEFAULT 0,
  fiber INTEGER NOT NULL DEFAULT 0,
  weight DECIMAL(5,1),
  sleep_hours DECIMAL(3,1),
  steps INTEGER NOT NULL DEFAULT 0,
  walking_minutes INTEGER NOT NULL DEFAULT 0,
  activity_type VARCHAR(20),
  activity_completed BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_activity_calories INTEGER NOT NULL DEFAULT 0,
  energy INTEGER,
  mood INTEGER,
  soreness INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  supplement_id VARCHAR(80) NOT NULL,
  supplement_name VARCHAR(120) NOT NULL,
  taken BOOLEAN NOT NULL DEFAULT TRUE,
  taken_at TIMESTAMPTZ,
  UNIQUE(date, supplement_id)
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  label TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein INTEGER NOT NULL DEFAULT 0,
  carbs INTEGER NOT NULL DEFAULT 0,
  fat INTEGER NOT NULL DEFAULT 0,
  fiber INTEGER NOT NULL DEFAULT 0,
  eaten_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS weekly_check_ins (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weight DECIMAL(5,1),
  waist DECIMAL(4,1),
  body_fat DECIMAL(4,1),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS body_composition (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weight DECIMAL(5,1),
  body_fat DECIMAL(4,1),
  lean_mass DECIMAL(5,1),
  muscle_mass DECIMAL(5,1),
  skeletal_muscle DECIMAL(5,1),
  visceral_fat DECIMAL(4,1),
  bmr INTEGER,
  waist DECIMAL(4,1),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_panels (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  lab_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_results (
  id TEXT PRIMARY KEY,
  panel_id TEXT NOT NULL REFERENCES lab_panels(id) ON DELETE CASCADE,
  marker TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  value TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  reference_range TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unrated'
    CHECK (status IN ('optimal', 'watch', 'follow-up', 'unrated')),
  notes TEXT NOT NULL DEFAULT ''
);

-- ─── 2. Intelligence: workout scans + AI daily insights ─────────────────────

CREATE TABLE IF NOT EXISTS workout_scans (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  -- Original ISO timestamp string, preserved verbatim for lossless round-trip.
  at TEXT NOT NULL,
  activity TEXT NOT NULL,
  duration_minutes INTEGER,
  calories INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  exercises JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  recommendations JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_insights (
  date DATE PRIMARY KEY,
  digest_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Snapshots: server-side point-in-time recovery ───────────────────────

CREATE TABLE IF NOT EXISTS health_state_snapshots (
  date DATE PRIMARY KEY,
  taken_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_date ON supplement_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_check_ins_date ON weekly_check_ins(date DESC);
CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition(date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_panels_date ON lab_panels(date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_panel ON lab_results(panel_id);
CREATE INDEX IF NOT EXISTS idx_workout_scans_date ON workout_scans(date DESC);

-- ─── 4. Security hardening (RLS + privilege revocation) ─────────────────────

-- Enable RLS on every table.
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_state_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop any lingering permissive policies from early schema versions. With no
-- replacement policies and RLS on, browser roles can read/write nothing.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'daily_logs', 'supplement_logs', 'meal_logs', 'weekly_check_ins',
        'body_composition', 'lab_panels', 'lab_results', 'workout_scans',
        'daily_insights', 'health_state_snapshots'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Defense in depth: revoke all table privileges from browser-facing roles.
-- RLS decides which rows are visible; these revokes make the tables unreachable
-- through the Data API entirely. Only the server's secret key can touch them.
REVOKE ALL ON daily_logs, supplement_logs, meal_logs, weekly_check_ins,
  body_composition, lab_panels, lab_results, workout_scans, daily_insights,
  health_state_snapshots
FROM anon, authenticated;

-- Future tables/functions/sequences in public get no anon/authenticated access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- updated_at trigger with a pinned search_path (Supabase advisor:
-- "Function Search Path Mutable").
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON daily_logs;
CREATE TRIGGER update_daily_logs_updated_at
BEFORE UPDATE ON daily_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Done. Verify with:  SELECT tablename FROM pg_tables WHERE schemaname = 'public';
