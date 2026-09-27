import { describe, expect, it } from "vitest";
import { emptyDailyLog, emptyHealthState } from "../storage";
import type { HealthState } from "../types";
import {
  buildTrendSeries,
  latestTrendPoint,
  trendSlopePerWeek,
  addDays,
} from "./trend";
import { estimateTdee, katchMcArdleBmr } from "./tdee";
import { planRateForDate, recommendTargets } from "./targets";
import { buildForecast } from "./forecast";
import { buildCorrelationReport, isAlcoholDay, pearson } from "./correlations";
import { computeEngineSnapshot } from "./index";
import { buildInsightDigest, hashDigest } from "./digest";
import {
  assessIntakeCompleteness,
  dayCalorieBudget,
  robustAverageIntake,
  vsCalorieBudget,
} from "./intake-quality";

const START = "2026-07-24";

/** Build a state with `count` consecutive days starting at START. */
function stateWithDays(
  count: number,
  fill: (index: number, date: string) => Partial<ReturnType<typeof emptyDailyLog>>
): HealthState {
  const state = emptyHealthState();
  for (let i = 0; i < count; i++) {
    const date = addDays(START, i);
    state.days[date] = { ...emptyDailyLog(date), ...fill(i, date) };
  }
  return state;
}

describe("trend weight", () => {
  it("starts at the first weigh-in and smooths toward new data", () => {
    const state = stateWithDays(2, (i) => ({ weight: i === 0 ? 200 : 196 }));
    const series = buildTrendSeries(state.days);
    expect(series[0].trend).toBe(200);
    // alpha 0.25: 200 + 0.25 * (196 - 200) = 199
    expect(series[1].trend).toBeCloseTo(199, 5);
  });

  it("compounds alpha across weigh-in gaps", () => {
    const state = emptyHealthState();
    state.days[START] = { ...emptyDailyLog(START), weight: 200 };
    const later = addDays(START, 2);
    state.days[later] = { ...emptyDailyLog(later), weight: 196 };
    const series = buildTrendSeries(state.days);
    // effective alpha = 1 - 0.75^2 = 0.4375 → 200 + 0.4375 * (-4) = 198.25
    expect(series[1].trend).toBeCloseTo(198.25, 5);
  });

  it("recovers a steady loss rate from daily weigh-ins", () => {
    const state = stateWithDays(42, (i) => ({ weight: 200 - i / 7 }));
    const series = buildTrendSeries(state.days);
    const slope = trendSlopePerWeek(series, addDays(START, 41), 21);
    expect(slope).not.toBeNull();
    expect(slope as number).toBeGreaterThan(-1.15);
    expect(slope as number).toBeLessThan(-0.85);
  });
});

