-- BFIT snapshots migration: server-side point-in-time recovery.
-- Run in the Supabase SQL editor after supabase-migration-intelligence.sql.
-- Each cloud save also archives the full health state JSON, one row per day.
-- Retention (enforced in app code): every day for 60 days, then the
-- first-of-month snapshot forever — bounded growth over years.

CREATE TABLE IF NOT EXISTS health_state_snapshots (
  date DATE PRIMARY KEY,
  taken_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE health_state_snapshots ENABLE ROW LEVEL SECURITY;
