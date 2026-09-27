import { BODYFI_PLAN } from "../config";
import type { BodyScan, HealthState, WeeklyCheckIn } from "../types";
import { addDays, daysBetween } from "./trend";

/**
 * Shirt-fit progress: bigger chest/back/arms, smaller stomach.
 * Scale weight is ignored as a success metric. We steer by waist, body fat,
 * and lean / skeletal muscle from InBody + weekly waist check-ins.
 */

const CUT_ANCHOR = BODYFI_PLAN.anchors.find(
  (anchor) => anchor.week > 0 && anchor.phase === "Cut"
);
const GOAL_BODY_FAT = CUT_ANCHOR?.bodyFat ?? 15;
const GOAL_WAIST = CUT_ANCHOR?.waist ?? 35.5;
const LOOK_GOAL =
  "Bigger chest, back, and arms — smaller stomach. Shirts should fit up top and hang clean through the middle.";

/** Sanity clamp on body-fat change rate, percentage points / week. */
const MIN_BF_RATE = -1.5;
const MAX_BF_RATE = 0.5;
/** Sanity clamp on waist change rate, inches / week. */
const MIN_WAIST_RATE = -0.75;
const MAX_WAIST_RATE = 0.25;

export interface CompositionScanPoint {
  date: string;
  weight: number | null;
  bodyFat: number;
  leanMass: number | null;
  fatMass: number | null;
  skeletalMuscle: number | null;
  visceralFat: number | null;
  waist: number | null;
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
  waistIn: number | null;
}

export interface CompositionProgress {
  /** Plain-language physique goal — not a scale number. */
  lookGoal: string;
  goalBodyFat: number;
  goalWaist: number;
  /** Kept for digest compatibility; not a success metric. */
  guideWeight: number;
  first: CompositionScanPoint;
  latest: CompositionScanPoint;
  delta: CompositionDelta;
  /** Best available waist (scan or weekly check-in). */
  latestWaist: number | null;
  firstWaist: number | null;
  /** Observed body-fat change rate from first→latest scan, pp/week. */
  observedBodyFatRatePerWeek: number | null;
  /** Observed waist change rate from first→latest waist mark, in/week. */
  observedWaistRatePerWeek: number | null;
  etaWeeks: number | null;
  etaDate: string | null;
  /** Which signal drove the ETA. */
  etaBasis: "bodyFat" | "waist" | "both" | null;
  /** Lean or skeletal muscle up — proxy for chest/back/arms. */
  upperBodyUp: boolean;
  /** Waist or fat mass / BF down — proxy for smaller stomach. */
  midsectionDown: boolean;
  /** True when the shirt-fit shape is moving the right way. */
  shirtFitImproving: boolean;
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
    waist: typeof scan.waist === "number" && scan.waist > 0 ? scan.waist : null,
    bmr: typeof scan.bmr === "number" ? scan.bmr : null,
  };
}

