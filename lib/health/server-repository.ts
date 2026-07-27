import { createClient } from "@supabase/supabase-js";
import { emptyHealthState } from "./storage";
import type {
  BodyScan,
  DailyLog,
  HealthState,
  LabPanel,
  LabResult,
  MealEntry,
  WeeklyCheckIn,
} from "./types";

function client() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isCloudConfigured(): boolean {
  return Boolean(client());
}

export async function readCloudState(): Promise<HealthState> {
  const supabase = client();
  if (!supabase) throw new Error("Supabase is not configured.");

  const [days, supplements, meals, checkIns, scans, panels, results] =
    await Promise.all([
      supabase.from("daily_logs").select("*"),
      supabase.from("supplement_logs").select("*"),
      supabase.from("meal_logs").select("*"),
      supabase.from("weekly_check_ins").select("*"),
      supabase.from("body_composition").select("*"),
      supabase.from("lab_panels").select("*"),
      supabase.from("lab_results").select("*"),
    ]);

  const firstError = [days, supplements, meals, checkIns, scans, panels, results].find(
    (result) => result.error
  )?.error;
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
      notes: row.notes ?? "",
    };
  }

  for (const row of supplements.data ?? []) {
    const day = state.days[row.date];
    if (day) day.supplements[row.supplement_id] = Boolean(row.taken);
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

  const tables = [
    "lab_results",
    "lab_panels",
    "meal_logs",
    "supplement_logs",
    "body_composition",
    "weekly_check_ins",
    "daily_logs",
  ];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) throw error;
  }

  const writes = [
    dailyRows.length ? supabase.from("daily_logs").insert(dailyRows) : null,
    supplementRows.length ? supabase.from("supplement_logs").insert(supplementRows) : null,
    mealRows.length ? supabase.from("meal_logs").insert(mealRows) : null,
    state.weeklyCheckIns.length
      ? supabase.from("weekly_check_ins").insert(
          state.weeklyCheckIns.map((entry) => ({
            id: entry.id,
            date: entry.date,
            weight: entry.weight ?? null,
            waist: entry.waist ?? null,
            body_fat: entry.bodyFat ?? null,
            note: entry.note,
          }))
        )
      : null,
    state.bodyScans.length
      ? supabase.from("body_composition").insert(
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
          }))
        )
      : null,
    panelRows.length ? supabase.from("lab_panels").insert(panelRows) : null,
  ].filter(Boolean);

  for (const write of writes) {
    const { error } = await write!;
    if (error) throw error;
  }
  if (resultRows.length) {
    const { error } = await supabase.from("lab_results").insert(resultRows);
    if (error) throw error;
  }
}
