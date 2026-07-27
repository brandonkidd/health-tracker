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
