import { BODYFI_PLAN } from "../config";
import { projectionForDate } from "../projections";
import type { TdeeEstimate } from "./tdee";
import { planRateForDate } from "./targets";
import {
  addDays,
  latestTrendPoint,
  trendResidualStd,
  trendSlopePerWeek,
  type TrendPoint,
} from "./trend";

/**
 * Adaptive forecast: re-projects the weight curve from today's trend weight
 * using the rate you are actually achieving (blended with the rate your
 * current energy balance implies), instead of the static plan anchors.
 */

const KCAL_PER_LB = 3500;
const FORECAST_WEEKS = 16;
/** Sanity clamp on projected weekly change, lbs/week. */
const MIN_RATE = -3;
const MAX_RATE = 2;

export interface ForecastPoint {
  date: string;
  weight: number;
  low: number;
  high: number;
}

export interface AdaptiveForecast {
  startDate: string;
  startTrendWeight: number;
  /** Observed trend slope over the last 3 weeks, lbs/week. */
  observedRatePerWeek: number | null;
  /** Rate implied by (avg intake − TDEE), lbs/week. */
  impliedRatePerWeek: number | null;
  /** Blended rate the forecast uses. */
  projectedRatePerWeek: number;
  points: ForecastPoint[];
  goalWeight: number;
  etaWeeks: number | null;
  etaDate: string | null;
  /** What the original static plan says you should weigh today. */
  planWeightToday: number;
  /** trend − plan; negative means ahead of the plan. */
  deltaVsPlan: number;
}

function goalWeightFromPlan(): number {
  const cutEnd = BODYFI_PLAN.anchors.find(
    (anchor) => anchor.week > 0 && anchor.phase === "Cut"
  );
  return cutEnd?.weight ?? BODYFI_PLAN.anchors[BODYFI_PLAN.anchors.length - 1].weight;
}

export function buildForecast(
  series: TrendPoint[],
  tdee: TdeeEstimate,
  today: string
): AdaptiveForecast | null {
  const latest = latestTrendPoint(series, today);
  if (!latest) return null;

  const observed = trendSlopePerWeek(series, today, 21);
  const implied =
    tdee.avgIntake == null
      ? null
      : ((tdee.avgIntake - tdee.tdee) * 7) / KCAL_PER_LB;

  const { rate: planRate } = planRateForDate(today);
  let rate: number;
  if (observed != null && implied != null) {
    rate = 0.6 * observed + 0.4 * implied;
  } else {
    rate = observed ?? implied ?? planRate;
  }
  rate = Math.min(MAX_RATE, Math.max(MIN_RATE, rate));

  const sigma = Math.max(0.5, trendResidualStd(series, today));
  const points: ForecastPoint[] = [];
  for (let week = 0; week <= FORECAST_WEEKS; week++) {
    const weight = latest.trend + rate * week;
    const band = sigma * Math.sqrt(week);
    points.push({
      date: addDays(today, week * 7),
      weight: Number(weight.toFixed(1)),
      low: Number((weight - band).toFixed(1)),
      high: Number((weight + band).toFixed(1)),
    });
  }

  const goalWeight = goalWeightFromPlan();
  let etaWeeks: number | null = null;
  let etaDate: string | null = null;
  const remaining = latest.trend - goalWeight;
  if (remaining > 0 && rate < -0.05) {
    etaWeeks = Number((remaining / -rate).toFixed(1));
    etaDate = addDays(today, Math.round(etaWeeks * 7));
  } else if (remaining <= 0) {
    etaWeeks = 0;
    etaDate = today;
  }

  const planWeightToday = projectionForDate(today).weight;

  return {
    startDate: latest.date,
    startTrendWeight: Number(latest.trend.toFixed(1)),
    observedRatePerWeek: observed == null ? null : Number(observed.toFixed(2)),
    impliedRatePerWeek: implied == null ? null : Number(implied.toFixed(2)),
    projectedRatePerWeek: Number(rate.toFixed(2)),
    points,
    goalWeight,
    etaWeeks,
    etaDate,
    planWeightToday,
    deltaVsPlan: Number((latest.trend - planWeightToday).toFixed(1)),
  };
}
