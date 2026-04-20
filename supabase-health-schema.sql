-- Health Tracking Tables for Brandon.Fit
-- Run this in your Supabase SQL Editor

-- Daily tracking (water, protein, weight, sleep, etc)
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  water DECIMAL(3,2) DEFAULT 0,
  protein INTEGER DEFAULT 0,
  weight DECIMAL(5,1),
  sleep DECIMAL(3,1),
  energy INTEGER,
  mood INTEGER,
  steps INTEGER,
  caffeine_ok VARCHAR(10),
  day_type VARCHAR(20), -- 'lifting', 'peloton', 'rest'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Supplement tracking
CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  supplement_id VARCHAR(50) NOT NULL,
  supplement_name VARCHAR(100) NOT NULL,
  taken BOOLEAN DEFAULT FALSE,
  taken_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, supplement_id)
);

-- Workout tracking
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  workout_type VARCHAR(20), -- 'A', 'B', 'C', 'peloton', 'run'
  exercise VARCHAR(100),
  sets INTEGER,
  reps VARCHAR(20), -- can be "12" or "8-10"
  weight DECIMAL(5,1),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Body composition checkpoints
CREATE TABLE IF NOT EXISTS body_composition (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  weight DECIMAL(5,1),
  bmi DECIMAL(4,1),
  body_fat DECIMAL(4,1),
  lean_mass DECIMAL(5,1),
  muscle_mass DECIMAL(5,1),
  skeletal_muscle DECIMAL(4,1),
  body_water DECIMAL(4,1),
  subcutaneous_fat DECIMAL(4,1),
  visceral_fat INTEGER,
  bone_mass DECIMAL(4,1),
  protein DECIMAL(4,1),
  bmr INTEGER,
  metabolic_age INTEGER,
  waist DECIMAL(4,1), -- inches
  chest DECIMAL(4,1),
  arms DECIMAL(4,1),
  photos JSONB, -- URLs to progress photos
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Meal tracking (optional, for future)
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  meal_time VARCHAR(20), -- 'breakfast', 'lunch', 'dinner', 'snack'
  description TEXT,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  calories INTEGER,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_date ON supplement_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition(date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date DESC);

-- Enable Row Level Security (optional - for multi-user future)
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (single user for now)
CREATE POLICY "Allow all operations" ON daily_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON supplement_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON workout_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON body_composition FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON meal_logs FOR ALL USING (true);

-- Insert baseline body composition (April 19, 2026)
INSERT INTO body_composition (
  date, weight, bmi, body_fat, lean_mass, muscle_mass,
  skeletal_muscle, body_water, subcutaneous_fat, visceral_fat,
  bone_mass, protein, bmr, metabolic_age
) VALUES (
  '2026-04-19', 191.8, 26.0, 20.9, 151.8, 144.2,
  51.2, 57.2, 18.2, 9,
  7.6, 18.0, 1856, 41
) ON CONFLICT (date) DO NOTHING;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for daily_logs
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON daily_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE daily_logs IS 'Daily tracking: water, protein, weight, sleep, energy, mood';
COMMENT ON TABLE supplement_logs IS 'Supplement checklist tracking';
COMMENT ON TABLE workout_logs IS 'Exercise logging with sets/reps/weight';
COMMENT ON TABLE body_composition IS 'Body composition checkpoints (baseline, 8-week, birthday)';
COMMENT ON TABLE meal_logs IS 'Optional meal tracking for future use';
