import { createClient } from "@supabase/supabase-js";
import { emptyDailyLog, emptyHealthState } from "./storage";
import type {
  BodyScan,
  DailyInsight,
  DailyLog,
  HealthState,
  LabPanel,
  LabResult,
  MealEntry,
  WeeklyCheckIn,
  WorkoutScan,
} from "./types";

function client() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Next.js patches fetch with a data cache; health reads must be live.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export function isCloudConfigured(): boolean {
  return Boolean(client());
}

export async function readCloudState(): Promise<HealthState> {
  const supabase = client();
  if (!supabase) throw new Error("Supabase is not configured.");

  const [days, supplements, meals, checkIns, scans, panels, results, workouts, insights] =
    await Promise.all([
      supabase.from("daily_logs").select("*"),
      supabase.from("supplement_logs").select("*"),
      supabase.from("meal_logs").select("*"),
      supabase.from("weekly_check_ins").select("*"),
      supabase.from("body_composition").select("*"),
      supabase.from("lab_panels").select("*"),
      supabase.from("lab_results").select("*"),
      supabase.from("workout_scans").select("*"),
      supabase.from("daily_insights").select("*"),
    ]);

  const firstError = [
    days,
    supplements,
    meals,
    checkIns,
    scans,
    panels,
    results,
    workouts,
    insights,
  ].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const state = emptyHealthState();
  for (const row of days.data ?? []) {
    state.days[row.date] = {
      date: row.date,
      waterOz: row.water_oz ?? 0,
      calories: row.calories ?? 0,
      protein: row.protein ?? 0,
      carbs: row.carbs ?? 0,
      fat: row.fat ?? 0,
      fiber: row.fiber ?? 0,
      weight: row.weight == null ? undefined : Number(row.weight),
      sleepHours: row.sleep_hours == null ? undefined : Number(row.sleep_hours),
      steps: row.steps ?? 0,
      walkingMinutes: row.walking_minutes ?? 0,
      activityType: row.activity_type ?? undefined,
      activityCompleted: row.activity_completed ?? false,
      estimatedActivityCalories: row.estimated_activity_calories ?? 0,
      energy: row.energy ?? undefined,
      mood: row.mood ?? undefined,
      soreness: row.soreness ?? undefined,
      supplements: {},
      meals: [],
      workouts: [],
      notes: row.notes ?? "",
    };
  }

  for (const row of supplements.data ?? []) {
    const day = state.days[row.date];
    if (day) day.supplements[row.supplement_id] = Boolean(row.taken);
  }

  for (const row of workouts.data ?? []) {
    const day = (state.days[row.date] ??= emptyDailyLog(row.date));
    (day.workouts ??= []).push({
      id: row.id,
      at: row.at,
      activity: row.activity,
      durationMinutes: row.duration_minutes ?? undefined,
      calories: row.calories ?? undefined,
      avgHeartRate: row.avg_heart_rate ?? undefined,
      maxHeartRate: row.max_heart_rate ?? undefined,
      exercises: Array.isArray(row.exercises) ? row.exercises : [],
      summary: row.summary ?? undefined,
      recommendations: Array.isArray(row.recommendations)
        ? row.recommendations
        : [],
    } satisfies WorkoutScan);
  }

  state.insights = {};
  for (const row of insights.data ?? []) {
    const payload = row.payload as DailyInsight | null;
    if (payload) state.insights[row.date] = payload;
  }
  for (const row of meals.data ?? []) {
    const day = state.days[row.date];
    if (!day) continue;
    day.meals.push({
      id: row.id,
      label: row.label,
      calories: row.calories ?? 0,
      protein: row.protein ?? 0,
      carbs: row.carbs ?? 0,
      fat: row.fat ?? 0,
      fiber: row.fiber ?? 0,
      at: row.eaten_at ?? `${row.date}T12:00:00`,
    });
  }

  state.weeklyCheckIns = (checkIns.data ?? []).map(
    (row): WeeklyCheckIn => ({
      id: row.id,
      date: row.date,
      weight: row.weight == null ? undefined : Number(row.weight),
      waist: row.waist == null ? undefined : Number(row.waist),
      bodyFat: row.body_fat == null ? undefined : Number(row.body_fat),
      note: row.note ?? "",
    })
  );
  state.bodyScans = (scans.data ?? []).map(
    (row): BodyScan => ({
      id: row.id,
      date: row.date,
      weight: row.weight == null ? undefined : Number(row.weight),
      bodyFat: row.body_fat == null ? undefined : Number(row.body_fat),
      leanMass: row.lean_mass == null ? undefined : Number(row.lean_mass),
      muscleMass: row.muscle_mass == null ? undefined : Number(row.muscle_mass),
      skeletalMuscle:
        row.skeletal_muscle == null ? undefined : Number(row.skeletal_muscle),
      visceralFat: row.visceral_fat == null ? undefined : Number(row.visceral_fat),
      bmr: row.bmr ?? undefined,
      waist: row.waist == null ? undefined : Number(row.waist),
      notes: row.notes ?? "",
    })
  );

  const labResults = (results.data ?? []).map(
    (row): LabResult => ({
      id: row.id,
      panelId: row.panel_id,
      marker: row.marker,
      category: row.category,
      value: row.value,
      unit: row.unit,
      referenceRange: row.reference_range,
      status: row.status,
      notes: row.notes ?? "",
    })
  );
  state.labPanels = (panels.data ?? []).map(
    (row): LabPanel => ({
      id: row.id,
      date: row.date,
      labName: row.lab_name,
      notes: row.notes ?? "",
      results: labResults.filter((result) => result.panelId === row.id),
    })
  );
  return state;
}