function waistMarks(state: HealthState): { date: string; waist: number }[] {
  const fromScans = state.bodyScans
    .filter((scan) => typeof scan.waist === "number" && (scan.waist as number) > 0)
    .map((scan) => ({ date: scan.date, waist: scan.waist as number }));
  const fromCheckIns = state.weeklyCheckIns
    .filter(
      (entry: WeeklyCheckIn) =>
        typeof entry.waist === "number" && (entry.waist as number) > 0
    )
    .map((entry) => ({ date: entry.date, waist: entry.waist as number }));
  return [...fromScans, ...fromCheckIns].sort((a, b) => a.date.localeCompare(b.date));
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

export function goalWaistFromPlan(): number {
  return GOAL_WAIST;
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

  const waists = waistMarks(state);
  const firstWaistMark = waists[0] ?? null;
  const latestWaistMark = waists.length ? waists[waists.length - 1] : null;
  const firstWaist = first.waist ?? firstWaistMark?.waist ?? null;
  const latestWaist = latest.waist ?? latestWaistMark?.waist ?? null;
  const waistWeeks =
    firstWaistMark && latestWaistMark && firstWaistMark.date !== latestWaistMark.date
      ? Number(
          (daysBetween(firstWaistMark.date, latestWaistMark.date) / 7).toFixed(1)
        )
      : weeks;

  const delta: CompositionDelta = {
    weeks,
    weightLb: signedDelta(latest.weight, first.weight),
    bodyFatPp: signedDelta(latest.bodyFat, first.bodyFat),
    leanMassLb: signedDelta(latest.leanMass, first.leanMass),
    fatMassLb: signedDelta(latest.fatMass, first.fatMass),
    skeletalMuscleLb: signedDelta(latest.skeletalMuscle, first.skeletalMuscle),
    visceralFat: signedDelta(latest.visceralFat, first.visceralFat),
    waistIn: signedDelta(latestWaist, firstWaist),
  };

  let observedBodyFatRatePerWeek: number | null = null;
  if (weeks >= 2 && delta.bodyFatPp != null) {
    observedBodyFatRatePerWeek = Number(
      Math.min(MAX_BF_RATE, Math.max(MIN_BF_RATE, delta.bodyFatPp / weeks)).toFixed(3)
    );
  }

  let observedWaistRatePerWeek: number | null = null;
  if (waistWeeks >= 2 && delta.waistIn != null) {
    observedWaistRatePerWeek = Number(
      Math.min(
        MAX_WAIST_RATE,
        Math.max(MIN_WAIST_RATE, delta.waistIn / waistWeeks)
      ).toFixed(3)
    );
  }

  // ETA: take the nearer of body-fat and waist pace when both are falling.
  let etaWeeks: number | null = null;
  let etaDate: string | null = null;
  let etaBasis: CompositionProgress["etaBasis"] = null;
  const bfRemaining = latest.bodyFat - GOAL_BODY_FAT;
  const waistRemaining =
    latestWaist != null ? latestWaist - GOAL_WAIST : null;

  const bfEta =
    bfRemaining <= 0
      ? 0
      : observedBodyFatRatePerWeek != null && observedBodyFatRatePerWeek < -0.02
        ? bfRemaining / -observedBodyFatRatePerWeek
        : null;
  const waistEta =
    waistRemaining == null
      ? null
      : waistRemaining <= 0
        ? 0
        : observedWaistRatePerWeek != null && observedWaistRatePerWeek < -0.02
          ? waistRemaining / -observedWaistRatePerWeek
          : null;

  if (bfEta === 0 && (waistEta == null || waistEta === 0)) {
    etaWeeks = 0;
    etaDate = today;
    etaBasis = waistEta === 0 ? "both" : "bodyFat";
  } else if (bfEta != null && waistEta != null) {
    etaWeeks = Number(Math.max(bfEta, waistEta).toFixed(1));
    etaDate = addDays(today, Math.round(etaWeeks * 7));
    etaBasis = "both";
  } else if (bfEta != null) {
    etaWeeks = Number(bfEta.toFixed(1));
    etaDate = addDays(today, Math.round(etaWeeks * 7));
    etaBasis = "bodyFat";
  } else if (waistEta != null) {
    etaWeeks = Number(waistEta.toFixed(1));
    etaDate = addDays(today, Math.round(etaWeeks * 7));
    etaBasis = "waist";
  }

  const weightStable =
    delta.weightLb == null || Math.abs(delta.weightLb) <= 2.5;
  const fatDown = (delta.bodyFatPp ?? 0) < -0.3 || (delta.fatMassLb ?? 0) < -0.5;
  const leanUp =
    (delta.leanMassLb ?? 0) > 0.3 || (delta.skeletalMuscleLb ?? 0) > 0.3;
  const waistDown = (delta.waistIn ?? 0) < -0.2;
  const upperBodyUp = leanUp;
  const midsectionDown = fatDown || waistDown;
  const isRecompPattern = weightStable && fatDown && leanUp;
  const shirtFitImproving = upperBodyUp || midsectionDown;

  const parts: string[] = [];
  if (delta.waistIn != null) {
    parts.push(
      `${formatSigned(delta.waistIn, '" waist')} (${firstWaist}" → ${latestWaist}")`
    );
  }
  if (delta.bodyFatPp != null) {
    parts.push(
      `${formatSigned(delta.bodyFatPp, " pp body fat")} (${first.bodyFat}% → ${latest.bodyFat}%)`
    );
  }
  if (delta.skeletalMuscleLb != null) {
    parts.push(`${formatSigned(delta.skeletalMuscleLb, " lb skeletal muscle")}`);
  } else if (delta.leanMassLb != null) {
    parts.push(`${formatSigned(delta.leanMassLb, " lb lean")}`);
  }
  if (delta.fatMassLb != null) {
    parts.push(`${formatSigned(delta.fatMassLb, " lb fat mass")}`);
  }

  const spanLabel =
    weeks > 0 ? `Across ${weeks} weeks of scans` : "From your latest scan";
  let summary = `${spanLabel}: ${parts.join(", ") || "keep logging waist and InBody"}.`;
  if (shirtFitImproving) {
    const shapeBits: string[] = [];
    if (upperBodyUp) shapeBits.push("upper body (lean/muscle) up");
    if (midsectionDown) shapeBits.push("midsection (waist/fat) down");
    summary += ` Shirt-fit shape is improving — ${shapeBits.join(" and ")}.`;
  }
  if (isRecompPattern) {
    summary +=
      " Scale weight barely moved while the shape changed — ignore the scale for success.";
  }
  if (etaWeeks != null && etaWeeks > 0 && etaDate) {
    summary += ` At this pace, the look goal (~${GOAL_BODY_FAT}% BF`;
    if (etaBasis === "waist" || etaBasis === "both") {
      summary += ` / ${GOAL_WAIST}" waist`;
    }
    summary += `) lands around ${etaDate} (~${Math.round(etaWeeks)} weeks).`;
  } else if (etaWeeks === 0) {
    summary += ` You're at the shirt-fit targets (${GOAL_BODY_FAT}% BF / ${GOAL_WAIST}" waist).`;
  } else {
    summary += ` Goal is the shirt fit — ${LOOK_GOAL}`;
  }

  return {
    lookGoal: LOOK_GOAL,
    goalBodyFat: GOAL_BODY_FAT,
    goalWaist: GOAL_WAIST,
    guideWeight: CUT_ANCHOR?.weight ?? 170,
    first,
    latest,
    delta,
    latestWaist,
    firstWaist,
    observedBodyFatRatePerWeek,
    observedWaistRatePerWeek,
    etaWeeks,
    etaDate,
    etaBasis,
    upperBodyUp,
    midsectionDown,
    shirtFitImproving,
    isRecompPattern,
    summary,
  };
}