describe("adaptive TDEE", () => {
  it("matches the plan's InBody BMR via Katch-McArdle", () => {
    // 151.5 lb lean mass is the documented baseline → BMR ≈ 1854
    expect(katchMcArdleBmr(151.5)).toBeGreaterThan(1840);
    expect(katchMcArdleBmr(151.5)).toBeLessThan(1870);
  });

  it("falls back with zero confidence when nothing is logged", () => {
    const estimate = estimateTdee(emptyHealthState(), START);
    expect(estimate.confidence).toBe(0);
    expect(estimate.measuredTdee).toBeNull();
    expect(estimate.tdee).toBe(estimate.fallbackTdee);
  });

  it("measures the base burn from intake vs trend-weight change", () => {
    // Eat 2000/day while losing 1 lb/week with no tracked exercise
    // → true base burn = 2500. Seed a matching scan BMR so the InBody
    // anchor does not clamp the energy-balance read away from truth.
    const state = stateWithDays(28, (i) => ({
      weight: 200 - i / 7,
      calories: 2000,
    }));
    state.bodyScans.push({
      id: "scan-2500",
      date: START,
      bmr: 2500,
      notes: "",
    });
    const estimate = estimateTdee(state, addDays(START, 27));
    expect(estimate.measuredTdee).not.toBeNull();
    expect(estimate.scanBmr).toBe(2500);
    // Smoothing transient allows modest deviation from the ideal 2500.
    expect(estimate.measuredTdee as number).toBeGreaterThan(2380);
    expect(estimate.measuredTdee as number).toBeLessThan(2560);
    expect(estimate.confidence).toBeGreaterThan(0.9);
    expect(estimate.tdee).toBe(estimate.measuredTdee);
    expect(estimate.avgIntake).toBe(2000);
  });

  it("subtracts tracked exercise so the measured burn stays a base", () => {
    // Same energy balance, but 500 cal/day of logged classes: the total burn
    // is still 2500, so the base must come out ~2000.
    const state = stateWithDays(28, (i) => ({
      weight: 200 - i / 7,
      calories: 2000,
      estimatedActivityCalories: 500,
    }));
    state.bodyScans.push({
      id: "scan-2000",
      date: START,
      bmr: 2000,
      notes: "",
    });
    const estimate = estimateTdee(state, addDays(START, 27));
    expect(estimate.avgActivity).toBe(500);
    expect(estimate.measuredTdee as number).toBeGreaterThan(1880);
    expect(estimate.measuredTdee as number).toBeLessThan(2060);
  });

  it("keeps base burn near the InBody BMR when energy balance drifts high", () => {
    // Incomplete-looking math (eat 2000, lose 1 lb/wk, no exercise) would
    // imply ~2500 base — but the scan says 1856, so stay within ±200 of it.
    const state = stateWithDays(28, (i) => ({
      weight: 200 - i / 7,
      calories: 2000,
    }));
    state.bodyScans.push({
      id: "scan-inbody",
      date: START,
      bmr: 1856,
      leanMass: 151.5,
      notes: "",
    });
    const estimate = estimateTdee(state, addDays(START, 27));
    expect(estimate.scanBmr).toBe(1856);
    expect(estimate.tdee).toBeGreaterThanOrEqual(1856 - 200);
    expect(estimate.tdee).toBeLessThanOrEqual(1856 + 200);
    expect(estimate.measuredTdee as number).toBeLessThanOrEqual(
      Math.round(1856 * 1.12)
    );
  });

  it("uses the BMR itself as the fallback base (no activity multiplier)", () => {
    const estimate = estimateTdee(emptyHealthState(), START);
    expect(estimate.fallbackTdee).toBe(estimate.bmr);
    // Plan baseline lean mass → base ≈ 1850, matching the InBody BMR.
    expect(estimate.fallbackTdee).toBeGreaterThan(1840);
    expect(estimate.fallbackTdee).toBeLessThan(1870);
  });

  it("keeps confidence low with sparse logging", () => {
    // Weigh-ins only every 5 days, intake only 8 of 28 days.
    const state = stateWithDays(28, (i) => ({
      weight: i % 5 === 0 ? 200 - i / 7 : undefined,
      calories: i < 8 ? 2100 : 0,
    }));
    const estimate = estimateTdee(state, addDays(START, 27));
    expect(estimate.confidence).toBeLessThan(0.7);
  });
});

describe("dynamic targets", () => {
  it("derives the cut rate from the plan anchors", () => {
    // Weeks 0-20: (170 - 192.9) / 20 ≈ -1.145 lbs/week
    const { rate, phase } = planRateForDate("2026-08-07");
    expect(rate).toBeCloseTo(-1.145, 2);
    expect(phase).toBe("Cut");
  });

  it("adjusts calories from the adaptive TDEE, protein anchored", () => {
    const targets = recommendTargets(
      {
        tdee: 2600,
        measuredTdee: 2600,
        fallbackTdee: 2600,
        bmr: 1856,
        scanBmr: 1856,
        avgActivity: 0,
        confidence: 1,
        windowDays: 27,
        intakeDays: 28,
        usableIntakeDays: 28,
        incompleteIntakeDays: 0,
        outlierIntakeDays: 0,
        weighInDays: 28,
        avgIntake: 2100,
        trendChangeLbs: -4,
      },
      "2026-08-07"
    );
    // 2600 - 1.145 * 3500 / 7 ≈ 2027 → rounded to nearest 25
    expect(targets.calories).toBe(2025);
    expect(targets.protein).toBe(180);
    expect(targets.calories).toBeGreaterThanOrEqual(1600);
    // Macros re-add to roughly the calorie target (4/4/9).
    const macroKcal =
      targets.protein * 4 + targets.carbs * 4 + targets.fat * 9;
    expect(Math.abs(macroKcal - targets.calories)).toBeLessThan(15);
  });

  it("never recommends below the safety floor", () => {
    const targets = recommendTargets(
      {
        tdee: 1700,
        measuredTdee: 1700,
        fallbackTdee: 1700,
        bmr: 1500,
        scanBmr: null,
        avgActivity: 0,
        confidence: 1,
        windowDays: 27,
        intakeDays: 28,
        usableIntakeDays: 28,
        incompleteIntakeDays: 0,
        outlierIntakeDays: 0,
        weighInDays: 28,
        avgIntake: 1500,
        trendChangeLbs: -2,
      },
      "2026-08-07"
    );
    expect(targets.calories).toBeGreaterThanOrEqual(1600);
  });
});