/**
 * Snapshot retention: every daily snapshot for the last 60 days, then only
 * first-of-month snapshots forever. Keeps recovery windows generous while
 * bounding growth to ~12 rows per year long-term.
 */
export function snapshotDatesToPrune(dates: string[], today: string): string[] {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 60);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return dates.filter((date) => date < cutoffKey && !date.endsWith("-01"));
}

/**
 * Archive the full state as today's point-in-time snapshot. Re-saving during
 * the day updates the same row, so each past day holds its final state.
 */
export async function writeCloudSnapshot(state: HealthState): Promise<void> {
  const supabase = client();
  if (!supabase) throw new Error("Supabase is not configured.");
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("health_state_snapshots")
    .upsert(
      { date: today, taken_at: new Date().toISOString(), payload: state },
      { onConflict: "date" }
    );
  if (error) throw error;

  const { data, error: listError } = await supabase
    .from("health_state_snapshots")
    .select("date");
  if (listError) throw listError;
  const prune = snapshotDatesToPrune((data ?? []).map((row) => String(row.date)), today);
  if (prune.length) {
    const { error: pruneError } = await supabase
      .from("health_state_snapshots")
      .delete()
      .in("date", prune);
    if (pruneError) throw pruneError;
  }
}

export async function listCloudSnapshots(): Promise<{ date: string; takenAt: string }[]> {
  const supabase = client();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("health_state_snapshots")
    .select("date, taken_at")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ date: String(row.date), takenAt: String(row.taken_at) }));
}

export async function readCloudSnapshot(date: string): Promise<HealthState | null> {
  const supabase = client();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("health_state_snapshots")
    .select("payload")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return (data?.payload as HealthState | undefined) ?? null;
}

