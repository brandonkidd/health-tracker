import { BODYFI_PLAN } from "../config";
import type { HealthState } from "../types";
import {
  auxiliaryWeighIns,
  buildTrendSeries,
  dateToTime,
  daysBetween,
  type TrendPoint,
} from "./trend";

/**
 * Adaptive TDEE: learns actual total daily energy expenditure from the
 * relationship between logged intake and trend-weight change, instead of
 * relying on a hard-coded maintenance number.
 *
 *   measured TDEE = avg intake − (Δ trend weight × 3500 / days)
 *
 * While data is thin it falls back to Katch-McArdle (lean-mass based, which
 * reproduces the plan's InBody BMR of ~1856) times a lightly-active factor,
 * blending toward the measured value as logging completeness grows.
 */

const KCAL_PER_LB = 3500;
const DAY_MS = 86_400_000;
/** Desk job + daily walking + 3 classes/week baseline. */
const ACTIVITY_FACTOR = 1.4;
const MIN_PLAUSIBLE_TDEE = 1500;
const MAX_PLAUSIBLE_TDEE = 4500;
/** Guards against misread scan values (e.g. an OCR'd "27") poisoning the fallback. */
const MIN_PLAUSIBLE_BMR = 800;
const MAX_PLAUSIBLE_BMR = 3500;

export interface TdeeEstimate {
  /** Blended best estimate used everywhere in the app. */
  tdee: number;
  /** Pure energy-balance measurement (null when data is insufficient). */
  measuredTdee: number | null;
  /** Formula-based fallback (Katch-McArdle × activity factor). */
  fallbackTdee: number;
  /** Basal metabolic rate used by the fallback. */
  bmr: number;
  /** 0..1 — how much the estimate leans on measured data. */
  confidence: number;
  /** Days spanned by the measurement window actually used. */
  windowDays: number;
  intakeDays: number;
  weighInDays: number;
  avgIntake: number | null;
  trendChangeLbs: number | null;
}

function latestLeanMassLb(state: HealthState): number {
  const scans = [...state.bodyScans].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = scans.length - 1; i >= 0; i--) {
    const scan = scans[i];
    if (typeof scan.leanMass === "number" && scan.leanMass > 0) return scan.leanMass;
    // Scans often omit lean mass but list weight and body fat % — derive it.
    if (
      typeof scan.weight === "number" &&
      scan.weight > 0 &&
      typeof scan.bodyFat === "number" &&
      scan.bodyFat > 0 &&
      scan.bodyFat < 100
    ) {
      return Number((scan.weight * (1 - scan.bodyFat / 100)).toFixed(1));
    }
  }
  return BODYFI_PLAN.baseline.leanMass;
}

function latestMeasuredBmr(state: HealthState): number | null {
  const scans = [...state.bodyScans].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = scans.length - 1; i >= 0; i--) {
    const bmr = scans[i].bmr;
    if (typeof bmr === "number" && bmr >= MIN_PLAUSIBLE_BMR && bmr <= MAX_PLAUSIBLE_BMR) {
      return bmr;
    }
  }
  return null;
}

/** Katch-McArdle BMR from lean body mass — no age/sex assumptions needed. */
export function katchMcArdleBmr(leanMassLb: number): number {
  const leanMassKg = leanMassLb * 0.453592;
  return Math.round(370 + 21.6 * leanMassKg);
}

export function fallbackTdee(state: HealthState): { tdee: number; bmr: number } {
  const bmr = latestMeasuredBmr(state) ?? katchMcArdleBmr(latestLeanMassLb(state));
  return { tdee: Math.round(bmr * ACTIVITY_FACTOR), bmr };
}

export function estimateTdee(
  state: HealthState,
  endDate: string,
  windowDays = 28,
  precomputedSeries?: TrendPoint[]
): TdeeEstimate {
  const fallback = fallbackTdee(state);
  const series =
    precomputedSeries ?? buildTrendSeries(state.days, auxiliaryWeighIns(state));

  const end = dateToTime(endDate);
  const windowStart = end - windowDays * DAY_MS;
  const windowPoints = series.filter((point) => {
    const time = dateToTime(point.date);
    return time <= end && time > windowStart;
  });

  const base: TdeeEstimate = {
    tdee: fallback.tdee,
    measuredTdee: null,
    fallbackTdee: fallback.tdee,
    bmr: fallback.bmr,
    confidence: 0,
    windowDays: 0,
    intakeDays: 0,
    weighInDays: windowPoints.length,
    avgIntake: null,
    trendChangeLbs: null,
  };
  if (windowPoints.length < 4) return base;

  const first = windowPoints[0];
  const last = windowPoints[windowPoints.length - 1];
  const span = daysBetween(first.date, last.date);
  if (span < 7) return { ...base, windowDays: span };

  // Intake days between the first and last weigh-in (aligned energy window).
  const intakeCalories: number[] = [];
  for (const day of Object.values(state.days)) {
    const time = dateToTime(day.date);
    if (time < dateToTime(first.date) || time > dateToTime(last.date)) continue;
    if (day.calories > 0 || day.meals.length > 0) intakeCalories.push(day.calories);
  }
  if (intakeCalories.length < 7) {
    return {
      ...base,
      windowDays: span,
      intakeDays: intakeCalories.length,
      trendChangeLbs: Number((last.trend - first.trend).toFixed(2)),
    };
  }

  const avgIntake =
    intakeCalories.reduce((sum, c) => sum + c, 0) / intakeCalories.length;
  const trendChange = last.trend - first.trend;
  const rawMeasured = avgIntake - (trendChange * KCAL_PER_LB) / span;
  const measuredTdee = Math.round(
    Math.min(MAX_PLAUSIBLE_TDEE, Math.max(MIN_PLAUSIBLE_TDEE, rawMeasured))
  );

  const intakeCoverage = Math.min(1, intakeCalories.length / (span + 1));
  const weighCoverage = Math.min(1, windowPoints.length / (span + 1));
  const spanFactor = Math.min(1, span / 21);
  const confidence = Number(
    (spanFactor * (0.35 + 0.45 * intakeCoverage + 0.2 * weighCoverage)).toFixed(2)
  );

  const tdee = Math.round(
    confidence * measuredTdee + (1 - confidence) * fallback.tdee
  );

  return {
    tdee,
    measuredTdee,
    fallbackTdee: fallback.tdee,
    bmr: fallback.bmr,
    confidence,
    windowDays: span,
    intakeDays: intakeCalories.length,
    weighInDays: windowPoints.length,
    avgIntake: Math.round(avgIntake),
    trendChangeLbs: Number(trendChange.toFixed(2)),
  };
}
