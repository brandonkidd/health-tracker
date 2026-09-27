import { BODYFI_PLAN } from "../config";
import type { HealthState } from "../types";
import { robustAverageIntake } from "./intake-quality";
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
 * Priority:
 *  1. Latest InBody / DEXA BMR (authoritative anchor when present)
 *  2. Katch-McArdle from latest lean mass
 *  3. Small energy-balance adjustment from weight + intake, clamped so partial
 *     meal logging cannot drag base burn far from the scan
 *
 *   measured base = avg intake − (Δ trend weight × 3500 / days) − avg tracked exercise
 */

const KCAL_PER_LB = 3500;
const DAY_MS = 86_400_000;
const MIN_PLAUSIBLE_TDEE = 1200;
const MAX_PLAUSIBLE_TDEE = 4000;
/** Guards against misread scan values (e.g. an OCR'd "27") poisoning the fallback. */
const MIN_PLAUSIBLE_BMR = 800;
const MAX_PLAUSIBLE_BMR = 3500;
/**
 * Measured energy-balance base must stay within this fraction of the InBody /
 * formula BMR. Stops underlogged meal days from inventing a 2300+ "base burn".
 */
const SCAN_ANCHOR_BAND = 0.12;
/** Even at full confidence, never move more than this many kcal from the scan. */
const MAX_SCAN_ADJUSTMENT = 200;

export interface TdeeEstimate {
  /** Blended best estimate of the BASE daily burn (no exercise included). */
  tdee: number;
  /** Energy-balance measurement minus tracked exercise (null when data is thin). */
  measuredTdee: number | null;
  /** Formula/scan fallback used as the anchor (latest scan BMR or Katch-McArdle). */
  fallbackTdee: number;
  /** Basal metabolic rate used by the fallback (same as fallbackTdee). */
  bmr: number;
  /** Latest InBody/DEXA BMR when one exists; null if only the formula is available. */
  scanBmr: number | null;
  /** Average tracked exercise cal/day inside the measurement window. */
  avgActivity: number;
  /** 0..1 — how much the estimate leans on measured data. */
  confidence: number;
  /** Days spanned by the measurement window actually used. */
  windowDays: number;
  /** Days with any food logged (including incomplete / outliers). */
  intakeDays: number;
  /** Days that survived completeness + outlier filters for avgIntake. */
  usableIntakeDays: number;
  /** Food days dropped as likely incomplete / still in progress. */
  incompleteIntakeDays: number;
  /** Food days dropped as high/low outliers vs the usable median. */
  outlierIntakeDays: number;
  weighInDays: number;
  /** Robust average intake (kcal) over usable days when possible. */
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

export function fallbackTdee(state: HealthState): {
  tdee: number;
  bmr: number;
  scanBmr: number | null;
} {
  // The base burn IS the BMR: tracked classes/workouts are added on top per
  // day, so no activity multiplier here (that would double-count exercise).
  const scanBmr = latestMeasuredBmr(state);
  const bmr = scanBmr ?? katchMcArdleBmr(latestLeanMassLb(state));
  return { tdee: bmr, bmr, scanBmr };
}

function clampToScanAnchor(raw: number, anchor: number): number {
  const lo = Math.round(anchor * (1 - SCAN_ANCHOR_BAND));
  const hi = Math.round(anchor * (1 + SCAN_ANCHOR_BAND));
  return Math.round(
    Math.min(
      MAX_PLAUSIBLE_TDEE,
      Math.max(MIN_PLAUSIBLE_TDEE, Math.min(hi, Math.max(lo, raw)))
    )
  );
}

function blendWithScanAnchor(
  measured: number,
  anchor: number,
  confidence: number
): number {
  const blended = confidence * measured + (1 - confidence) * anchor;
  return Math.round(
    Math.min(anchor + MAX_SCAN_ADJUSTMENT, Math.max(anchor - MAX_SCAN_ADJUSTMENT, blended))
  );
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
    scanBmr: fallback.scanBmr,
    avgActivity: 0,
    confidence: 0,
    windowDays: 0,
    intakeDays: 0,
    usableIntakeDays: 0,
    incompleteIntakeDays: 0,
    outlierIntakeDays: 0,
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
  const windowLogs = [];
  let activityTotal = 0;
  for (const day of Object.values(state.days)) {
    const time = dateToTime(day.date);
    if (time < dateToTime(first.date) || time > dateToTime(last.date)) continue;
    activityTotal += day.estimatedActivityCalories || 0;
    windowLogs.push(day);
  }
  const avgActivity = Math.round(activityTotal / (span + 1));

  // Soft floor uses the static plan calorie target so classification doesn't
  // depend on the adaptive estimate we're about to compute.
  const restDayFloor = BODYFI_PLAN.targets.calories;
  const intake = robustAverageIntake(windowLogs, restDayFloor, endDate);

  if (intake.rawIntakeDays < 7 || intake.avgIntake == null) {
    return {
      ...base,
      windowDays: span,
      intakeDays: intake.rawIntakeDays,
      usableIntakeDays: intake.usableDays,
      incompleteIntakeDays: intake.incompleteDays,
      outlierIntakeDays: intake.outlierDays,
      avgActivity,
      trendChangeLbs: Number((last.trend - first.trend).toFixed(2)),
    };
  }

  const avgIntake = intake.avgIntake;
  const trendChange = last.trend - first.trend;
  const rawMeasured = avgIntake - (trendChange * KCAL_PER_LB) / span - avgActivity;
  // Keep the energy-balance read tethered to the InBody / formula BMR so
  // incomplete food logs cannot invent a wildly different base burn.
  const measuredTdee = clampToScanAnchor(rawMeasured, fallback.tdee);

  // Confidence prefers usable coverage; incomplete/outlier days still count
  // toward "something was logged" but don't inflate the measured burn.
  const usableCoverage = Math.min(1, intake.usableDays / (span + 1));
  const rawCoverage = Math.min(1, intake.rawIntakeDays / (span + 1));
  const intakeCoverage = 0.7 * usableCoverage + 0.3 * rawCoverage;
  const weighCoverage = Math.min(1, windowPoints.length / (span + 1));
  const spanFactor = Math.min(1, span / 21);
  let confidence = Number(
    (spanFactor * (0.35 + 0.45 * intakeCoverage + 0.2 * weighCoverage)).toFixed(2)
  );
  // If we had to clamp hard, trust the measurement less.
  if (Math.abs(rawMeasured - measuredTdee) > 150) {
    confidence = Number((confidence * 0.65).toFixed(2));
  }

  const tdee = blendWithScanAnchor(measuredTdee, fallback.tdee, confidence);

  return {
    tdee,
    measuredTdee,
    fallbackTdee: fallback.tdee,
    bmr: fallback.bmr,
    scanBmr: fallback.scanBmr,
    avgActivity,
    confidence,
    windowDays: span,
    intakeDays: intake.rawIntakeDays,
    usableIntakeDays: intake.usableDays,
    incompleteIntakeDays: intake.incompleteDays,
    outlierIntakeDays: intake.outlierDays,
    weighInDays: windowPoints.length,
    avgIntake: Math.round(avgIntake),
    trendChangeLbs: Number(trendChange.toFixed(2)),
  };
}
