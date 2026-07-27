import type { DailyLog, HealthState } from "../types";
import { addDays } from "./trend";

/**
 * Deterministic pattern detection: Pearson correlations across the logged
 * data streams, gated by minimum sample sizes so early noise never turns
 * into a false "finding".
 */

const MIN_SAMPLES = 8;
const MIN_ABS_R = 0.25;

export interface CorrelationFinding {
  id: string;
  title: string;
  /** Plain-language interpretation, ready for UI display. */
  description: string;
  r: number;
  n: number;
  strength: "weak" | "moderate" | "strong";
}

export interface CorrelationReport {
  findings: CorrelationFinding[];
  /** Pairs examined, including those without enough data yet. */
  checked: number;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

function strengthOf(r: number): CorrelationFinding["strength"] {
  const abs = Math.abs(r);
  if (abs >= 0.6) return "strong";
  if (abs >= 0.4) return "moderate";
  return "weak";
}

const ALCOHOL_PATTERN =
  /\b(wine|beer|ipa|lager|cocktail|whiskey|bourbon|vodka|tequila|margarita|seltzer|sake|champagne|mezcal|rum|gin|alcohol|drink)\b/i;

export function isAlcoholDay(day: DailyLog): boolean {
  return day.meals.some((meal) => ALCOHOL_PATTERN.test(meal.label));
}

function hasIntake(day: DailyLog): boolean {
  return day.calories > 0 || day.meals.length > 0;
}

function trainedOn(day: DailyLog): boolean {
  return day.activityCompleted || (day.workouts?.length ?? 0) > 0;
}

interface PairSpec {
  id: string;
  title: string;
  collect: (days: Record<string, DailyLog>) => { xs: number[]; ys: number[] };
  describe: (r: number, n: number) => string;
}

const PAIRS: PairSpec[] = [
  {
    id: "sleep-next-day-intake",
    title: "Sleep vs next-day eating",
    collect: (days) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const day of Object.values(days)) {
        if (typeof day.sleepHours !== "number") continue;
        const next = days[addDays(day.date, 1)];
        if (!next || !hasIntake(next)) continue;
        xs.push(day.sleepHours);
        ys.push(next.calories);
      }
      return { xs, ys };
    },
    describe: (r) =>
      r < 0
        ? "Shorter sleep is followed by higher-calorie days. Protecting sleep is protecting your deficit."
        : "More sleep is followed by higher-calorie days — worth watching, this is unusual.",
  },
  {
    id: "sleep-energy",
    title: "Sleep vs energy",
    collect: (days) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const day of Object.values(days)) {
        if (typeof day.sleepHours !== "number" || typeof day.energy !== "number")
          continue;
        xs.push(day.sleepHours);
        ys.push(day.energy);
      }
      return { xs, ys };
    },
    describe: (r) =>
      r > 0
        ? "Your energy score tracks your sleep hours almost directly."
        : "Your energy runs lower after longer sleep — check sleep quality, not just duration.",
  },
  {
    id: "steps-intake",
    title: "Steps vs appetite",
    collect: (days) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const day of Object.values(days)) {
        if (day.steps <= 0 || !hasIntake(day)) continue;
        xs.push(day.steps);
        ys.push(day.calories);
      }
      return { xs, ys };
    },
    describe: (r) =>
      r > 0
        ? "Higher-step days come with more eating — movement is partially feeding appetite."
        : "Higher-step days come with less eating — activity is suppressing appetite for you.",
  },
  {
    id: "alcohol-weight",
    title: "Alcohol vs scale weight",
    collect: (days) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const day of Object.values(days)) {
        if (typeof day.weight !== "number") continue;
        const next = days[addDays(day.date, 1)];
        const nextWeight =
          next && typeof next.weight === "number" ? next.weight : undefined;
        if (nextWeight == null) continue;
        xs.push(isAlcoholDay(day) ? 1 : 0);
        ys.push(nextWeight - day.weight);
      }
      // Point-biserial needs both groups represented.
      if (!xs.includes(1) || !xs.includes(0)) return { xs: [], ys: [] };
      return { xs, ys };
    },
    describe: (r) =>
      r > 0
        ? "Drinking days reliably show up as next-morning scale spikes (mostly water, but they mask real progress)."
        : "Alcohol days aren't showing a next-day scale penalty so far.",
  },
  {
    id: "training-next-day-energy",
    title: "Training vs next-day energy",
    collect: (days) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const day of Object.values(days)) {
        const next = days[addDays(day.date, 1)];
        if (!next || typeof next.energy !== "number") continue;
        xs.push(trainedOn(day) ? 1 : 0);
        ys.push(next.energy);
      }
      if (!xs.includes(1) || !xs.includes(0)) return { xs: [], ys: [] };
      return { xs, ys };
    },
    describe: (r) =>
      r > 0
        ? "You consistently report more energy the day after training."
        : "Energy dips the day after training — recovery (sleep, food, soreness) may be lagging.",
  },
];

export function buildCorrelationReport(state: HealthState): CorrelationReport {
  const findings: CorrelationFinding[] = [];
  for (const pair of PAIRS) {
    const { xs, ys } = pair.collect(state.days);
    if (xs.length < MIN_SAMPLES) continue;
    const r = pearson(xs, ys);
    if (r == null || Math.abs(r) < MIN_ABS_R) continue;
    findings.push({
      id: pair.id,
      title: pair.title,
      description: pair.describe(r, xs.length),
      r: Number(r.toFixed(2)),
      n: xs.length,
      strength: strengthOf(r),
    });
  }
  findings.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return { findings, checked: PAIRS.length };
}
