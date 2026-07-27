"use client";

import { useMemo, useRef, useState } from "react";
import {
  ACTIVITY_DEFAULT_MINUTES,
  BODYFI_PLAN,
  estimateActivityCalories,
  plannedActivity,
} from "@/lib/health/config";
import { estimatedDeficit } from "@/lib/health/projections";
import type { EngineSnapshot } from "@/lib/health/engine";
import type { InsightStatus } from "@/hooks/use-health-state";
import type { DailyInsight, DailyLog, WorkoutScan } from "@/lib/health/types";
import {
  ALCOHOL_PRESETS,
  FOOD_CATEGORIES,
  FOOD_PRESETS,
  SUPPLEMENTS_DAILY,
  type FoodPreset,
} from "@/lib/health-data";
import { CoachCard } from "./coach-card";
import { Card, Field, SectionHeader, StatusBadge } from "./ui";

const WATER_SERVING_OZ = 8;
const WATER_SERVINGS = BODYFI_PLAN.targets.waterOz / WATER_SERVING_OZ;

const CATEGORY_LABELS: Record<FoodPreset["category"], string> = {
  breakfast: "Breakfast",
  snack: "Snacks",
  smoothie: "Smoothies & protein shakes",
  lunch: "Lunch",
  dinner: "Dinner",
  restaurant: "Restaurant go-tos",
  quick: "Quick add-ons",
  drink: "Drinks",
  alcohol: "Alcohol",
};

const BUILTIN_PRESETS: FoodPreset[] = [...FOOD_PRESETS, ...ALCOHOL_PRESETS];
const BUILTIN_PRESET_IDS = new Set(BUILTIN_PRESETS.map((preset) => preset.id));

/** Form draft for adding or editing a preset; numbers stay strings while typing. */
interface PresetDraft {
  id: string | null;
  label: string;
  category: FoodPreset["category"];
  cals: string;
  p: string;
  c: string;
  f: string;
  fiber: string;
  notes: string;
  source?: string;
}

/* ——— icons ——— */

function StepsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
      <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
      <path d="M16 17h4M4 13h4" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 12h2M19.4 12h2M8.4 12h7.2" />
      <rect x="4.6" y="8" width="3.8" height="8" rx="1.4" />
      <rect x="15.6" y="8" width="3.8" height="8" rx="1.4" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.9S5.6 9.8 5.6 14.4a6.4 6.4 0 0 0 12.8 0C18.4 9.8 12 2.9 12 2.9Z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M4 7.5h2.6l1.5-2.3h7.8l1.5 2.3H20a1.6 1.6 0 0 1 1.6 1.6v8.6A1.6 1.6 0 0 1 20 19.3H4a1.6 1.6 0 0 1-1.6-1.6V9.1A1.6 1.6 0 0 1 4 7.5Z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

/* ——— photo scan helpers ——— */

interface ScanResponse {
  isWorkoutScreen: boolean;
  activity: string;
  durationMinutes: number | null;
  calories: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  exercises: { name: string; weightLbs: number | null; sets: number | null; reps: number | null }[];
  summary: string;
  recommendations: string[];
  error?: string;
}

/** Shrink the photo client-side so uploads stay fast and cheap. */
async function fileToDataUrl(file: File, maxDim = 1400): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Recent strength entries across all days, newest first, for progression advice. */
function strengthHistory(allDays: Record<string, DailyLog>, before: string) {
  return Object.values(allDays ?? {})
    .filter((entry) => entry.date <= before)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((entry) =>
      (entry.workouts ?? []).flatMap((scan) =>
        scan.exercises.map((exercise) => ({
          date: entry.date,
          name: exercise.name,
          weightLbs: exercise.weightLbs,
          sets: exercise.sets,
          reps: exercise.reps,
        }))
      )
    )
    .slice(0, 40);
}

/* ——— score helpers ——— */

type Targets = {
  protein: number;
  calories: number;
  waterOz: number;
  steps: number;
  sleepHours: number;
};

