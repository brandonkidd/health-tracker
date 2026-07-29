import type { DailyLog, HealthState } from "../types";

/**
 * Trend weight: exponentially smoothed scale weight (Hacker's Diet style).
 * Filters day-to-day water/glycogen/scale noise into the true trajectory
 * that the TDEE and forecast math depend on.
 */

export interface TrendPoint {
  date: string;
  /** Raw scale weight as logged. */
  weight: number;
  /** Smoothed trend weight (full precision — round only for display). */
  trend: number;
}

const DAY_MS = 86_400_000;
/** Per-day smoothing factor. Gaps between weigh-ins compound it. */
const ALPHA = 0.25;

export function dateToTime(date: string): number {
  return new Date(`${date}T12:00:00`).getTime();
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dateToTime(to) - dateToTime(from)) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  const time = dateToTime(date) + days * DAY_MS;
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface WeighIn {
  date: string;
  weight: number;
}

/** Weigh-ins recorded outside the daily log — InBody/DEXA scans and weekly
 *  check-ins. Used to fill dates that have no daily scale entry so those
 *  measurements aren't invisible to the trend/TDEE/forecast math. */
export function auxiliaryWeighIns(state: HealthState): WeighIn[] {
  const points: WeighIn[] = [];
  for (const scan of state.bodyScans ?? []) {
    if (typeof scan.weight === "number" && scan.weight > 0) {
      points.push({ date: scan.date, weight: scan.weight });
    }
  }
  for (const checkIn of state.weeklyCheckIns ?? []) {
    if (typeof checkIn.weight === "number" && checkIn.weight > 0) {
      points.push({ date: checkIn.date, weight: checkIn.weight });
    }
  }
  return points;
}

/** All logged weigh-ins in date order, smoothed. Gap-tolerant: a weigh-in
 *  after `g` missing days gets an effective alpha of 1-(1-ALPHA)^g.
 *  A daily scale entry wins over an extra weigh-in on the same date. */
export function buildTrendSeries(
  days: Record<string, DailyLog>,
  extraWeighIns: WeighIn[] = []
): TrendPoint[] {
  const byDate = new Map<string, number>();
  for (const point of extraWeighIns) {
    if (point.weight > 0) byDate.set(point.date, point.weight);
  }
  for (const day of Object.values(days)) {
    if (typeof day.weight === "number" && day.weight > 0) {
      byDate.set(day.date, day.weight);
    }
  }
  const entries = Array.from(byDate.entries())
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const series: TrendPoint[] = [];
  let trend: number | null = null;
  let previousDate: string | null = null;

  for (const day of entries) {
    const weight = day.weight;
    if (trend == null || previousDate == null) {
      trend = weight;
    } else {
      const gap = Math.max(1, daysBetween(previousDate, day.date));
      const effectiveAlpha = 1 - Math.pow(1 - ALPHA, gap);
      trend = trend + effectiveAlpha * (weight - trend);
    }
    previousDate = day.date;
    series.push({ date: day.date, weight, trend });
  }
  return series;
}

/** Latest trend point on or before `date` (or overall latest when omitted). */
export function latestTrendPoint(
  series: TrendPoint[],
  date?: string
): TrendPoint | null {
  if (!series.length) return null;
  if (!date) return series[series.length - 1];
  const cutoff = dateToTime(date);
  for (let i = series.length - 1; i >= 0; i--) {
    if (dateToTime(series[i].date) <= cutoff) return series[i];
  }
  return null;
}

/** Least-squares slope of the trend line over the trailing window, in lbs/week.
 *  Null when there are fewer than 4 weigh-ins in the window. */
export function trendSlopePerWeek(
  series: TrendPoint[],
  endDate: string,
  windowDays = 21
): number | null {
  const end = dateToTime(endDate);
  const points = series.filter((point) => {
    const time = dateToTime(point.date);
    return time <= end && time > end - windowDays * DAY_MS;
  });
  if (points.length < 4) return null;

  const xs = points.map((point) => (dateToTime(point.date) - end) / DAY_MS);
  const ys = points.map((point) => point.trend);
  const n = points.length;
  const meanX = xs.reduce((sum, x) => sum + x, 0) / n;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (xs[i] - meanX) * (ys[i] - meanY);
    variance += (xs[i] - meanX) ** 2;
  }
  if (variance === 0) return null;
  return (covariance / variance) * 7;
}

/** Standard deviation of (raw weight − trend) over the trailing window.
 *  Used to size forecast confidence bands. */
export function trendResidualStd(
  series: TrendPoint[],
  endDate: string,
  windowDays = 28
): number {
  const end = dateToTime(endDate);
  const residuals = series
    .filter((point) => {
      const time = dateToTime(point.date);
      return time <= end && time > end - windowDays * DAY_MS;
    })
    .map((point) => point.weight - point.trend);
  if (residuals.length < 3) return 0.8;
  const mean = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
  const variance =
    residuals.reduce((sum, r) => sum + (r - mean) ** 2, 0) / residuals.length;
  return Math.sqrt(variance);
}
