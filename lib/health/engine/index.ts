import type { HealthState } from "../types";
import {
  buildCorrelationReport,
  type CorrelationReport,
} from "./correlations";
import { buildForecast, type AdaptiveForecast } from "./forecast";
import { recommendTargets, type TargetRecommendation } from "./targets";
import { estimateTdee, type TdeeEstimate } from "./tdee";
import { buildTrendSeries, latestTrendPoint, type TrendPoint } from "./trend";

/**
 * One pass over the full health state producing every adaptive metric the
 * app shows. Pure and synchronous — recomputed (memoized) on each state
 * change so the numbers respond in real time as data is logged.
 */

export interface EngineSnapshot {
  date: string;
  trendSeries: TrendPoint[];
  /** Latest smoothed weight, rounded for display. */
  trendWeight: number | null;
  tdee: TdeeEstimate;
  targets: TargetRecommendation;
  forecast: AdaptiveForecast | null;
  correlations: CorrelationReport;
}

export function computeEngineSnapshot(
  state: HealthState,
  today: string
): EngineSnapshot {
  const trendSeries = buildTrendSeries(state.days);
  const tdee = estimateTdee(state, today, 28, trendSeries);
  const targets = recommendTargets(tdee, today);
  const forecast = buildForecast(trendSeries, tdee, today);
  const correlations = buildCorrelationReport(state);
  const latest = latestTrendPoint(trendSeries, today);

  return {
    date: today,
    trendSeries,
    trendWeight: latest ? Number(latest.trend.toFixed(1)) : null,
    tdee,
    targets,
    forecast,
    correlations,
  };
}

/** The engine's estimate of today's true energy balance (kcal deficit). */
export function adaptiveDeficit(
  snapshot: EngineSnapshot,
  calories: number
): number {
  return snapshot.tdee.tdee - calories;
}

export type { TrendPoint } from "./trend";
export type { TdeeEstimate } from "./tdee";
export type { TargetRecommendation } from "./targets";
export type { AdaptiveForecast, ForecastPoint } from "./forecast";
export type { CorrelationFinding, CorrelationReport } from "./correlations";
export { buildInsightDigest, hashDigest, type InsightDigest } from "./digest";
