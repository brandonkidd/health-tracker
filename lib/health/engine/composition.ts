import { BODYFI_PLAN } from "../config";
import type { BodyScan, HealthState } from "../types";
import { addDays, daysBetween } from "./trend";

/**
 * Composition-first progress: the cut's real finish line is body-fat %
 * (athletic look), not a fixed scale weight. Weight can hold while fat
 * drops and lean rises — that still counts as progress.
 */

const GOAL_BODY_FAT = BODYFI_PLAN.anchors.find(
  (anchor) => anchor.week > 0 && anchor.phase === "Cut"
)?.bodyFat ?? 15;

/** Sanity clamp on body-fat change rate, percentage points / week. */
const MIN_BF_RATE = -1.5;
const MAX_BF_RATE = 0.5;

export interface CompositionScanPoint {
  date: string;
  weight: number | null;
  bodyFat: number;
  leanMass: number | null;
  fatMass: number | null;
  skeletalMuscle: number | null;
  visceralFat: number | null;
  bmr: number | null;
}

export interface CompositionDelta {
  weeks: number;
  weightLb: number | null;
  bodyFatPp: number | null;
  leanMassLb: number | null;
  fatMassLb: number | null;
  skeletalMuscleLb: number | null;
  visceralFat: number | null;
}

export interface CompositionProgress {
  goalBodyFat: number;
  /** Optional scale guide from the plan — secondary to body fat. */
  guideWeight: number;
  first: CompositionScanPoint;
  latest: CompositionScanPoint;
  delta: CompositionDelta;
  /** Observed body-fat change rate from first→latest scan, pp/week. */
  observedBodyFatRatePerWeek: number | null;
  etaWeeks: number | null;
  etaDate: string | null;
  /** True when weight barely moved but fat↓ / lean↑ — classic recomp. */
  isRecompPattern: boolean;
  summary: string;
}

function fatMassFrom(scan: Pick<BodyScan, "weight" | "bodyFat">): number | null {
  if (
    typeof scan.weight === "number" &&
    scan.weight > 0 &&
    typeof scan.bodyFat === "number" &&
    scan.bodyFat > 0 &&
    scan.bodyFat < 100
  ) {
    return Number(((scan.weight * scan.bodyFat) / 100).toFixed(1));
  }
  return null;
}

function leanMassFrom(scan: BodyScan): number | null {
  if (typeof scan.leanMass === "number" && scan.leanMass > 0) return scan.leanMass;
  if (
    typeof scan.weight === "number" &&
    scan.weight > 0 &&
    typeof scan.bodyFat === "number" &&
    scan.bodyFat > 0 &&
    scan.bodyFat < 100
  ) {
    return Number((scan.weight * (1 - scan.bodyFat / 100)).toFixed(1));
  }
  return null;
}

function toPoint(scan: BodyScan): CompositionScanPoint | null {
  if (typeof scan.bodyFat !== "number" || scan.bodyFat <= 0 || scan.bodyFat >= 100) {
    return null;
  }
  return {
    date: scan.date,
    weight: typeof scan.weight === "number" ? scan.weight : null,
    bodyFat: scan.bodyFat,
    leanMass: leanMassFrom(scan),
    fatMass: fatMassFrom(scan),
    skeletalMuscle:
      typeof scan.skeletalMuscle === "number"
        ? scan.skeletalMuscle
        : typeof scan.muscleMass === "number"
          ? scan.muscleMass
          : null,
    visceralFat: typeof scan.visceralFat === "number" ? scan.visceralFat : null,
    bmr: typeof scan.bmr === "number" ? scan.bmr : null,
  };
}

function signedDelta(latest: number | null, first: number | null): number | null {
  if (latest == null || first == null) return null;
  return Number((latest - first).toFixed(1));
}

