import { BODYFI_PLAN } from "./config";
import type { DailyLog, ProjectionPoint, WeeklyCheckIn } from "./types";

const DAY_MS = 86_400_000;

export function planWeek(date: string): number {
  const start = new Date(`${BODYFI_PLAN.startDate}T12:00:00`).getTime();
  const current = new Date(`${date}T12:00:00`).getTime();
  return Math.max(0, Math.floor((current - start) / DAY_MS / 7));
}

export function projectionAtWeek(week: number): ProjectionPoint {
  const anchors = BODYFI_PLAN.anchors;
  const last = anchors[anchors.length - 1];
  if (week >= last.week) return { ...last };

  const nextIndex = anchors.findIndex((anchor) => anchor.week >= week);
  if (nextIndex <= 0) return { ...anchors[0] };

  const previous = anchors[nextIndex - 1];
  const next = anchors[nextIndex];
  const progress = (week - previous.week) / (next.week - previous.week);
  const interpolate = (from: number, to: number) =>
    Number((from + (to - from) * progress).toFixed(1));

  return {
    week,
    weight: interpolate(previous.weight, next.weight),
    waist: interpolate(previous.waist, next.waist),
    bodyFat: interpolate(previous.bodyFat, next.bodyFat),
    phase: previous.phase,
  };
}

export function projectionForDate(date: string): ProjectionPoint {
  return projectionAtWeek(planWeek(date));
}

export function rollingAverage(
  days: Record<string, DailyLog>,
  endDate: string,
  metric: "weight" | "sleepHours",
  window = 7
): number | undefined {
  const end = new Date(`${endDate}T12:00:00`).getTime();
  const values = Object.values(days)
    .filter((day) => {
      const time = new Date(`${day.date}T12:00:00`).getTime();
      return time <= end && time > end - window * DAY_MS && typeof day[metric] === "number";
    })
    .map((day) => day[metric] as number);

  if (!values.length) return undefined;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

export function checkInDelta(checkIn: WeeklyCheckIn) {
  const projected = projectionForDate(checkIn.date);
  return {
    weight: checkIn.weight == null ? undefined : Number((checkIn.weight - projected.weight).toFixed(1)),
    waist: checkIn.waist == null ? undefined : Number((checkIn.waist - projected.waist).toFixed(1)),
    bodyFat:
      checkIn.bodyFat == null
        ? undefined
        : Number((checkIn.bodyFat - projected.bodyFat).toFixed(1)),
  };
}

export function estimatedDeficit(log: DailyLog, estimatedMaintenance = 2600): number {
  return estimatedMaintenance + log.estimatedActivityCalories - log.calories;
}
