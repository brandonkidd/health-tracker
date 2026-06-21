import { DATES, daysUntil, BASELINE } from './health-data';

export type Milestone = {
  label: string;
  date: string;
  days: number;
};

export type WeightEntry = { date: string; weight: number };

export type BodyCompSnapshot = {
  weight: number;
  bodyFatPct: number;
  fatMass: number;
  leanMass: number;
  muscleMass: number;
  musclePct: number;
  source: 'scan' | 'estimate';
};

export const RECOMP_TARGETS = {
  weight: 180,
  bodyFat: 11.5,
  muscleMass: BASELINE.muscleMass,
};

export function getMilestones(): Milestone[] {
  const items: Milestone[] = [
    { label: 'Phase 1', date: DATES.phase1End, days: daysUntil(DATES.phase1End) },
    { label: 'LifeTime', date: DATES.lifeTime, days: daysUntil(DATES.lifeTime) },
    { label: 'Maui', date: DATES.maui, days: daysUntil(DATES.maui) },
    { label: 'Birthday', date: DATES.birthday, days: daysUntil(DATES.birthday) },
  ];
  return items;
}

export function getNextMilestone(): Milestone | null {
  const upcoming = getMilestones().filter((m) => m.days >= 0);
  if (upcoming.length === 0) return null;
  return upcoming.sort((a, b) => a.days - b.days)[0];
}

export function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function progressColor(pct: number): string {
  if (pct >= 100) return '#5fc878';
  if (pct >= 75) return '#ff4e1b';
  return '#a09ccc';
}

/** Calories from macros — single source of truth (4/4/9 rule) */
export function macroCalories(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

type ScheduleItem = { t: string; what: string; d: string };

export function parseScheduleTime(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function getUpNext(schedule: ScheduleItem[]): ScheduleItem | null {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  for (const item of schedule) {
    if (parseScheduleTime(item.t) >= nowMins) {
      return item;
    }
  }
  return schedule[0] || null;
}

export function getWeightHistory(days: Record<string, any> | undefined): WeightEntry[] {
  if (!days) return [];
  return Object.entries(days)
    .filter(([, d]) => d?.weight != null && d.weight > 0)
    .map(([date, d]) => ({ date, weight: d.weight as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function rollingAverage(values: number[], count: number): number | null {
  if (values.length === 0) return null;
  const slice = values.slice(-count);
  return Math.round((slice.reduce((sum, v) => sum + v, 0) / slice.length) * 10) / 10;
}

/** Latest logged weight, or null */
export function getLatestWeight(days: Record<string, any> | undefined): number | null {
  const history = getWeightHistory(days);
  return history.length > 0 ? history[history.length - 1].weight : null;
}

/** Body comp from latest scan fields on a day, or lean-mass-held estimate from weight */
export function getBodyComp(
  weight: number,
  day?: { bodyFat?: number | null; muscleMass?: number | null; leanMass?: number | null } | null,
): BodyCompSnapshot {
  if (day?.bodyFat != null && day.bodyFat > 0) {
    const bodyFatPct = day.bodyFat;
    const fatMass = (weight * bodyFatPct) / 100;
    const leanMass = day.leanMass ?? weight - fatMass;
    const muscleMass = day.muscleMass ?? BASELINE.muscleMass;
    return {
      weight,
      bodyFatPct,
      fatMass: Math.round(fatMass * 10) / 10,
      leanMass: Math.round(leanMass * 10) / 10,
      muscleMass,
      musclePct: Math.round((muscleMass / weight) * 1000) / 10,
      source: 'scan',
    };
  }

  const leanMass = BASELINE.leanMass;
  const fatMass = Math.max(0, weight - leanMass);
  const bodyFatPct = weight > 0 ? (fatMass / weight) * 100 : BASELINE.bodyFat;
  const muscleMass = BASELINE.muscleMass;
  return {
    weight,
    bodyFatPct: Math.round(bodyFatPct * 10) / 10,
    fatMass: Math.round(fatMass * 10) / 10,
    leanMass,
    muscleMass,
    musclePct: Math.round((muscleMass / weight) * 1000) / 10,
    source: 'estimate',
  };
}

export function getStartBodyComp(): BodyCompSnapshot {
  return getBodyComp(BASELINE.weight, {
    bodyFat: BASELINE.bodyFat,
    muscleMass: BASELINE.muscleMass,
    leanMass: BASELINE.leanMass,
  });
}

export function calculateStreak(days: Record<string, any> | undefined): number {
  if (!days) return 0;
  let streak = 0;
  const currentDate = new Date();

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() - i);
    const key = checkDate.toISOString().slice(0, 10);
    const day = days[key];
    if (!day) break;

    const waterGoal = (day.water || 0) >= 3;
    const proteinGoal = (day.protein || 0) >= 170;
    const suppGoal = Object.values(day.supps || {}).filter(Boolean).length >= 6;

    if (waterGoal && proteinGoal && suppGoal) streak++;
    else break;
  }
  return streak;
}

export function formatDelta(value: number, unit: string, invert = false): string {
  const sign = value > 0 ? '+' : '';
  const arrow = invert
    ? value < 0 ? ' ↓' : value > 0 ? ' ↑' : ''
    : value > 0 ? ' ↑' : value < 0 ? ' ↓' : '';
  return `${sign}${value.toFixed(1)}${unit}${arrow}`;
}