function formatSigned(value: number | null, unit: string): string | null {
  if (value == null) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${unit}`;
}

export function goalBodyFatFromPlan(): number {
  return GOAL_BODY_FAT;
}

export function buildCompositionProgress(
  state: HealthState,
  today: string
): CompositionProgress | null {
  const points = [...state.bodyScans]
    .map(toPoint)
    .filter((point): point is CompositionScanPoint => point != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) return null;

  const first = points[0];
  const latest = points[points.length - 1];
  const weeks =
    first.date === latest.date
      ? 0
      : Number((daysBetween(first.date, latest.date) / 7).toFixed(1));

  const delta: CompositionDelta = {
    weeks,
    weightLb: signedDelta(latest.weight, first.weight),
    bodyFatPp: signedDelta(latest.bodyFat, first.bodyFat),
    leanMassLb: signedDelta(latest.leanMass, first.leanMass),
    fatMassLb: signedDelta(latest.fatMass, first.fatMass),
    skeletalMuscleLb: signedDelta(latest.skeletalMuscle, first.skeletalMuscle),
    visceralFat: signedDelta(latest.visceralFat, first.visceralFat),
  };

  let observedBodyFatRatePerWeek: number | null = null;
  if (weeks >= 2 && delta.bodyFatPp != null) {
    observedBodyFatRatePerWeek = Number(
      Math.min(MAX_BF_RATE, Math.max(MIN_BF_RATE, delta.bodyFatPp / weeks)).toFixed(3)
    );
  }

  let etaWeeks: number | null = null;
  let etaDate: string | null = null;
  const remaining = latest.bodyFat - GOAL_BODY_FAT;
  if (remaining <= 0) {
    etaWeeks = 0;
    etaDate = today;
  } else if (observedBodyFatRatePerWeek != null && observedBodyFatRatePerWeek < -0.02) {
    etaWeeks = Number((remaining / -observedBodyFatRatePerWeek).toFixed(1));
    etaDate = addDays(today, Math.round(etaWeeks * 7));
  }

  const weightStable =
    delta.weightLb == null || Math.abs(delta.weightLb) <= 2.5;
  const fatDown = (delta.bodyFatPp ?? 0) < -0.3 || (delta.fatMassLb ?? 0) < -0.5;
  const leanUp = (delta.leanMassLb ?? 0) > 0.3;
  const isRecompPattern = weightStable && fatDown && leanUp;

  const parts: string[] = [];
  if (delta.bodyFatPp != null) {
    parts.push(
      `${formatSigned(delta.bodyFatPp, " pp body fat")} (${first.bodyFat}% → ${latest.bodyFat}%)`
    );
  }
  if (delta.leanMassLb != null) {
    parts.push(`${formatSigned(delta.leanMassLb, " lb lean")}`);
  }
  if (delta.fatMassLb != null) {
    parts.push(`${formatSigned(delta.fatMassLb, " lb fat mass")}`);
  }
  if (delta.weightLb != null) {
    parts.push(`${formatSigned(delta.weightLb, " lb scale weight")}`);
  }
  const spanLabel =
    weeks > 0 ? `Across ${weeks} weeks of scans` : "From your latest scan";
  let summary = `${spanLabel}: ${parts.join(", ")}.`;
  if (isRecompPattern) {
    summary +=
      " Scale weight barely moved while fat dropped and lean rose — that's recomposition, not a stall.";
  }
  if (etaWeeks != null && etaWeeks > 0 && etaDate) {
    summary += ` At this body-fat pace, ${GOAL_BODY_FAT}% lands around ${etaDate} (~${Math.round(etaWeeks)} weeks).`;
  } else if (etaWeeks === 0) {
    summary += ` You're at or under the ${GOAL_BODY_FAT}% body-fat goal.`;
  } else if (remaining > 0) {
    summary += ` Primary goal remains ${GOAL_BODY_FAT}% body fat (${remaining.toFixed(1)} pp to go) — not a fixed scale weight.`;
  }

  const cutAnchor = BODYFI_PLAN.anchors.find(
    (anchor) => anchor.week > 0 && anchor.phase === "Cut"
  );

  return {
    goalBodyFat: GOAL_BODY_FAT,
    guideWeight: cutAnchor?.weight ?? 170,
    first,
    latest,
    delta,
    observedBodyFatRatePerWeek,
    etaWeeks,
    etaDate,
    isRecompPattern,
    summary,
  };
}