describe("intake quality + net budget", () => {
  it("flags thin meal days as likely incomplete", () => {
    const day = {
      ...emptyDailyLog(START),
      calories: 450,
      meals: [
        {
          id: "1",
          label: "Eggs",
          calories: 450,
          protein: 30,
          carbs: 2,
          fat: 30,
          at: `${START}T08:00:00`,
        },
      ],
    };
    const assessment = assessIntakeCompleteness(day, 2100);
    expect(assessment.quality).toBe("likelyIncomplete");
    expect(assessment.usableForAverage).toBe(false);
  });

  it("marks today's partial log as inProgress, not a deficit", () => {
    const day = {
      ...emptyDailyLog(START),
      calories: 600,
      meals: [
        {
          id: "1",
          label: "Shake",
          calories: 600,
          protein: 40,
          carbs: 20,
          fat: 10,
          at: `${START}T09:00:00`,
        },
      ],
    };
    expect(assessIntakeCompleteness(day, 2100, { isToday: true }).quality).toBe(
      "inProgress"
    );
  });

  it("excludes incomplete and outlier days from the robust average", () => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const date = addDays(START, i);
      if (i === 3) {
        return {
          ...emptyDailyLog(date),
          calories: 400,
          meals: [
            {
              id: "m",
              label: "Coffee",
              calories: 400,
              protein: 5,
              carbs: 40,
              fat: 10,
              at: `${date}T08:00:00`,
            },
          ],
        };
      }
      if (i === 10) {
        return {
          ...emptyDailyLog(date),
          calories: 4200,
          meals: [
            {
              id: "m",
              label: "Feast",
              calories: 4200,
              protein: 180,
              carbs: 400,
              fat: 150,
              at: `${date}T20:00:00`,
            },
            {
              id: "m2",
              label: "More",
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              at: `${date}T21:00:00`,
            },
          ],
        };
      }
      return {
        ...emptyDailyLog(date),
        calories: 2000,
        meals: [
          {
            id: "a",
            label: "Meal A",
            calories: 1000,
            protein: 80,
            carbs: 80,
            fat: 30,
            at: `${date}T12:00:00`,
          },
          {
            id: "b",
            label: "Meal B",
            calories: 1000,
            protein: 80,
            carbs: 80,
            fat: 30,
            at: `${date}T19:00:00`,
          },
        ],
      };
    });

    const result = robustAverageIntake(days, 2100);
    expect(result.incompleteDays).toBeGreaterThanOrEqual(1);
    expect(result.outlierDays).toBeGreaterThanOrEqual(1);
    expect(result.avgIntake).toBeCloseTo(2000, 0);
    expect(result.usableDays).toBeGreaterThanOrEqual(7);
  });

  it("treats exercise as earned budget for over/under checks", () => {
    expect(dayCalorieBudget(2025, 500)).toBe(2525);
    // Ate 2400 on a 2025 rest target with 500 burned → still under net budget.
    expect(vsCalorieBudget(2400, 2025, 500)).toBeLessThanOrEqual(0);
  });
});

describe("adaptive forecast", () => {
  it("projects from the trend weight at the observed rate", () => {
    const state = stateWithDays(28, (i) => ({
      weight: 200 - i / 7,
      calories: 2000,
    }));
    const today = addDays(START, 27);
    const series = buildTrendSeries(state.days);
    const tdee = estimateTdee(state, today, 28, series);
    const forecast = buildForecast(series, tdee, today);
    expect(forecast).not.toBeNull();
    expect(forecast!.projectedRatePerWeek).toBeLessThan(-0.5);
    expect(forecast!.etaWeeks).not.toBeNull();
    expect(forecast!.goalWeight).toBe(170);
    expect(forecast!.points[0].weight).toBeCloseTo(
      forecast!.startTrendWeight,
      1
    );
    // Bands widen over time.
    const first = forecast!.points[1];
    const last = forecast!.points[forecast!.points.length - 1];
    expect(last.high - last.low).toBeGreaterThan(first.high - first.low);
  });

  it("returns null with no weigh-ins", () => {
    const state = emptyHealthState();
    const series = buildTrendSeries(state.days);
    const tdee = estimateTdee(state, START, 28, series);
    expect(buildForecast(series, tdee, START)).toBeNull();
  });
});

