import type { HealthState } from "../types";
import type { EngineSnapshot } from "./index";
import { dateToTime } from "./trend";

/**
 * The digest is the single compact payload the AI insight model sees:
 * engine conclusions plus a per-day summary of the last 28 days. Hashing it
 * lets the client skip regeneration when nothing material has changed.
 */

const DAY_MS = 86_400_000;
const DIGEST_DAYS = 28;

export interface DigestDay {
  date: string;
  calories: number;
  protein: number;
  waterOz: number;
  steps: number;
  sleepHours: number | null;
  weight: number | null;
  energy: number | null;
  soreness: number | null;
  trained: boolean;
  workouts: string[];
  alcohol: boolean;
}

export interface InsightDigest {
  date: string;
  days: DigestDay[];
  engine: {
    tdee: EngineSnapshot["tdee"];
    targets: EngineSnapshot["targets"];
    forecast: {
      startTrendWeight: number;
      observedRatePerWeek: number | null;
      projectedRatePerWeek: number;
      goalWeight: number;
      etaWeeks: number | null;
      etaDate: string | null;
      deltaVsPlan: number;
    } | null;
    correlations: EngineSnapshot["correlations"]["findings"];
  };
}

const ALCOHOL_PATTERN =
  /\b(wine|beer|ipa|lager|cocktail|whiskey|bourbon|vodka|tequila|margarita|seltzer|sake|champagne|mezcal|rum|gin|alcohol|drink)\b/i;

export function buildInsightDigest(
  state: HealthState,
  snapshot: EngineSnapshot,
  today: string
): InsightDigest {
  const end = dateToTime(today);
  const days: DigestDay[] = Object.values(state.days)
    .filter((day) => {
      const time = dateToTime(day.date);
      return time <= end && time > end - DIGEST_DAYS * DAY_MS;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      date: day.date,
      calories: day.calories,
      protein: day.protein,
      waterOz: day.waterOz,
      steps: day.steps,
      sleepHours: day.sleepHours ?? null,
      weight: day.weight ?? null,
      energy: day.energy ?? null,
      soreness: day.soreness ?? null,
      trained: day.activityCompleted || (day.workouts?.length ?? 0) > 0,
      workouts: (day.workouts ?? []).map((workout) => workout.activity),
      alcohol: day.meals.some((meal) => ALCOHOL_PATTERN.test(meal.label)),
    }));

  const forecast = snapshot.forecast
    ? {
        startTrendWeight: snapshot.forecast.startTrendWeight,
        observedRatePerWeek: snapshot.forecast.observedRatePerWeek,
        projectedRatePerWeek: snapshot.forecast.projectedRatePerWeek,
        goalWeight: snapshot.forecast.goalWeight,
        etaWeeks: snapshot.forecast.etaWeeks,
        etaDate: snapshot.forecast.etaDate,
        deltaVsPlan: snapshot.forecast.deltaVsPlan,
      }
    : null;

  return {
    date: today,
    days,
    engine: {
      tdee: snapshot.tdee,
      targets: snapshot.targets,
      forecast,
      correlations: snapshot.correlations.findings,
    },
  };
}

/** djb2 string hash — stable fingerprint for "has anything changed today". */
export function hashDigest(digest: InsightDigest): string {
  const json = JSON.stringify(digest);
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}
