import { DATES, daysUntil } from './health-data';

export type Milestone = {
  label: string;
  date: string;
  days: number;
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
