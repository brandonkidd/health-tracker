import type { HealthState } from "../types";
import type { EngineSnapshot } from "./index";
import {
  classifyIntakeDays,
  dayCalorieBudget,
  type IntakeQuality,
  vsCalorieBudget,
} from "./intake-quality";
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
  /** Tracked workout / class / walk burn for this day (kcal). */
  activityCalories: number;
  /** Rest-day target + activityCalories — the net budget for the day. */
  calorieBudget: number;
  /**
   * calories − calorieBudget. Negative = under budget (room left / on track
   * for the planned deficit once exercise is counted). Positive = over net budget.
   */
  vsBudget: number;
  /** Base burn + activity − food (positive = deficit). */
  netBalance: number;
  protein: number;
  waterOz: number;
  steps: number;
  sleepHours: number | null;
  weight: number | null;
  energy: number | null;
  soreness: number | null;
  trained: boolean;
  workouts: string[];
  mealCount: number;
  alcohol: boolean;
  /** Logging-quality label for this day's food log. */
  intakeQuality: IntakeQuality;
  intakeQualityReason: string | null;
}

export interface InsightDigest {
  date: string;
  days: DigestDay[];
  logging: {
    usableIntakeDays: number;
    incompleteIntakeDays: number;
    outlierIntakeDays: number;
    note: string;
  };
  engine: {
    tdee: EngineSnapshot["tdee"];
    targets: EngineSnapshot["targets"];
    forecast: {
      startTrendWeight: number;
      observedRatePerWeek: number | null;
      impliedRatePerWeek: number | null;
      projectedRatePerWeek: number;
      goalWeight: number;
      etaWeeks: number | null;
      etaDate: string | null;
      deltaVsPlan: number;
      planWeightToday: number;
    } | null;
    /** Primary goal: shirt fit — bigger up top, smaller midsection. */
    composition: {
      lookGoal: string;
      goalBodyFat: number;
      goalWaist: number;
      guideWeight: number;
      latestBodyFat: number;
      firstBodyFat: number;
      latestWaist: number | null;
      firstWaist: number | null;
      deltaBodyFatPp: number | null;
      deltaWaistIn: number | null;
      deltaLeanMassLb: number | null;
      deltaSkeletalMuscleLb: number | null;
      deltaFatMassLb: number | null;
      deltaWeightLb: number | null;
      observedBodyFatRatePerWeek: number | null;
      observedWaistRatePerWeek: number | null;
      etaWeeks: number | null;
      etaDate: string | null;
      etaBasis: "bodyFat" | "waist" | "both" | null;
      upperBodyUp: boolean;
      midsectionDown: boolean;
      shirtFitImproving: boolean;
      isRecompPattern: boolean;
      summary: string;
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
  const windowDays = Object.values(state.days)
    .filter((day) => {
      const time = dateToTime(day.date);
      return time <= end && time > end - DIGEST_DAYS * DAY_MS;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const restTarget = snapshot.targets.calories;
  const classifications = classifyIntakeDays(windowDays, restTarget, today);
  const baseBurn = snapshot.tdee.tdee;

  const days: DigestDay[] = windowDays.map((day) => {
    const activityCalories = day.estimatedActivityCalories || 0;
    const calorieBudget = dayCalorieBudget(restTarget, activityCalories);
    const assessment = classifications.get(day.date) ?? {
      quality: "empty" as const,
      usableForAverage: false,
      reason: null,
    };
    return {
      date: day.date,
      calories: day.calories,
      activityCalories,
      calorieBudget,
      vsBudget: vsCalorieBudget(day.calories, restTarget, activityCalories),
      netBalance: baseBurn + activityCalories - day.calories,
      protein: day.protein,
      waterOz: day.waterOz,
      steps: day.steps,
      sleepHours: day.sleepHours ?? null,
      weight: day.weight ?? null,
      energy: day.energy ?? null,
      soreness: day.soreness ?? null,
      trained: day.activityCompleted || (day.workouts?.length ?? 0) > 0,
      workouts: (day.workouts ?? []).map((workout) => workout.activity),
      mealCount: day.meals.length,
      alcohol: day.meals.some((meal) => ALCOHOL_PATTERN.test(meal.label)),
      intakeQuality: assessment.quality,
      intakeQualityReason: assessment.reason,
    };
  });

  const incompleteIntakeDays = days.filter(
    (day) =>
      day.intakeQuality === "likelyIncomplete" || day.intakeQuality === "inProgress"
  ).length;
  const outlierIntakeDays = days.filter(
    (day) =>
      day.intakeQuality === "outlierHigh" || day.intakeQuality === "outlierLow"
  ).length;
  const usableIntakeDays = days.filter(
    (day) => day.intakeQuality === "usable"
  ).length;

  const loggingNoteParts: string[] = [];
  if (incompleteIntakeDays > 0) {
    loggingNoteParts.push(
      `${incompleteIntakeDays} day(s) look partially logged — do not treat those low totals as intentional deficits`
    );
  }
  if (outlierIntakeDays > 0) {
    loggingNoteParts.push(
      `${outlierIntakeDays} day(s) flagged as calorie outliers vs the recent median`
    );
  }
  if (loggingNoteParts.length === 0) {
    loggingNoteParts.push(
      "Food logging looks consistent enough for energy-balance reads"
    );
  }

  const forecast = snapshot.forecast
    ? {
        startTrendWeight: snapshot.forecast.startTrendWeight,
        observedRatePerWeek: snapshot.forecast.observedRatePerWeek,
        impliedRatePerWeek: snapshot.forecast.impliedRatePerWeek,
        projectedRatePerWeek: snapshot.forecast.projectedRatePerWeek,
        goalWeight: snapshot.forecast.goalWeight,
        etaWeeks: snapshot.forecast.etaWeeks,
        etaDate: snapshot.forecast.etaDate,
        deltaVsPlan: snapshot.forecast.deltaVsPlan,
        planWeightToday: snapshot.forecast.planWeightToday,
      }
    : null;

  const composition = snapshot.composition
    ? {
        lookGoal: snapshot.composition.lookGoal,
        goalBodyFat: snapshot.composition.goalBodyFat,
        goalWaist: snapshot.composition.goalWaist,
        guideWeight: snapshot.composition.guideWeight,
        latestBodyFat: snapshot.composition.latest.bodyFat,
        firstBodyFat: snapshot.composition.first.bodyFat,
        latestWaist: snapshot.composition.latestWaist,
        firstWaist: snapshot.composition.firstWaist,
        deltaBodyFatPp: snapshot.composition.delta.bodyFatPp,
        deltaWaistIn: snapshot.composition.delta.waistIn,
        deltaLeanMassLb: snapshot.composition.delta.leanMassLb,
        deltaSkeletalMuscleLb: snapshot.composition.delta.skeletalMuscleLb,
        deltaFatMassLb: snapshot.composition.delta.fatMassLb,
        deltaWeightLb: snapshot.composition.delta.weightLb,
        observedBodyFatRatePerWeek: snapshot.composition.observedBodyFatRatePerWeek,
        observedWaistRatePerWeek: snapshot.composition.observedWaistRatePerWeek,
        etaWeeks: snapshot.composition.etaWeeks,
        etaDate: snapshot.composition.etaDate,
        etaBasis: snapshot.composition.etaBasis,
        upperBodyUp: snapshot.composition.upperBodyUp,
        midsectionDown: snapshot.composition.midsectionDown,
        shirtFitImproving: snapshot.composition.shirtFitImproving,
        isRecompPattern: snapshot.composition.isRecompPattern,
        summary: snapshot.composition.summary,
      }
    : null;

  return {
    date: today,
    days,
    logging: {
      usableIntakeDays,
      incompleteIntakeDays,
      outlierIntakeDays,
      note: loggingNoteParts.join(". ") + ".",
    },
    engine: {
      tdee: snapshot.tdee,
      targets: snapshot.targets,
      forecast,
      composition,
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
