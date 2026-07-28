-- BFIT intelligence migration: workout scans + AI daily insights.
-- Run in the Supabase SQL editor after supabase-health-schema.sql.
-- Fixes the sync gap where AI-scanned workouts were dropped from the cloud.

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

CREATE INDEX IF NOT EXISTS idx_workout_scans_date ON workout_scans(date DESC);

ALTER TABLE workout_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;

-- Browser-facing roles get no access; only the server's secret key is used.
REVOKE ALL ON workout_scans, daily_insights FROM anon, authenticated;