/** Health Improvement Score: % of daily targets hit. */
function dayScore(day: DailyLog, targets: Targets, supplementList: { id: string }[]): number {
  const supplementsTaken = supplementList.filter((item) => day.supplements[item.id]).length;
  const checks = [
    day.protein >= targets.protein,
    day.calories > 0 && day.calories <= targets.calories,
    day.waterOz >= targets.waterOz,
    day.steps >= targets.steps,
    (day.sleepHours ?? 0) >= targets.sleepHours,
    day.activityCompleted,
    supplementList.length > 0 && supplementsTaken === supplementList.length,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function hasWorkout(day: DailyLog | undefined): day is DailyLog {
  return !!day && (day.activityCompleted || (day.workouts ?? []).length > 0);
}

/* ——— month calendar ——— */

function MonthCalendar({
  allDays,
  targets,
  supplementList,
  selectedDate,
  today,
  onSelectDate,
}: {
  allDays: Record<string, DailyLog>;
  targets: Targets;
  supplementList: { id: string }[];
  selectedDate: string;
  today: string;
  onSelectDate: (next: string) => void;
}) {
  const [monthCursor, setMonthCursor] = useState(() => selectedDate.slice(0, 7));
  const [year, month] = monthCursor.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const label = firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setMonthCursor(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const key = `${monthCursor}-${String(index + 1).padStart(2, "0")}`;
    const entry = allDays[key];
    const worked = hasWorkout(entry);
    const hasData =
      !!entry &&
      (entry.calories > 0 ||
        entry.protein > 0 ||
        entry.waterOz > 0 ||
        entry.steps > 0 ||
        (entry.sleepHours ?? 0) > 0 ||
        worked);
    return {
      key,
      num: index + 1,
      worked,
      score: hasData ? dayScore(entry, targets, supplementList) : null,
      future: key > today,
    };
  });
  const workoutCount = cells.filter((cell) => cell.worked).length;

  return (
    <div className="hc-month-cal">
      <div className="hc-month-head">
        <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
          ‹
        </button>
        <div className="hc-month-title">
          <strong>{label}</strong>
          <small>
            {workoutCount} workout {workoutCount === 1 ? "day" : "days"}
          </small>
        </div>
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
          ›
        </button>
      </div>
      <div className="hc-month-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((dow, index) => (
          <span key={index} className="hc-month-dow">
            {dow}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {cells.map((cell) => {
          const heat = cell.score != null ? 0.12 + 0.88 * (cell.score / 100) : 0;
          const hot = cell.score != null && cell.score >= 55;
          return (
            <button
              key={cell.key}
              type="button"
              className={[
                "hc-month-cell",
                cell.score != null ? "logged" : "",
                hot ? "hot" : "",
                cell.key === selectedDate ? "selected" : "",
                cell.key === today ? "today" : "",
                cell.future ? "future" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                cell.score != null
                  ? { background: `rgba(246, 104, 62, ${heat.toFixed(2)})` }
                  : undefined
              }
              aria-label={[
                cell.key,
                cell.score != null ? `health score ${cell.score}%` : "no data",
                cell.worked ? "worked out" : "",
              ]
                .filter(Boolean)
                .join(", ")}
              onClick={() => onSelectDate(cell.key)}
            >
              <span className="hc-month-num">{cell.num}</span>
              <strong>{cell.score != null ? `${cell.score}%` : "\u00A0"}</strong>
              {cell.worked && <i className="hc-month-flag" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="hc-month-legend">
        <span className="hc-month-scale" aria-label="Tile color shows Health Improvement Score">
          Less
          <i style={{ opacity: 0.15 }} />
          <i style={{ opacity: 0.4 }} />
          <i style={{ opacity: 0.65 }} />
          <i style={{ opacity: 1 }} />
          More
        </span>
        <span>
          <i className="hc-month-workdot" /> Worked out
        </span>
      </div>
    </div>
  );
}

/* ——— history helpers ——— */

function seriesEndingAt(
  allDays: Record<string, DailyLog>,
  date: string,
  length: number,
  pick: (day: DailyLog) => number
): number[] {
  const values: number[] = [];
  const cursor = new Date(`${date}T12:00:00`);
  for (let i = 0; i < length; i++) {
    const key = cursor.toISOString().slice(0, 10);
    const day = allDays[key];
    values.unshift(day ? pick(day) : 0);
    cursor.setDate(cursor.getDate() - 1);
  }
  return values;
}

function weeklyDelta(values: number[]): number | null {
  const recent = values.slice(-7);
  const previous = values.slice(-14, -7);
  const sum = (list: number[]) => list.reduce((total, value) => total + value, 0);
  const prevAvg = sum(previous) / (previous.length || 1);
  const recentAvg = sum(recent) / (recent.length || 1);
  if (prevAvg === 0) return null;
  return Math.round(((recentAvg - prevAvg) / prevAvg) * 100);
}

/* ——— mini charts (200 x 64 viewBox) ——— */

const CHART_W = 200;
const CHART_H = 64;

function DotColumnsChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const slot = CHART_W / values.length;
  return (
    <svg className="hc-update-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
      {values.map((value, column) => {
        const dots = Math.max(value > 0 ? 1 : 0, Math.round((value / max) * 7));
        return Array.from({ length: dots }, (_, row) => (
          <rect
            key={`${column}-${row}`}
            className="fill"
            x={column * slot + slot * 0.24}
            y={CHART_H - 4 - row * 8.4}
            width={slot * 0.42}
            height={5}
            rx={2.4}
            opacity={0.35 + 0.65 * (value / max)}
          />
        ));
      })}
    </svg>
  );
}

function LineChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * CHART_W;
      const y = CHART_H - 6 - ((value - min) / range) * (CHART_H - 14);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="hc-update-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline className="stroke" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StepChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const slot = CHART_W / values.length;
  let path = "";
  values.forEach((value, index) => {
    const y = CHART_H - 6 - ((value - min) / range) * (CHART_H - 14);
    const x0 = index * slot;
    path += index === 0 ? `M ${x0} ${y}` : ` V ${y}`;
    path += ` H ${x0 + slot}`;
  });
  return (
    <svg className="hc-update-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="stroke" d={path} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function BarsChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const slot = CHART_W / values.length;
  return (
    <svg className="hc-update-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
      {values.map((value, index) => {
        const height = Math.max(4, (value / max) * (CHART_H - 10));
        return (
          <rect
            key={index}
            className="fill"
            x={index * slot + slot * 0.26}
            y={CHART_H - 2 - height}
            width={slot * 0.44}
            height={height}
            rx={2.6}
            opacity={value > 0 ? 0.9 : 0.25}
          />
        );
      })}
    </svg>
  );
}

function UpdateCard({
  label,
  delta,
  status,
  statusLow,
  value,
  unit,
  children,
}: {
  label: string;
  delta: number | null;
  status: string;
  statusLow: boolean;
  value: string;
  unit: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hc-update-card">
      <div className="hc-update-head">
        <strong>{label}</strong>
        {delta != null && <span>{delta > 0 ? `+${delta}` : delta}%</span>}
      </div>
      <div className={statusLow ? "hc-update-status low" : "hc-update-status"}>
        <i />
        {status}
      </div>
      <div className="hc-update-value">
        {value}
        <small>{unit}</small>
      </div>
      {children}
    </div>
  );
}

/* ——— screen ——— */

export function TodayScreen({
  date,
  day,
  allDays,
  archivedSupplements,
  customPresets,
  onUpdatePresets,
  engine,
  insight,
  insightStatus,
  onRefreshInsight,
  onChange,
  onClear,
  onDateChange,
}: {
  date: string;
  day: DailyLog;
  allDays: Record<string, DailyLog>;
  archivedSupplements: string[];
  customPresets: FoodPreset[];
  onUpdatePresets: (next: FoodPreset[]) => void;
  engine: EngineSnapshot | null;
  insight: DailyInsight | null;
  insightStatus: InsightStatus;
  onRefreshInsight: () => void;
  onChange: (next: DailyLog) => void;
  onClear: () => void;
  onDateChange: (next: string) => void;
}) {
  const [tab, setTab] = useState<"daily" | "month">("daily");
  const [editingPresets, setEditingPresets] = useState(false);
  const [presetDraft, setPresetDraft] = useState<PresetDraft | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const activity = plannedActivity(date);
  const supplementList = SUPPLEMENTS_DAILY.filter(
    (item) => item.tier === 1 && !archivedSupplements.includes(item.id)
  );
  const supplementsTaken = supplementList.filter((item) => day.supplements[item.id]).length;
  // Adaptive: deficit against the learned TDEE; static estimate as fallback.
  const deficit = engine ? engine.tdee.tdee - day.calories : estimatedDeficit(day);
  const targets = engine?.targets ?? BODYFI_PLAN.targets;

  const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

  const dayStrip = Array.from({ length: 5 }, (_, index) => {
    const cursor = new Date(`${date}T12:00:00`);
    cursor.setDate(cursor.getDate() + index - 2);
    return {
      key: cursor.toISOString().slice(0, 10),
      name: cursor.toLocaleDateString(undefined, { weekday: "short" }),
      num: cursor.getDate(),
    };
  });

  const history = (pick: (entry: DailyLog) => number) =>
    seriesEndingAt(allDays ?? {}, date, 14, pick);

  const proteinSeries = history((entry) => entry.protein);
  const calorieSeries = history((entry) => entry.calories);
  const sleepSeries = history((entry) => entry.sleepHours ?? 0);
  const waterSeries = history((entry) => entry.waterOz);

  const avg7 = (values: number[]) => {
    const recent = values.slice(-7).filter((value) => value > 0);
    return recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 0;
  };

  // Latest known weight (scan back from the selected date), for calorie estimates.
  const latestWeight = (() => {
    const dates = Object.keys(allDays ?? {})
      .filter((key) => key <= date)
      .sort()
      .reverse();
    for (const key of dates) {
      const weight = allDays[key]?.weight;
      if (weight) return weight;
    }
    return BODYFI_PLAN.baseline.weight;
  })();

  const classMinutes =
    activity.type === "walk" && day.walkingMinutes > 0
      ? day.walkingMinutes
      : ACTIVITY_DEFAULT_MINUTES[activity.type];
  const classEstimate = estimateActivityCalories(activity.type, latestWeight, classMinutes);

  const score = dayScore(day, targets, supplementList);

  function patch(updates: Partial<DailyLog>) {
    onChange({ ...day, ...updates });
  }

  async function scanWorkoutPhoto(file: File) {
    setScanBusy(true);
    setScanError(null);
    try {
      const image = await fileToDataUrl(file);
      const response = await fetch("/api/scan-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          weightLb: latestWeight,
          plannedActivity: activity.label,
          history: strengthHistory(allDays, date),
        }),
      });
      const result = (await response.json()) as ScanResponse;
      if (!response.ok) throw new Error(result.error ?? "Scan failed — try again.");
      if (!result.isWorkoutScreen) {
        throw new Error(
          "That photo doesn't look like a workout screen. Try a clearer shot of the class display or watch summary."
        );
      }

      const scan: WorkoutScan = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        activity: result.activity || activity.label,
        durationMinutes: result.durationMinutes ?? undefined,
        calories: result.calories ?? undefined,
        avgHeartRate: result.avgHeartRate ?? undefined,
        maxHeartRate: result.maxHeartRate ?? undefined,
        exercises: (result.exercises ?? []).map((exercise) => ({
          name: exercise.name,
          weightLbs: exercise.weightLbs ?? undefined,
          sets: exercise.sets ?? undefined,
          reps: exercise.reps ?? undefined,
        })),
        summary: result.summary || undefined,
        recommendations: result.recommendations?.length ? result.recommendations : undefined,
      };

      // Prefer the calories on the screen; fall back to a MET estimate for the scanned duration.
      const calories =
        scan.calories ??
        (scan.durationMinutes
          ? estimateActivityCalories(activity.type, latestWeight, scan.durationMinutes)
          : classEstimate);

      patch({
        workouts: [...(day.workouts ?? []), scan],
        activityCompleted: true,
        estimatedActivityCalories: Math.round(calories),
      });
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Scan failed — try again.");
    } finally {
      setScanBusy(false);
    }
  }

  function removeScan(id: string) {
    patch({ workouts: (day.workouts ?? []).filter((scan) => scan.id !== id) });
  }

  function addMeal(meal: FoodPreset) {
    const entry = {
      id: `${meal.id}-${crypto.randomUUID()}`,
      label: meal.label,
      calories: meal.cals,
      protein: meal.p,
      carbs: meal.c,
      fat: meal.f,
      fiber: meal.fiber,
      at: new Date().toISOString(),
    };
    patch({
      meals: [...day.meals, entry],
      calories: day.calories + meal.cals,
      protein: day.protein + meal.p,
      carbs: day.carbs + meal.c,
      fat: day.fat + meal.f,
      fiber: day.fiber + (meal.fiber ?? 0),
    });
  }

  function removeMeal(id: string) {
    const meal = day.meals.find((entry) => entry.id === id);
    if (!meal) return;
    patch({
      meals: day.meals.filter((entry) => entry.id !== id),
      calories: Math.max(0, day.calories - meal.calories),
      protein: Math.max(0, day.protein - meal.protein),
      carbs: Math.max(0, day.carbs - meal.carbs),
      fat: Math.max(0, day.fat - meal.fat),
      fiber: Math.max(0, day.fiber - (meal.fiber ?? 0)),
    });
  }

  function clearMeals() {
    if (day.meals.length === 0 || window.confirm("Clear every meal logged for this day?")) {
      const logged = day.meals.reduce(
        (totals, meal) => ({
          calories: totals.calories + meal.calories,
          protein: totals.protein + meal.protein,
          carbs: totals.carbs + meal.carbs,
          fat: totals.fat + meal.fat,
          fiber: totals.fiber + (meal.fiber ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      );
      patch({
        meals: [],
        calories: Math.max(0, day.calories - logged.calories),
        protein: Math.max(0, day.protein - logged.protein),
        carbs: Math.max(0, day.carbs - logged.carbs),
        fat: Math.max(0, day.fat - logged.fat),
        fiber: Math.max(0, day.fiber - logged.fiber),
      });
    }
  }

  function clearDay() {
    if (window.confirm(`Clear all tracked data for ${date}? This cannot be undone.`)) {
      onClear();
    }
  }

  // Built-ins with user edits applied, plus user-added presets at the end.
  const allPresets = useMemo(() => {
    const overrides = new Map(customPresets.map((preset) => [preset.id, preset]));
    return BUILTIN_PRESETS.map((preset) => overrides.get(preset.id) ?? preset).concat(
      customPresets.filter((preset) => !BUILTIN_PRESET_IDS.has(preset.id))
    );
  }, [customPresets]);

  const mealPresets = (category: FoodPreset["category"]) =>
    allPresets.filter((preset) => preset.category === category);

  function startNewPreset() {
    setPresetDraft({
      id: null,
      label: "",
      category: "snack",
      cals: "",
      p: "",
      c: "",
      f: "",
      fiber: "",
      notes: "",
    });
  }

  function startEditPreset(meal: FoodPreset) {
    setPresetDraft({
      id: meal.id,
      label: meal.label,
      category: meal.category,
      cals: String(meal.cals),
      p: String(meal.p),
      c: String(meal.c),
      f: String(meal.f),
      fiber: meal.fiber != null ? String(meal.fiber) : "",
      notes: meal.notes ?? "",
      source: meal.source,
    });
  }

  function savePresetDraft() {
    if (!presetDraft || !presetDraft.label.trim()) return;
    const preset: FoodPreset = {
      id: presetDraft.id ?? `custom-${crypto.randomUUID()}`,
      label: presetDraft.label.trim(),
      say: presetDraft.label.trim().toLowerCase(),
      category: presetDraft.category,
      cals: Number(presetDraft.cals) || 0,
      p: Number(presetDraft.p) || 0,
      c: Number(presetDraft.c) || 0,
      f: Number(presetDraft.f) || 0,
      fiber: presetDraft.fiber.trim() === "" ? undefined : Number(presetDraft.fiber) || 0,
      notes: presetDraft.notes.trim() || undefined,
      source: presetDraft.source,
    };
    onUpdatePresets([...customPresets.filter((entry) => entry.id !== preset.id), preset]);
    setPresetDraft(null);
  }

  /** Removes a custom preset, or drops the override to restore a built-in. */
  function removePresetDraft() {
    if (!presetDraft?.id) return;
    onUpdatePresets(customPresets.filter((entry) => entry.id !== presetDraft.id));
    setPresetDraft(null);
  }

  const draftIsBuiltin = presetDraft?.id != null && BUILTIN_PRESET_IDS.has(presetDraft.id);
  const draftHasOverride =
    presetDraft?.id != null && customPresets.some((entry) => entry.id === presetDraft.id);

  return (
    <div className="hc-stack">
      <div className="hc-daystrip" role="tablist" aria-label="Select day">
        {dayStrip.map((item) => (
          <button
            key={item.key}
            className={item.key === date ? "active" : ""}
            onClick={() => onDateChange(item.key)}
          >
            <span className="hc-day-name">{item.name}</span>
            <span className="hc-day-num">{item.num}</span>
          </button>
        ))}
      </div>
      {date !== today && (
        <button
          className="hc-text-button"
          style={{ justifySelf: "center" }}
          onClick={() => onDateChange(today)}
        >
          Back to today
        </button>
      )}

      {date === today && (
        <CoachCard
          engine={engine}
          insight={insight}
          status={insightStatus}
          todayCalories={day.calories}
          onRefresh={onRefreshInsight}
        />
      )}

      <div className="hc-pill-toggle" role="tablist" aria-label="Daily or month">
        <button className={tab === "daily" ? "active" : ""} onClick={() => setTab("daily")}>
          Daily
        </button>
        <button className={tab === "month" ? "active" : ""} onClick={() => setTab("month")}>
          Month
        </button>
      </div>

      {tab === "month" ? (
        <MonthCalendar
          allDays={allDays ?? {}}
          targets={targets}
          supplementList={supplementList}
          selectedDate={date}
          today={today}
          onSelectDate={onDateChange}
        />
      ) : (
        <>
          <div className="hc-bigstat">
            <strong>{day.calories.toLocaleString()}</strong>
            <span>Calories</span>
          </div>

          <div className="hc-feature-row">
            <div className="hc-feature-card">
              <span className="hc-feature-icon"><DumbbellIcon /></span>
              <span>Protein</span>
              <strong>{day.protein} g</strong>
            </div>
            <div className="hc-feature-card">
              <span className="hc-feature-icon"><DropIcon /></span>
              <span>Water</span>
              <strong>{day.waterOz} oz</strong>
            </div>
            <div className="hc-feature-card">
              <span className="hc-feature-icon"><StepsIcon /></span>
              <span>Steps</span>
              <strong>{day.steps.toLocaleString()}</strong>
            </div>
            <div className="hc-feature-card">
              <span className="hc-feature-icon"><FlameIcon /></span>
              <span>Burned</span>
              <strong>{day.estimatedActivityCalories.toLocaleString()} cal</strong>
            </div>
          </div>
        </>
      )}

      {tab !== "month" && (
      <>
      <h2 className="hc-section-title">Daily Updates</h2>

      <div className="hc-update-grid">
        <UpdateCard
          label="Protein"
          delta={weeklyDelta(proteinSeries)}
          status={avg7(proteinSeries) >= targets.protein * 0.85 ? "Normal" : "Low"}
          statusLow={avg7(proteinSeries) < targets.protein * 0.85}
          value={String(day.protein)}
          unit="g"
        >
          <DotColumnsChart values={proteinSeries} />
        </UpdateCard>

        <UpdateCard
          label="Calories"
          delta={weeklyDelta(calorieSeries)}
          status={avg7(calorieSeries) <= targets.calories * 1.05 ? "On plan" : "High"}
          statusLow={avg7(calorieSeries) > targets.calories * 1.05}
          value={day.calories.toLocaleString()}
          unit="cal"
        >
          <LineChart values={calorieSeries} />
        </UpdateCard>

        <UpdateCard
          label="Sleep"
          delta={weeklyDelta(sleepSeries)}
          status={avg7(sleepSeries) >= targets.sleepHours ? "Normal" : "Low"}
          statusLow={avg7(sleepSeries) < targets.sleepHours}
          value={String(day.sleepHours ?? 0)}
          unit="hr"
        >
          <StepChart values={sleepSeries} />
        </UpdateCard>

        <UpdateCard
          label="Water"
          delta={weeklyDelta(waterSeries)}
          status={avg7(waterSeries) >= targets.waterOz * 0.8 ? "Normal" : "Low"}
          statusLow={avg7(waterSeries) < targets.waterOz * 0.8}
          value={String(day.waterOz)}
          unit="oz"
        >
          <BarsChart values={waterSeries} />
        </UpdateCard>

        <div className="hc-update-card hc-score-card">
          <div className="hc-score-head">
            <div>
              <strong>Health Improvement Score</strong>
              <div className={score >= 60 ? "hc-update-status" : "hc-update-status low"}>
                <i />
                {score >= 60 ? "Normal" : "Building"}
              </div>
            </div>
            <div className="hc-score-value">
              {score}
              <small> %</small>
            </div>
          </div>
          <p>
            This indicator reflects how many of today&apos;s targets you hit—protein, calories,
            water, steps, sleep, training, and supplements—and provides an objective daily
            adherence read.
          </p>
        </div>
      </div>

      <h2 className="hc-section-title">Log today</h2>

      <div className="hc-log-grid">
      <Card>
        <SectionHeader
          eyebrow="Next best action"
          title={activity.label}
          action={
            <StatusBadge tone={day.activityCompleted ? "good" : "neutral"}>
              {day.activityCompleted ? "Done" : "Open"}
            </StatusBadge>
          }
        />
        <p className="hc-muted hc-compact-copy">
          Keep the weekly cap at three Alpha classes and two yoga sessions. Walking supports the
          deficit without adding recovery debt.
        </p>
        <div className="hc-button-row">
          <button
            className={day.activityCompleted ? "hc-button hc-button-done" : "hc-button"}
            onClick={() =>
              patch({
                activityCompleted: !day.activityCompleted,
                // Fill in the class estimate automatically on completion.
                estimatedActivityCalories:
                  !day.activityCompleted && !day.estimatedActivityCalories
                    ? classEstimate
                    : day.estimatedActivityCalories,
              })
            }
          >
            {day.activityCompleted ? "Completed" : "Mark complete"}
          </button>
          <Field label="Class calories (estimate)">
            <input
              type="number"
              inputMode="numeric"
              value={day.estimatedActivityCalories || ""}
              placeholder={`≈ ${classEstimate}`}
              onChange={(event) =>
                patch({ estimatedActivityCalories: Number(event.target.value) || 0 })
              }
            />
          </Field>
        </div>
        {classEstimate > 0 && (
          <p className="hc-muted" style={{ marginTop: 10 }}>
            {activity.label} for {classMinutes} min at {Math.round(latestWeight)} lb burns
            roughly <strong>{classEstimate} cal</strong>.{" "}
            {day.estimatedActivityCalories !== classEstimate && (
              <button
                className="hc-text-button"
                style={{ padding: 0, color: "var(--accent)" }}
                onClick={() => patch({ estimatedActivityCalories: classEstimate })}
              >
                Use estimate
              </button>
            )}
          </p>
        )}
        <div className="hc-scan-block">
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void scanWorkoutPhoto(file);
            }}
          />
          <button
            className="hc-scan-button"
            onClick={() => scanInputRef.current?.click()}
            disabled={scanBusy}
          >
            <CameraIcon />
            {scanBusy ? "Reading your screen…" : "Scan class screen"}
          </button>
          <small>
            Snap the class display or your watch summary — calories, time, heart rate, and weights
            get logged automatically.
          </small>
          {scanError && <p className="hc-scan-error">{scanError}</p>}
        </div>
        {(day.workouts ?? []).length > 0 && (
          <div className="hc-scan-results">
            {(day.workouts ?? []).map((scan) => (
              <div key={scan.id} className="hc-scan-result">
                <div className="hc-scan-result-head">
                  <strong>{scan.activity}</strong>
                  <button className="hc-danger-link" onClick={() => removeScan(scan.id)}>
                    Remove
                  </button>
                </div>
                <span className="hc-scan-metrics">
                  {[
                    scan.durationMinutes ? `${scan.durationMinutes} min` : null,
                    scan.calories ? `${scan.calories} cal` : null,
                    scan.avgHeartRate ? `${scan.avgHeartRate} bpm avg` : null,
                    scan.maxHeartRate ? `${scan.maxHeartRate} bpm max` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {scan.exercises.length > 0 && (
                  <div className="hc-scan-chips">
                    {scan.exercises.map((exercise, index) => (
                      <span key={index}>
                        {exercise.name}
                        {exercise.weightLbs ? ` ${exercise.weightLbs} lb` : ""}
                        {exercise.sets && exercise.reps
                          ? ` ${exercise.sets}×${exercise.reps}`
                          : ""}
                      </span>
                    ))}
                  </div>
                )}
                {scan.recommendations && (
                  <ul className="hc-scan-tips">
                    {scan.recommendations.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="hc-inline-fields" style={{ marginTop: 12 }}>
          <Field label="Walking minutes">
            <input
              type="number"
              value={day.walkingMinutes || ""}
              onChange={(event) => patch({ walkingMinutes: Number(event.target.value) || 0 })}
            />
          </Field>
          <Field label="Steps">
            <input
              type="number"
              value={day.steps || ""}
              onChange={(event) => patch({ steps: Number(event.target.value) || 0 })}
            />
          </Field>
        </div>
        <div className="hc-callout">
          Estimated daily deficit: <strong>{deficit > 0 ? deficit : 0} cal</strong>
          <small>
            {engine && engine.tdee.confidence >= 0.4
              ? `Measured against your learned burn of ${engine.tdee.tdee.toLocaleString()} cal/day (from ${engine.tdee.windowDays} days of weight + intake data).`
              : "Burn estimate is still calibrating — keep logging weight and food and it learns your real metabolism."}
          </small>
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Hydration" title={`${day.waterOz} of ${targets.waterOz} oz`} />
        <p className="hc-muted hc-compact-copy">
          Each drop is 8 oz. Tap ahead to add water or tap a filled drop to roll back.
        </p>
        <div className="hc-water-row" aria-label="Water servings">
          {Array.from({ length: WATER_SERVINGS }, (_, index) => {
            const filled = index < Math.round(day.waterOz / WATER_SERVING_OZ);
            return (
              <button
                key={index}
                type="button"
                className={filled ? "hc-water-drop filled" : "hc-water-drop"}
                aria-label={`${index + 1} water servings, ${(index + 1) * WATER_SERVING_OZ} ounces`}
                aria-pressed={filled}
                onClick={() =>
                  patch({
                    waterOz:
                      (index < Math.round(day.waterOz / WATER_SERVING_OZ) ? index : index + 1) *
                      WATER_SERVING_OZ,
                  })
                }
              />
            );
          })}
        </div>
        <button className="hc-text-button" onClick={() => patch({ waterOz: 0 })}>
          Clear hydration
        </button>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Fuel"
          title="Your go-to meals"
          action={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              {day.meals.length > 0 && (
                <button className="hc-danger-link" onClick={clearMeals}>
                  Clear meals
                </button>
              )}
              <StatusBadge>{day.meals.length} entries</StatusBadge>
            </span>
          }
        />
        <div className="hc-macro-summary">
          <span><strong>{day.calories}</strong> cal</span>
          <span><strong>{day.protein}g</strong> protein</span>
          <span><strong>{day.carbs}g</strong> carbs</span>
          <span><strong>{day.fat}g</strong> fat</span>
          <span><strong>{day.fiber}g</strong> fiber</span>
        </div>
        <p className="hc-muted hc-compact-copy">
          {editingPresets
            ? "Tap any meal to edit its name, macros, category, or notes."
            : "Tap any meal to log its complete calories, protein, carbs, fat, and fiber."}
        </p>
        <div className="hc-preset-toolbar">
          <button
            className={editingPresets ? "hc-text-button active" : "hc-text-button"}
            onClick={() => {
              setEditingPresets(!editingPresets);
              setPresetDraft(null);
            }}
          >
            {editingPresets ? "Done editing" : "Edit presets"}
          </button>
          <button className="hc-text-button" onClick={startNewPreset}>
            + Add a preset
          </button>
        </div>
        {presetDraft && (
          <div className="hc-preset-editor">
            <strong>{presetDraft.id == null ? "Add a preset" : "Edit preset"}</strong>
            <Field label="Name">
              <input
                value={presetDraft.label}
                placeholder="e.g. Turkey Sandwich"
                onChange={(event) =>
                  setPresetDraft({ ...presetDraft, label: event.target.value })
                }
              />
            </Field>
            <Field label="Category">
              <select
                value={presetDraft.category}
                onChange={(event) =>
                  setPresetDraft({
                    ...presetDraft,
                    category: event.target.value as FoodPreset["category"],
                  })
                }
              >
                {FOOD_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="hc-inline-fields">
              {(
                [
                  ["cals", "Calories"],
                  ["p", "Protein (g)"],
                  ["c", "Carbs (g)"],
                  ["f", "Fat (g)"],
                  ["fiber", "Fiber (g)"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={presetDraft[key]}
                    onChange={(event) =>
                      setPresetDraft({ ...presetDraft, [key]: event.target.value })
                    }
                  />
                </Field>
              ))}
            </div>
            <Field label="Notes (optional)">
              <input
                value={presetDraft.notes}
                placeholder="e.g. Dressing on the side"
                onChange={(event) =>
                  setPresetDraft({ ...presetDraft, notes: event.target.value })
                }
              />
            </Field>
            <div className="hc-button-row">
              <button
                className="hc-button"
                onClick={savePresetDraft}
                disabled={!presetDraft.label.trim()}
              >
                Save preset
              </button>
              <button className="hc-text-button" onClick={() => setPresetDraft(null)}>
                Cancel
              </button>
              {draftIsBuiltin && draftHasOverride && (
                <button className="hc-danger-link" onClick={removePresetDraft}>
                  Reset to original
                </button>
              )}
              {presetDraft.id != null && !draftIsBuiltin && (
                <button className="hc-danger-link" onClick={removePresetDraft}>
                  Delete preset
                </button>
              )}
            </div>
          </div>
        )}
        <div className="hc-meal-catalog">
          {FOOD_CATEGORIES.map((category) => {
            const presets = mealPresets(category);
            if (presets.length === 0) return null;
            return (
              <details key={category}>
                <summary>
                  <span>{CATEGORY_LABELS[category]}</span>
                  <small>{presets.length} options</small>
                </summary>
                <div className="hc-meal-grid">
                  {presets.map((meal) => (
                    <button
                      className="hc-meal-option"
                      key={meal.id}
                      onClick={() => (editingPresets ? startEditPreset(meal) : addMeal(meal))}
                    >
                      <strong>{meal.label}</strong>
                      {meal.source && <small>{meal.source}</small>}
                      <span>
                        {meal.cals} cal · {meal.p}g P · {meal.c}g C · {meal.f}g F
                        {meal.fiber != null ? ` · ${meal.fiber}g fiber` : ""}
                      </span>
                      {meal.notes && <small>{meal.notes}</small>}
                      {editingPresets && (
                        <small className="hc-preset-tag">
                          {BUILTIN_PRESET_IDS.has(meal.id)
                            ? customPresets.some((entry) => entry.id === meal.id)
                              ? "Edited — tap to change"
                              : "Tap to edit"
                            : "Custom — tap to edit"}
                        </small>
                      )}
                    </button>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
        {day.meals.length > 0 && (
          <div className="hc-food-log">
            <div className="hc-food-log-heading">
              <strong>Today&apos;s log</strong>
              <button className="hc-danger-link" onClick={clearMeals}>Clear meals</button>
            </div>
            <div className="hc-entry-list">
              {day.meals.slice().reverse().map((meal) => (
                <div key={meal.id}>
                  <span>
                    <strong>{meal.label}</strong>
                    <small>
                      {meal.calories} cal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
                    </small>
                  </span>
                  <button className="hc-danger-link" onClick={() => removeMeal(meal.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Recovery"
          title="Sleep & readiness"
          action={
            day.sleepHours && day.sleepHours >= targets.sleepHours ? (
              <StatusBadge tone="good">On target</StatusBadge>
            ) : undefined
          }
        />
        <div className="hc-inline-fields">
          <Field label="Sleep hours">
            <input
              type="number"
              step="0.1"
              value={day.sleepHours ?? ""}
              onChange={(event) => patch({ sleepHours: Number(event.target.value) || undefined })}
            />
          </Field>
          <Field label="Energy 1–5">
            <input
              type="number"
              min="1"
              max="5"
              value={day.energy ?? ""}
              onChange={(event) => patch({ energy: Number(event.target.value) || undefined })}
            />
          </Field>
          <Field label="Soreness 1–5">
            <input
              type="number"
              min="1"
              max="5"
              value={day.soreness ?? ""}
              onChange={(event) => patch({ soreness: Number(event.target.value) || undefined })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Daily stack"
          title="Supplements"
          action={
            <StatusBadge tone={supplementsTaken === supplementList.length ? "good" : "neutral"}>
              {supplementsTaken}/{supplementList.length}
            </StatusBadge>
          }
        />
        <div className="hc-check-list">
          {supplementList.map((supplement) => (
            <button
              key={supplement.id}
              className={day.supplements[supplement.id] ? "hc-check active" : "hc-check"}
              onClick={() =>
                patch({
                  supplements: {
                    ...day.supplements,
                    [supplement.id]: !day.supplements[supplement.id],
                  },
                })
              }
            >
              <span>{day.supplements[supplement.id] ? "✓" : ""}</span>
              <div>
                <strong>{supplement.name}</strong>
                <small>{supplement.dose} · {supplement.when}</small>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Field label="Daily note">
          <textarea
            value={day.notes}
            placeholder="What affected your energy, hunger, training, or sleep?"
            onChange={(event) => patch({ notes: event.target.value })}
          />
        </Field>
        <button className="hc-danger-link" style={{ marginTop: 10 }} onClick={clearDay}>
          Clear this day
        </button>
      </Card>
      </div>
      </>
      )}
    </div>
  );
}