describe("correlations", () => {
  it("computes exact pearson r", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10);
    expect(pearson([1, 1, 1], [2, 4, 6])).toBeNull();
  });

  it("detects alcohol from meal labels", () => {
    const day = emptyDailyLog(START);
    day.meals.push({
      id: "1",
      label: "Glass of red wine",
      calories: 125,
      protein: 0,
      carbs: 4,
      fat: 0,
      at: `${START}T20:00:00`,
    });
    expect(isAlcoholDay(day)).toBe(true);
    expect(isAlcoholDay(emptyDailyLog(START))).toBe(false);
  });

  it("surfaces a strong sleep/intake pattern and gates thin data", () => {
    // 20 days: short sleep is always followed by a 2600 kcal day,
    // long sleep by a 1900 kcal day.
    const state = stateWithDays(21, (i) => ({
      sleepHours: i % 2 === 0 ? 5.5 : 8,
      calories: 2000,
    }));
    // Overwrite next-day calories to depend on prior night's sleep.
    for (let i = 0; i < 20; i++) {
      const next = addDays(START, i + 1);
      state.days[next].calories = i % 2 === 0 ? 2600 : 1900;
    }
    const report = buildCorrelationReport(state);
    const sleepFinding = report.findings.find(
      (finding) => finding.id === "sleep-next-day-intake"
    );
    expect(sleepFinding).toBeDefined();
    expect(sleepFinding!.r).toBeLessThan(-0.6);
    expect(sleepFinding!.strength).toBe("strong");

    // Fewer than 8 samples → no finding.
    const thin = stateWithDays(4, () => ({ sleepHours: 6, calories: 2000 }));
    expect(
      buildCorrelationReport(thin).findings.find(
        (finding) => finding.id === "sleep-next-day-intake"
      )
    ).toBeUndefined();
  });
});

