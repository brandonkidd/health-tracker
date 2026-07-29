import { plannedActivity } from "./config";
import { ptDateKey } from "./date";
import type { DailyLog, HealthState } from "./types";

export const HEALTH_STORE_KEY = "bodyfi_health_v2";
const LEGACY_STORE_KEY = "brandon_gameplan_v1";
const SNAPSHOT_PREFIX = "bodyfi_health_v2_snap_";
const SNAPSHOT_KEEP = 14;

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

/**
 * A July 2026 debugging session accidentally synced fake seeded logs into
 * production (a 212→208 lb weight series plus uniform macro rows). The cloud
 * copy was cleaned, but stale device localStorage and on-device snapshots can
 * carry the fake values back in through the loss-proof merge — so strip
 * anything matching the fake signature every time a state is loaded or merged.
 * Real weights in this window are ~192–194 lb, so >= 205 is unambiguous.
 */
const FAKE_SEED_START = "2026-07-08";
const FAKE_SEED_END = "2026-07-31";
const FAKE_SEED_MIN_WEIGHT = 205;

function isFakeSeedDay(day: DailyLog): boolean {
  return (
    day.waterOz === 64 &&
    day.protein === 150 &&
    day.carbs === 160 &&
    day.fat === 60 &&
    day.fiber === 28 &&
    day.steps === 8200 &&
    day.walkingMinutes === 35
  );
}

export function scrubSeededArtifacts(state: HealthState): HealthState {
  for (const [date, day] of Object.entries(state.days)) {
    if (date < FAKE_SEED_START || date > FAKE_SEED_END) continue;
    if (isFakeSeedDay(day)) {
      delete state.days[date];
      continue;
    }
    if (typeof day.weight === "number" && day.weight >= FAKE_SEED_MIN_WEIGHT) {
      delete day.weight;
    }
  }
  // Also drop misread scan BMRs (e.g. an OCR'd "27") so a bad import stored
  // on a device can't keep syncing back; the TDEE math ignores these anyway.
  for (const scan of state.bodyScans ?? []) {
    if (typeof scan.bmr === "number" && (scan.bmr < 800 || scan.bmr > 4000)) {
      delete scan.bmr;
    }
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
  return scrubSeededArtifacts(merged);
}

export function loadHealthState(): HealthState {
  if (typeof window === "undefined") return emptyHealthState();
  const current = window.localStorage.getItem(HEALTH_STORE_KEY);
  if (current) {
    try {
      return scrubSeededArtifacts(JSON.parse(current) as HealthState);
    } catch {
      return emptyHealthState();
    }
  }

  const legacy = window.localStorage.getItem(LEGACY_STORE_KEY);
  const migrated = legacy ? scrubSeededArtifacts(migrateLegacy(legacy)) : emptyHealthState();
  saveHealthState(migrated);
  return migrated;
}

export function saveHealthState(state: HealthState): void {
  if (typeof window === "undefined") return;
  const existing = window.localStorage.getItem(HEALTH_STORE_KEY);
  if (existing) snapshotBeforeFirstWriteOfDay(existing);
  window.localStorage.setItem(HEALTH_STORE_KEY, JSON.stringify(state));
}

function localDateKey(): string {
  return ptDateKey();
}

/**
 * Before the first save of each day, stash the previous day's final state as
 * a rolling snapshot. If anything ever corrupts or wipes the live store, the
 * last 14 end-of-day copies are still on the device to restore from.
 */
function snapshotBeforeFirstWriteOfDay(existingRaw: string): void {
  try {
    const key = SNAPSHOT_PREFIX + localDateKey();
    if (window.localStorage.getItem(key) != null) return;
    window.localStorage.setItem(key, existingRaw);
    for (const stale of snapshotKeys().sort().reverse().slice(SNAPSHOT_KEEP)) {
      window.localStorage.removeItem(stale);
    }
  } catch {
    // Snapshots are best-effort (e.g. storage quota); never block the live save.
  }
}

function snapshotKeys(): string[] {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(SNAPSHOT_PREFIX)) keys.push(key);
  }
  return keys;
}

export interface HealthSnapshot {
  date: string;
  state: HealthState;
}

/** Automatic on-device snapshots, newest first. */
export function listHealthSnapshots(): HealthSnapshot[] {
  if (typeof window === "undefined") return [];
  const snapshots: HealthSnapshot[] = [];
  for (const key of snapshotKeys()) {
    try {
      const state = JSON.parse(window.localStorage.getItem(key)!) as HealthState;
      if (state?.version === 2 && state.days) {
        snapshots.push({ date: key.slice(SNAPSHOT_PREFIX.length), state });
      }
    } catch {
      // Skip unreadable snapshots rather than failing the whole list.
    }
  }
  return snapshots.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Merge a snapshot back into the current state. Uses the loss-proof merge, so
 * restoring never discards anything logged since the snapshot was taken.
 */
export function restoreHealthSnapshot(date: string, current: HealthState): HealthState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SNAPSHOT_PREFIX + date);
  if (!raw) return null;
  try {
    return mergeHealthStates(current, JSON.parse(raw) as HealthState);
  } catch {
    return null;
  }
}

export function parseHealthBackup(raw: string): HealthState {
  const parsed = JSON.parse(raw) as Partial<HealthState>;
  if (parsed.version !== 2 || !parsed.days || !Array.isArray(parsed.weeklyCheckIns)) {
    throw new Error("This is not a valid BFIT v2 backup.");
  }
  return parsed as HealthState;
}
