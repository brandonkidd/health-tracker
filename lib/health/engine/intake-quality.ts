import type { DailyLog } from "../types";

/**
 * Logging-quality helpers for adaptive TDEE / coach digest.
 *
 * Partial meal days (breakfast only, etc.) and wild outliers both pull the
 * energy-balance estimate off course. We classify each logged day so the
 * engine can average only "usable" intake and the AI can flag the rest
 * instead of treating underlogging as a deliberate deficit.
 */

/** Rest-day budget fraction below which a logged day is treated as incomplete. */
export const INCOMPLETE_INTAKE_FRACTION = 0.55;
/** Soft meal-count floor for a "full day" of logging. */
export const MIN_MEALS_FOR_COMPLETE = 2;
/** High / low fences relative to the usable-day median. */
export const OUTLIER_HIGH_MULTIPLIER = 1.65;
export const OUTLIER_LOW_MULTIPLIER = 0.5;

export type IntakeQuality =
  | "empty"
  | "inProgress"
  | "likelyIncomplete"
  | "outlierHigh"
  | "outlierLow"
  | "usable";

export interface IntakeDayAssessment {
  quality: IntakeQuality;
  /** True when this day should contribute to avgIntake / forecast math. */
  usableForAverage: boolean;
  reason: string | null;
}

export function hasIntake(day: Pick<DailyLog, "calories" | "meals">): boolean {
  return day.calories > 0 || day.meals.length > 0;
}

/** Daily calorie budget including earned exercise (rest target + activity). */
export function dayCalorieBudget(
  restDayTarget: number,
  activityCalories: number
): number {
  return restDayTarget + Math.max(0, activityCalories || 0);
}

/** Intake vs budget: negative means under budget (room left / deficit). */
export function vsCalorieBudget(
  calories: number,
  restDayTarget: number,
  activityCalories: number
): number {
  return calories - dayCalorieBudget(restDayTarget, activityCalories);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * First-pass completeness check (no peer comparison yet).
 * `isToday` marks an unfinished current day so the coach doesn't scold it
 * as a deliberate under-eat.
 */
export function assessIntakeCompleteness(
  day: Pick<DailyLog, "calories" | "meals">,
  restDayTarget: number,
  options: { isToday?: boolean } = {}
): IntakeDayAssessment {
  if (!hasIntake(day)) {
    return { quality: "empty", usableForAverage: false, reason: "no food logged" };
  }

  const floor = restDayTarget * INCOMPLETE_INTAKE_FRACTION;
  const thinMeals =
    day.meals.length > 0 && day.meals.length < MIN_MEALS_FOR_COMPLETE;
  const lowCalories = day.calories > 0 && day.calories < floor;

  if (lowCalories || (thinMeals && day.calories < restDayTarget * 0.7)) {
    if (options.isToday) {
      return {
        quality: "inProgress",
        usableForAverage: false,
        reason: "today still looks partial — not treated as a full day yet",
      };
    }
    return {
      quality: "likelyIncomplete",
      usableForAverage: false,
      reason: lowCalories
        ? `logged ${day.calories} cal (< ${Math.round(floor)} soft floor)`
        : `only ${day.meals.length} meal(s) logged`,
    };
  }

  return { quality: "usable", usableForAverage: true, reason: null };
}

/**
 * Classify every day in a window: incomplete first, then high/low outliers
 * against the median of the remaining candidates.
 */
export function classifyIntakeDays(
  days: Array<Pick<DailyLog, "date" | "calories" | "meals">>,
  restDayTarget: number,
  today?: string
): Map<string, IntakeDayAssessment> {
  const result = new Map<string, IntakeDayAssessment>();
  const candidates: number[] = [];

  for (const day of days) {
    const assessment = assessIntakeCompleteness(day, restDayTarget, {
      isToday: today != null && day.date === today,
    });
    result.set(day.date, assessment);
    if (assessment.usableForAverage) candidates.push(day.calories);
  }

  const peerMedian = median(candidates);
  if (peerMedian == null || candidates.length < 5) return result;

  const highFence = peerMedian * OUTLIER_HIGH_MULTIPLIER;
  const lowFence = peerMedian * OUTLIER_LOW_MULTIPLIER;

  for (const day of days) {
    const current = result.get(day.date);
    if (!current?.usableForAverage) continue;
    if (day.calories > highFence) {
      result.set(day.date, {
        quality: "outlierHigh",
        usableForAverage: false,
        reason: `${day.calories} cal vs ~${Math.round(peerMedian)} median (high outlier)`,
      });
    } else if (day.calories < lowFence) {
      result.set(day.date, {
        quality: "outlierLow",
        usableForAverage: false,
        reason: `${day.calories} cal vs ~${Math.round(peerMedian)} median (low outlier)`,
      });
    }
  }

  return result;
}

/** Robust mean of usable intake days; falls back to all hasIntake days. */
export function robustAverageIntake(
  days: Array<Pick<DailyLog, "date" | "calories" | "meals">>,
  restDayTarget: number,
  today?: string
): {
  avgIntake: number | null;
  usableDays: number;
  incompleteDays: number;
  outlierDays: number;
  rawIntakeDays: number;
  classifications: Map<string, IntakeDayAssessment>;
} {
  const classifications = classifyIntakeDays(days, restDayTarget, today);
  let usableSum = 0;
  let usableDays = 0;
  let incompleteDays = 0;
  let outlierDays = 0;
  let rawIntakeDays = 0;
  let rawSum = 0;

  for (const day of days) {
    const assessment = classifications.get(day.date);
    if (!assessment || assessment.quality === "empty") continue;
    rawIntakeDays += 1;
    rawSum += day.calories;
    if (assessment.usableForAverage) {
      usableDays += 1;
      usableSum += day.calories;
    } else if (
      assessment.quality === "likelyIncomplete" ||
      assessment.quality === "inProgress"
    ) {
      incompleteDays += 1;
    } else if (
      assessment.quality === "outlierHigh" ||
      assessment.quality === "outlierLow"
    ) {
      outlierDays += 1;
    }
  }

  if (usableDays >= 7) {
    return {
      avgIntake: usableSum / usableDays,
      usableDays,
      incompleteDays,
      outlierDays,
      rawIntakeDays,
      classifications,
    };
  }

  // Not enough clean days — fall back to every logged-intake day so the
  // estimator still has something to work with (confidence stays honest).
  return {
    avgIntake: rawIntakeDays > 0 ? rawSum / rawIntakeDays : null,
    usableDays,
    incompleteDays,
    outlierDays,
    rawIntakeDays,
    classifications,
  };
}
