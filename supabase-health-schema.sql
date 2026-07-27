-- BFIT Health Command Center schema
-- Run in the Supabase SQL editor. Browser clients are intentionally denied;
-- the Next.js server uses SUPABASE_SERVICE_ROLE_KEY.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_date ON supplement_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_check_ins_date ON weekly_check_ins(date DESC);
CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition(date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_panels_date ON lab_panels(date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_panel ON lab_results(panel_id);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

-- Remove permissive policies from the earlier schema. With no replacement
-- policies, anon/authenticated browser clients cannot read personal records.
DROP POLICY IF EXISTS "Allow all operations" ON daily_logs;
DROP POLICY IF EXISTS "Allow all operations" ON supplement_logs;
DROP POLICY IF EXISTS "Allow all operations" ON meal_logs;
DROP POLICY IF EXISTS "Allow all operations" ON body_composition;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON daily_logs;
CREATE TRIGGER update_daily_logs_updated_at
BEFORE UPDATE ON daily_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