describe("engine snapshot + digest", () => {
  it("produces a full snapshot and a stable digest hash", () => {
    const state = stateWithDays(28, (i) => ({
      weight: 200 - i / 7,
      calories: 2000,
      protein: 180,
      sleepHours: 7,
      steps: 9000,
      meals: [
        {
          id: `a-${i}`,
          label: "Meal A",
          calories: 1000,
          protein: 90,
          carbs: 80,
          fat: 30,
          at: `${addDays(START, i)}T12:00:00`,
        },
        {
          id: `b-${i}`,
          label: "Meal B",
          calories: 1000,
          protein: 90,
          carbs: 80,
          fat: 30,
          at: `${addDays(START, i)}T19:00:00`,
        },
      ],
    }));
    const today = addDays(START, 27);
    const snapshot = computeEngineSnapshot(state, today);
    expect(snapshot.trendWeight).not.toBeNull();
    // Without a scan, base stays near Katch-McArdle (~1850) with a capped nudge.
    expect(snapshot.tdee.tdee).toBeGreaterThan(1800);
    expect(snapshot.tdee.tdee).toBeLessThan(2100);
    expect(snapshot.forecast).not.toBeNull();

    const digest = buildInsightDigest(state, snapshot, today);
    expect(digest.days.length).toBe(28);
    const hashA = hashDigest(digest);
    expect(hashDigest(buildInsightDigest(state, snapshot, today))).toBe(hashA);

    // Changing data changes the hash.
    state.days[today].calories = 2500;
    const changed = buildInsightDigest(
      state,
      computeEngineSnapshot(state, today),
      today
    );
    expect(hashDigest(changed)).not.toBe(hashA);
  });

  it("exposes net calorie budget with exercise so trained days are not 'over'", () => {
    const state = stateWithDays(28, (i) => ({
      weight: 200 - i / 7,
      calories: 2000,
      protein: 180,
      estimatedActivityCalories: 500,
      meals: [
        {
          id: `a-${i}`,
          label: "Meal A",
          calories: 1000,
          protein: 90,
          carbs: 80,
          fat: 30,
          at: `${addDays(START, i)}T12:00:00`,
        },
        {
          id: `b-${i}`,
          label: "Meal B",
          calories: 1000,
          protein: 90,
          carbs: 80,
          fat: 30,
          at: `${addDays(START, i)}T19:00:00`,
        },
      ],
      workouts: [
        {
          id: `w-${i}`,
          activity: "Alpha class",
          durationMinutes: 60,
          at: `${addDays(START, i)}T07:00:00`,
          exercises: [],
        },
      ],
    }));
    const today = addDays(START, 27);
    const snapshot = computeEngineSnapshot(state, today);
    // Eat 200 over the REST target but 300 under the NET budget once +500 burn counts.
    state.days[today].calories = snapshot.targets.calories + 200;
    const digest = buildInsightDigest(state, snapshot, today);
    const last = digest.days[digest.days.length - 1];

    expect(last.activityCalories).toBe(500);
    expect(last.calorieBudget).toBe(snapshot.targets.calories + 500);
    expect(last.calories).toBeGreaterThan(snapshot.targets.calories);
    expect(last.vsBudget).toBe(-300);
    expect(digest.engine.forecast?.impliedRatePerWeek).not.toBeUndefined();
  });

  it("flags a sparse food day in the digest logging summary", () => {
    const state = stateWithDays(28, (i) => ({
      weight: 200 - i / 7,
      calories: i === 20 ? 350 : 2000,
      protein: 180,
      meals:
        i === 20
          ? [
              {
                id: "only",
                label: "Snack",
                calories: 350,
                protein: 10,
                carbs: 40,
                fat: 10,
                at: `${addDays(START, i)}T15:00:00`,
              },
            ]
          : [
              {
                id: `a-${i}`,
                label: "Meal A",
                calories: 1000,
                protein: 90,
                carbs: 80,
                fat: 30,
                at: `${addDays(START, i)}T12:00:00`,
              },
              {
                id: `b-${i}`,
                label: "Meal B",
                calories: 1000,
                protein: 90,
                carbs: 80,
                fat: 30,
                at: `${addDays(START, i)}T19:00:00`,
              },
            ],
    }));
    const today = addDays(START, 27);
    const digest = buildInsightDigest(
      state,
      computeEngineSnapshot(state, today),
      today
    );
    const sparse = digest.days.find((day) => day.date === addDays(START, 20));
    expect(sparse?.intakeQuality).toBe("likelyIncomplete");
    expect(digest.logging.incompleteIntakeDays).toBeGreaterThanOrEqual(1);
  });

  it("ignores incomplete underlogged days when measuring TDEE", () => {
    // Mostly eat 2000 while losing 1 lb/week (true base ~2500), but sprinkle
    // several 300-cal "forgot to log" days that would otherwise drag avgIntake down.
    const state = stateWithDays(28, (i) => {
      const incomplete = i % 5 === 0;
      return {
        weight: 200 - i / 7,
        calories: incomplete ? 300 : 2000,
        meals: incomplete
          ? [
              {
                id: `s-${i}`,
                label: "Snack",
                calories: 300,
                protein: 10,
                carbs: 30,
                fat: 10,
                at: `${addDays(START, i)}T12:00:00`,
              },
            ]
          : [
              {
                id: `a-${i}`,
                label: "Meal A",
                calories: 1000,
                protein: 90,
                carbs: 80,
                fat: 30,
                at: `${addDays(START, i)}T12:00:00`,
              },
              {
                id: `b-${i}`,
                label: "Meal B",
                calories: 1000,
                protein: 90,
                carbs: 80,
                fat: 30,
                at: `${addDays(START, i)}T19:00:00`,
              },
            ],
      };
    });
    const estimate = estimateTdee(state, addDays(START, 27));
    expect(estimate.incompleteIntakeDays).toBeGreaterThanOrEqual(4);
    expect(estimate.avgIntake).toBeGreaterThan(1800);
    // Incomplete days no longer drag avgIntake down; the InBody/formula
    // anchor still caps measured base near ~1850 (±12%).
    expect(estimate.measuredTdee as number).toBeGreaterThan(1800);
    expect(estimate.measuredTdee as number).toBeLessThanOrEqual(
      Math.round(estimate.fallbackTdee * 1.12)
    );
  });

  it("returns latest trend on or before a date", () => {
    const state = stateWithDays(5, (i) => ({ weight: 200 - i }));
    const series = buildTrendSeries(state.days);
    const point = latestTrendPoint(series, addDays(START, 10));
    expect(point!.date).toBe(addDays(START, 4));
  });
});
