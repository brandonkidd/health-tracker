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
 * Adaptive base burn: the `tdee` field here is the BASE daily burn — the body
 * at rest plus everyday non-exercise living, with NO exercise allowance baked
 * in. Tracked workouts/classes (day.estimatedActivityCalories) are added on
 * top of this base wherever a day's total burn or deficit is computed.
 *
 * The measured value learns from energy balance, with tracked exercise
 * removed so it stays a true base:
 *
 *   measured base = avg intake − (Δ trend weight × 3500 / days) − avg tracked exercise
 *
 * While data is thin it falls back to the latest InBody BMR (~1856 for the
 * plan baseline) or Katch-McArdle from lean mass — i.e. the "1850/day" base —
 * blending toward the measured value as logging completeness grows.
 */

const KCAL_PER_LB = 3500;
const DAY_MS = 86_400_000;
const MIN_PLAUSIBLE_TDEE = 1200;
const MAX_PLAUSIBLE_TDEE = 4000;
/** Guards against misread scan values (e.g. an OCR'd "27") poisoning the fallback. */
const MIN_PLAUSIBLE_BMR = 800;
const MAX_PLAUSIBLE_BMR = 3500;

export interface TdeeEstimate {
  /** Blended best estimate of the BASE daily burn (no exercise included). */
  tdee: number;
  /** Energy-balance measurement minus tracked exercise (null when data is thin). */
  measuredTdee: number | null;
  /** Formula-based fallback: latest scan BMR or Katch-McArdle (~1850). */
  fallbackTdee: number;
  /** Basal metabolic rate used by the fallback. */
  bmr: number;
  /** Average tracked exercise cal/day inside the measurement window. */
  avgActivity: number;
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
  // The base burn IS the BMR: tracked classes/workouts are added on top per
  // day, so no activity multiplier here (that would double-count exercise).
  const bmr = latestMeasuredBmr(state) ?? katchMcArdleBmr(latestLeanMassLb(state));
  return { tdee: bmr, bmr };
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
    avgActivity: 0,
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

  // Intake days between the first and last weigh-in (aligned energy window),
  // plus tracked exercise across the whole window so the measured burn can be
  // reduced to a base (exercise is re-added per day by the UI).
  const intakeCalories: number[] = [];
  let activityTotal = 0;
  for (const day of Object.values(state.days)) {
    const time = dateToTime(day.date);
    if (time < dateToTime(first.date) || time > dateToTime(last.date)) continue;
    activityTotal += day.estimatedActivityCalories || 0;
    if (day.calories > 0 || day.meals.length > 0) intakeCalories.push(day.calories);
  }
  const avgActivity = Math.round(activityTotal / (span + 1));
  if (intakeCalories.length < 7) {
    return {
      ...base,
      windowDays: span,
      intakeDays: intakeCalories.length,
      avgActivity,
      trendChangeLbs: Number((last.trend - first.trend).toFixed(2)),
    };
  }

  const avgIntake =
    intakeCalories.reduce((sum, c) => sum + c, 0) / intakeCalories.length;
  const trendChange = last.trend - first.trend;
  const rawMeasured = avgIntake - (trendChange * KCAL_PER_LB) / span - avgActivity;
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
    avgActivity,
    confidence,
    windowDays: span,
    intakeDays: intakeCalories.length,
    weighInDays: windowPoints.length,
    avgIntake: Math.round(avgIntake),
    trendChangeLbs: Number(trendChange.toFixed(2)),
  };
}
