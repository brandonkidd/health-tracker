-- BFIT security hardening migration.
-- Run once in the Supabase SQL editor (safe to re-run; everything is idempotent).
--
-- This app talks to Supabase exclusively from the Next.js server using the
-- secret (service role) key, so browser-facing roles need zero access. The
-- schema files already enable RLS with no policies; this migration adds
-- defense in depth so a future mistake (a permissive policy, RLS toggled off
-- in the dashboard, a new table) still doesn't expose personal health data.

-- 1. Drop any lingering permissive policies from early schema versions.
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

-- 2. Re-assert RLS on every table (no-ops when already enabled).
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_state_snapshots ENABLE ROW LEVEL SECURITY;

-- 3. Revoke all table privileges from the browser-facing roles. RLS controls
--    which rows are visible; these grants control whether the tables are
--    reachable at all through the Data API. The service role is unaffected.
REVOKE ALL ON public.daily_logs, public.supplement_logs, public.meal_logs,
  public.weekly_check_ins, public.body_composition, public.lab_panels,
  public.lab_results, public.workout_scans, public.daily_insights,
  public.health_state_snapshots
FROM anon, authenticated;

-- 4. Future tables/functions/sequences in public get no anon/authenticated
--    access by default either.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 5. Pin the trigger function's search_path (Supabase advisor:
--    "Function Search Path Mutable"). A mutable search_path lets a
--    same-database attacker shadow objects the function references.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
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

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 6. Replace uuid-ossp with the built-in gen_random_uuid() (Supabase advisor:
--    "Extension in Public"). Existing rows keep their ids; only the default
--    for new rows changes.
ALTER TABLE public.daily_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.supplement_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP EXTENSION IF EXISTS "uuid-ossp";