export async function writeCloudState(state: HealthState): Promise<void> {
  const supabase = client();
  if (!supabase) throw new Error("Supabase is not configured.");

  const dailyRows = Object.values(state.days).map((day: DailyLog) => ({
    date: day.date,
    water_oz: day.waterOz,
    calories: day.calories,
    protein: day.protein,
    carbs: day.carbs,
    fat: day.fat,
    fiber: day.fiber,
    weight: day.weight ?? null,
    sleep_hours: day.sleepHours ?? null,
    steps: day.steps,
    walking_minutes: day.walkingMinutes,
    activity_type: day.activityType ?? null,
    activity_completed: day.activityCompleted,
    estimated_activity_calories: day.estimatedActivityCalories,
    energy: day.energy ?? null,
    mood: day.mood ?? null,
    soreness: day.soreness ?? null,
    notes: day.notes,
  }));
  const supplementRows = Object.values(state.days).flatMap((day) =>
    Object.entries(day.supplements)
      .filter(([, taken]) => taken)
      .map(([id]) => ({
        date: day.date,
        supplement_id: id,
        supplement_name: id,
        taken: true,
        taken_at: new Date().toISOString(),
      }))
  );
  const mealRows = Object.values(state.days).flatMap((day) =>
    day.meals.map((meal: MealEntry) => ({
      id: meal.id,
      date: day.date,
      label: meal.label,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber ?? 0,
      eaten_at: meal.at,
    }))
  );
  const workoutRows = Object.values(state.days).flatMap((day) =>
    (day.workouts ?? []).map((workout: WorkoutScan) => ({
      id: workout.id,
      date: day.date,
      at: workout.at,
      activity: workout.activity,
      duration_minutes: workout.durationMinutes ?? null,
      calories: workout.calories ?? null,
      avg_heart_rate: workout.avgHeartRate ?? null,
      max_heart_rate: workout.maxHeartRate ?? null,
      exercises: workout.exercises ?? [],
      summary: workout.summary ?? null,
      recommendations: workout.recommendations ?? [],
    }))
  );
  const insightRows = Object.values(state.insights ?? {}).map((insight) => ({
    date: insight.date,
    digest_hash: insight.digestHash,
    generated_at: insight.generatedAt,
    payload: insight,
  }));
  const panelRows = state.labPanels.map((panel) => ({
    id: panel.id,
    date: panel.date,
    lab_name: panel.labName,
    notes: panel.notes,
  }));
  const resultRows = state.labPanels.flatMap((panel) =>
    panel.results.map((result) => ({
      id: result.id,
      panel_id: panel.id,
      marker: result.marker,
      category: result.category,
      value: result.value,
      unit: result.unit,
      reference_range: result.referenceRange,
      status: result.status,
      notes: result.notes,
    }))
  );

  // Never wipe the whole store. Day rows are upserted in place and child rows
  // (meals, supplements, workouts) are only rewritten for dates this payload
  // actually contains, so a client with a stale or partial copy of the data
  // can never destroy days it doesn't know about.
  const payloadDates = Object.keys(state.days);
  if (payloadDates.length) {
    for (const table of ["meal_logs", "supplement_logs", "workout_scans"]) {
      const { error } = await supabase.from(table).delete().in("date", payloadDates);
      if (error) throw error;
    }
  }

  const writes = [
    dailyRows.length
      ? supabase.from("daily_logs").upsert(dailyRows, { onConflict: "date" })
      : null,
    supplementRows.length ? supabase.from("supplement_logs").insert(supplementRows) : null,
    mealRows.length ? supabase.from("meal_logs").insert(mealRows) : null,
    state.weeklyCheckIns.length
      ? supabase.from("weekly_check_ins").upsert(
          state.weeklyCheckIns.map((entry) => ({
            id: entry.id,
            date: entry.date,
            weight: entry.weight ?? null,
            waist: entry.waist ?? null,
            body_fat: entry.bodyFat ?? null,
            note: entry.note,
          })),
          { onConflict: "date" }
        )
      : null,
    state.bodyScans.length
      ? supabase.from("body_composition").upsert(
          state.bodyScans.map((scan) => ({
            id: scan.id,
            date: scan.date,
            weight: scan.weight ?? null,
            body_fat: scan.bodyFat ?? null,
            lean_mass: scan.leanMass ?? null,
            muscle_mass: scan.muscleMass ?? null,
            skeletal_muscle: scan.skeletalMuscle ?? null,
            visceral_fat: scan.visceralFat ?? null,
            bmr: scan.bmr ?? null,
            waist: scan.waist ?? null,
            notes: scan.notes,
          })),
          { onConflict: "date" }
        )
      : null,
    panelRows.length ? supabase.from("lab_panels").upsert(panelRows) : null,
    workoutRows.length ? supabase.from("workout_scans").insert(workoutRows) : null,
    insightRows.length
      ? supabase.from("daily_insights").upsert(insightRows, { onConflict: "date" })
      : null,
  ].filter(Boolean);

  for (const write of writes) {
    const { error } = await write!;
    if (error) throw error;
  }
  if (resultRows.length) {
    const { error } = await supabase.from("lab_results").upsert(resultRows);
    if (error) throw error;
  }
}
