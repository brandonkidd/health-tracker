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

  it("measures TDEE from intake vs trend-weight change", () => {
    // Eat 2000/day while losing 1 lb/week → true TDEE = 2500.
    const state = stateWithDays(28, (i) => ({
      weight: 200 - i / 7,
      calories: 2000,
    }));
    const estimate = estimateTdee(state, addDays(START, 27));
    expect(estimate.measuredTdee).not.toBeNull();
    // Smoothing transient allows modest deviation from the ideal 2500.
    expect(estimate.measuredTdee as number).toBeGreaterThan(2380);
    expect(estimate.measuredTdee as number).toBeLessThan(2560);
    expect(estimate.confidence).toBeGreaterThan(0.9);
    expect(estimate.tdee).toBe(estimate.measuredTdee);
    expect(estimate.avgIntake).toBe(2000);
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
        confidence: 1,
        windowDays: 27,
        intakeDays: 28,
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
        confidence: 1,
        windowDays: 27,
        intakeDays: 28,
        weighInDays: 28,
        avgIntake: 1500,
        trendChangeLbs: -2,
      },
      "2026-08-07"
    );
    expect(targets.calories).toBeGreaterThanOrEqual(1600);
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
    }));
    const today = addDays(START, 27);
    const snapshot = computeEngineSnapshot(state, today);
    expect(snapshot.trendWeight).not.toBeNull();
    expect(snapshot.tdee.tdee).toBeGreaterThan(2000);
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

  it("returns latest trend on or before a date", () => {
    const state = stateWithDays(5, (i) => ({ weight: 200 - i }));
    const series = buildTrendSeries(state.days);
    const point = latestTrendPoint(series, addDays(START, 10));
    expect(point!.date).toBe(addDays(START, 4));
  });
});
