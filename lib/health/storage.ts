import { plannedActivity } from "./config";
import type { DailyLog, HealthState } from "./types";

export const HEALTH_STORE_KEY = "bodyfi_health_v2";
const LEGACY_STORE_KEY = "brandon_gameplan_v1";

export const emptyHealthState = (): HealthState => ({
  version: 2,
  days: {},
  weeklyCheckIns: [],
  bodyScans: [],
  labPanels: [],
  archivedSupplements: [],
  insights: {},
  customPresets: [],
});

export function emptyDailyLog(date: string): DailyLog {
  return {
    date,
    waterOz: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    steps: 0,
    walkingMinutes: 0,
    activityType: plannedActivity(date).type,
    activityCompleted: false,
    estimatedActivityCalories: 0,
    supplements: {},
    meals: [],
    workouts: [],
    notes: "",
  };
}

export function migrateLegacy(raw: string): HealthState {
  const state = emptyHealthState();
  try {
    const legacy = JSON.parse(raw) as {
      days?: Record<string, Record<string, unknown>>;
    };
    for (const [date, source] of Object.entries(legacy.days ?? {})) {
      const waterCount = Number(source.water ?? 0);
      const foodLog = Array.isArray(source.foodLog) ? source.foodLog : [];
      state.days[date] = {
        ...emptyDailyLog(date),
        waterOz: waterCount * 8,
        calories: Number(source.calories ?? 0),
        protein: Number(source.protein ?? 0),
        carbs: Number(source.carbs ?? 0),
        fat: Number(source.fat ?? 0),
        weight: typeof source.weight === "number" ? source.weight : undefined,
        supplements:
          source.supps && typeof source.supps === "object"
            ? (source.supps as Record<string, boolean>)
            : {},
        meals: foodLog.map((entry, index) => {
          const item = entry as Record<string, unknown>;
          return {
            id: String(item.id ?? `legacy-${date}-${index}`),
            label: String(item.label ?? "Meal"),
            calories: Number(item.calories ?? item.kcal ?? 0),
            protein: Number(item.p ?? item.protein ?? 0),
            carbs: Number(item.c ?? item.carbs ?? 0),
            fat: Number(item.f ?? item.fat ?? 0),
            at: String(item.at ?? `${date}T12:00:00`),
          };
        }),
        notes: String(source.notes ?? ""),
      };
    }
  } catch {
    return emptyHealthState();
  }
  return state;
}

/** How much logged content a day carries; used to pick the richer copy in merges. */
export function dayRichness(day: DailyLog): number {
  const supplementsTaken = Object.values(day.supplements ?? {}).filter(Boolean).length;
  return (
    (day.meals?.length ?? 0) * 2 +
    (day.workouts?.length ?? 0) * 2 +
    (day.calories > 0 ? 1 : 0) +
    (day.protein > 0 ? 1 : 0) +
    (day.waterOz > 0 ? 1 : 0) +
    (day.steps > 0 ? 1 : 0) +
    (day.walkingMinutes > 0 ? 1 : 0) +
    (day.sleepHours != null ? 1 : 0) +
    (day.weight != null ? 1 : 0) +
    (day.activityCompleted ? 1 : 0) +
    (day.estimatedActivityCalories > 0 ? 1 : 0) +
    (day.notes ? 1 : 0) +
    supplementsTaken
  );
}

/**
 * Union of two states that never drops logged data: for each day keep the
 * richer copy, and union all id-keyed collections. Protects against a stale
 * device overwriting newer data from another device.
 */
export function mergeHealthStates(a: HealthState, b: HealthState): HealthState {
  const byId = <T extends { id: string }>(primary: T[], secondary: T[]): T[] => {
    const map = new Map<string, T>();
    for (const item of secondary ?? []) map.set(item.id, item);
    for (const item of primary ?? []) map.set(item.id, item);
    return Array.from(map.values());
  };

  const merged = emptyHealthState();
  const dates = new Set([...Object.keys(a.days), ...Object.keys(b.days)]);
  for (const date of Array.from(dates)) {
    const left = a.days[date];
    const right = b.days[date];
    if (!left || !right) {
      merged.days[date] = (left ?? right)!;
    } else {
      const [winner, loser] =
        dayRichness(left) >= dayRichness(right) ? [left, right] : [right, left];
      // Backfill scalar fields the winner never set (e.g. sleep logged on the
      // sparse device) so neither side's entries are lost.
      merged.days[date] = {
        ...winner,
        weight: winner.weight ?? loser.weight,
        sleepHours: winner.sleepHours ?? loser.sleepHours,
        energy: winner.energy ?? loser.energy,
        mood: winner.mood ?? loser.mood,
        soreness: winner.soreness ?? loser.soreness,
      };
    }
  }
  merged.weeklyCheckIns = byId(a.weeklyCheckIns, b.weeklyCheckIns).sort((x, y) =>
    x.date.localeCompare(y.date)
  );
  merged.bodyScans = byId(a.bodyScans, b.bodyScans).sort((x, y) => x.date.localeCompare(y.date));
  merged.labPanels = byId(a.labPanels, b.labPanels);
  merged.customPresets = byId(a.customPresets ?? [], b.customPresets ?? []);
  merged.archivedSupplements = Array.from(
    new Set([...(a.archivedSupplements ?? []), ...(b.archivedSupplements ?? [])])
  );
  merged.insights = { ...(b.insights ?? {}), ...(a.insights ?? {}) };
  return merged;
}

export function loadHealthState(): HealthState {
  if (typeof window === "undefined") return emptyHealthState();
  const current = window.localStorage.getItem(HEALTH_STORE_KEY);
  if (current) {
    try {
      return JSON.parse(current) as HealthState;
    } catch {
      return emptyHealthState();
    }
  }

  const legacy = window.localStorage.getItem(LEGACY_STORE_KEY);
  const migrated = legacy ? migrateLegacy(legacy) : emptyHealthState();
  saveHealthState(migrated);
  return migrated;
}

export function saveHealthState(state: HealthState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HEALTH_STORE_KEY, JSON.stringify(state));
}

export function parseHealthBackup(raw: string): HealthState {
  const parsed = JSON.parse(raw) as Partial<HealthState>;
  if (parsed.version !== 2 || !parsed.days || !Array.isArray(parsed.weeklyCheckIns)) {
    throw new Error("This is not a valid BFIT v2 backup.");
  }
  return parsed as HealthState;
}
