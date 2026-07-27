import { BODYFI_PLAN } from "../config";
import { planWeek } from "../projections";
import type { TdeeEstimate } from "./tdee";

/**
 * Dynamic daily targets: instead of the static plan numbers, calories are
 * re-derived every day from the adaptive TDEE and the loss/gain rate the
 * plan phase calls for. Protein stays anchored; carbs and fat rebalance.
 */

const KCAL_PER_LB = 3500;
/** Never recommend more aggressively than these. */
const MAX_DAILY_DEFICIT = 1000;
const MIN_CALORIES = 1600;

export interface TargetRecommendation {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterOz: number;
  sleepHours: number;
  steps: number;
  /** Target rate for the current phase, lbs/week (negative = loss). */
  weeklyRateLbs: number;
  phase: string;
  /** The original static plan calories, for comparison in the UI. */
  planCalories: number;
  /** calories − planCalories: how far the adaptive target moved. */
  deltaFromPlan: number;
}

/** Plan-implied rate of change for the anchor segment containing `date`. */
export function planRateForDate(date: string): { rate: number; phase: string } {
  const week = planWeek(date);
  const anchors = BODYFI_PLAN.anchors;
  for (let i = 1; i < anchors.length; i++) {
    if (week < anchors[i].week) {
      const previous = anchors[i - 1];
      const next = anchors[i];
      return {
        rate: (next.weight - previous.weight) / (next.week - previous.week),
        phase: previous.phase,
      };
    }
  }
  const last = anchors[anchors.length - 1];
  return { rate: 0, phase: last.phase };
}

export function recommendTargets(
  tdee: TdeeEstimate,
  date: string
): TargetRecommendation {
  const { rate, phase } = planRateForDate(date);
  const staticTargets = BODYFI_PLAN.targets;

  const raw = tdee.tdee + (rate * KCAL_PER_LB) / 7;
  const floored = Math.max(raw, tdee.tdee - MAX_DAILY_DEFICIT, MIN_CALORIES);
  const calories = Math.round(floored / 25) * 25;

  const protein = staticTargets.protein;
  const fat = Math.min(90, Math.max(55, Math.round((calories * 0.3) / 9)));
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber: staticTargets.fiber,
    waterOz: staticTargets.waterOz,
    sleepHours: staticTargets.sleepHours,
    steps: staticTargets.steps,
    weeklyRateLbs: Number(rate.toFixed(2)),
    phase,
    planCalories: staticTargets.calories,
    deltaFromPlan: calories - staticTargets.calories,
  };
}
