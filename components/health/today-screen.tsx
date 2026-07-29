"use client";

import { useMemo, useRef, useState } from "react";
import {
  ACTIVITY_DEFAULT_MINUTES,
  BODYFI_PLAN,
  estimateActivityCalories,
  plannedActivity,
} from "@/lib/health/config";
import { ptDateKey, shiftDateKey } from "@/lib/health/date";
import { estimatedDeficit } from "@/lib/health/projections";
import { latestTrendPoint } from "@/lib/health/engine";
import type { EngineSnapshot } from "@/lib/health/engine";
import type { InsightStatus } from "@/hooks/use-health-state";
import type { DailyInsight, DailyLog, MealEntry, WorkoutScan } from "@/lib/health/types";
import {
  ALCOHOL_PRESETS,
  FOOD_CATEGORIES,
  FOOD_PRESETS,
  SUPPLEMENTS_DAILY,
  type FoodPreset,
} from "@/lib/health-data";
import { CoachCard } from "./coach-card";
import { CollapsibleCard, Field, StatusBadge } from "./ui";

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

/** Form draft for editing a logged workout; numbers stay strings while typing. */
interface ScanDraft {
  id: string;
  activity: string;
  durationMinutes: string;
  exercises: { name: string; weightLbs: string; sets: string; reps: string }[];
}

/** Empty input → undefined; otherwise the parsed number (0 counts as empty). */
function draftNumber(value: string): number | undefined {
  const parsed = Number(value.trim());
  return value.trim() === "" || !Number.isFinite(parsed) || parsed <= 0 ? undefined : parsed;
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

function FoodIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2.9v6.3a2 2 0 0 0 2 2h3.4a2 2 0 0 0 2-2V2.9" />
      <path d="M7.7 2.9V21" />
      <path d="M20.3 15.2V2.9a4.6 4.6 0 0 0-4.6 4.6v5.7a2 2 0 0 0 2 2h2.6Zm0 0V21" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6.3 6.3 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3.3a2.6 2.6 0 1 1 3.7 3.7L7.6 20.1 2.5 21.5l1.4-5.1Z" />
      <path d="m14.9 5.4 3.7 3.7" />
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

type DescribeResponse = Omit<ScanResponse, "isWorkoutScreen"> & { isWorkout: boolean };

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

/**
 * Health Improvement Score: weighted daily adherence with partial credit.
 * Weights reflect what moves body-recomp results most — calories 30%,
 * protein 20%, training 20%, sleep 15%, steps/water/supplements 5% each.
 */
function dayScore(day: DailyLog, targets: Targets, supplementList: { id: string }[]): number {
  const ratio = (value: number, target: number) => (target > 0 ? Math.min(1, value / target) : 0);

  // Full credit for logging at/under target; overage decays to zero at +25%.
  const calorieCredit =
    day.calories <= 0
      ? 0
      : day.calories <= targets.calories
        ? 1
        : Math.max(0, 1 - (day.calories - targets.calories) / (targets.calories * 0.25));

  const supplementCredit =
    supplementList.length > 0
      ? supplementList.filter((item) => day.supplements[item.id]).length / supplementList.length
      : 0;

  const parts: [weight: number, credit: number][] = [
    [30, calorieCredit],
    [20, ratio(day.protein, targets.protein)],
    [20, day.activityCompleted ? 1 : 0],
    [15, ratio(day.sleepHours ?? 0, targets.sleepHours)],
    [5, ratio(day.steps, targets.steps)],
    [5, ratio(day.waterOz, targets.waterOz)],
    [5, supplementCredit],
  ];
  return Math.round(parts.reduce((sum, [weight, credit]) => sum + weight * credit, 0));
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
  const [metric, setMetric] = useState<"score" | "deficit" | "weight">("score");
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
      deficit: entry && entry.calories > 0 ? estimatedDeficit(entry) : null,
      weight: entry?.weight ?? null,
      future: key > today,
    };
  });
  const workoutCount = cells.filter((cell) => cell.worked).length;

  // Month-wide weight range so tiles can shade toward the lighter end.
  const monthWeights = cells
    .map((cell) => cell.weight)
    .filter((weight): weight is number => weight != null);
  const minWeight = Math.min(...monthWeights);
  const maxWeight = Math.max(...monthWeights);

  function cellValue(cell: (typeof cells)[number]): number | null {
    if (metric === "score") return cell.score;
    if (metric === "deficit") return cell.deficit;
    return cell.weight;
  }

  function cellLabel(cell: (typeof cells)[number]): string {
    const value = cellValue(cell);
    if (value == null) return "\u00A0";
    if (metric === "score") return `${value}%`;
    if (metric === "deficit") return `${value >= 0 ? "−" : "+"}${Math.abs(Math.round(value))}`;
    return `${value}`;
  }

  /** 0..1 intensity of the tile fill for the active metric. */
  function cellHeat(cell: (typeof cells)[number]): number | null {
    const value = cellValue(cell);
    if (value == null) return null;
    if (metric === "score") return value / 100;
    if (metric === "deficit") return Math.max(0, Math.min(1, value / 750));
    if (maxWeight === minWeight) return 0.5;
    return 1 - (value - minWeight) / (maxWeight - minWeight);
  }

  const scaleEnds: Record<typeof metric, [string, string]> = {
    score: ["Less", "More"],
    deficit: ["Surplus", "Deficit"],
    weight: ["Heavier", "Lighter"],
  };

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
      <div className="hc-month-metric" role="tablist" aria-label="Metric shown on the calendar">
        {(
          [
            ["score", "Score"],
            ["deficit", "Deficit"],
            ["weight", "Weight"],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            className={metric === key ? "active" : ""}
            onClick={() => setMetric(key)}
          >
            {text}
          </button>
        ))}
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
          const intensity = cellHeat(cell);
          const alpha = intensity != null ? 0.12 + 0.88 * intensity : 0;
          const hot = intensity != null && alpha >= 0.6;
          return (
            <button
              key={cell.key}
              type="button"
              className={[
                "hc-month-cell",
                intensity != null ? "logged" : "",
                hot ? "hot" : "",
                cell.key === selectedDate ? "selected" : "",
                cell.key === today ? "today" : "",
                cell.future ? "future" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                intensity != null
                  ? { background: `rgba(246, 104, 62, ${alpha.toFixed(2)})` }
                  : undefined
              }
              aria-label={[
                cell.key,
                cell.score != null ? `health score ${cell.score}%` : "no data",
                cell.deficit != null
                  ? `${cell.deficit >= 0 ? "deficit" : "surplus"} ${Math.abs(Math.round(cell.deficit))} calories`
                  : "",
                cell.weight != null ? `weight ${cell.weight} pounds` : "",
                cell.worked ? "worked out" : "",
              ]
                .filter(Boolean)
                .join(", ")}
              onClick={() => onSelectDate(cell.key)}
            >
              <span className="hc-month-num">{cell.num}</span>
              <strong>{cellLabel(cell)}</strong>
              {cell.worked && <i className="hc-month-flag" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="hc-month-legend">
        <span className="hc-month-scale">
          {scaleEnds[metric][0]}
          <i style={{ opacity: 0.15 }} />
          <i style={{ opacity: 0.4 }} />
          <i style={{ opacity: 0.65 }} />
          <i style={{ opacity: 1 }} />
          {scaleEnds[metric][1]}
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
  for (let i = 0; i < length; i++) {
    const key = shiftDateKey(date, -i);
    const day = allDays[key];
    values.unshift(day ? pick(day) : 0);
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
  const [tab, setTab] = useState<"daily" | "net" | "month">("daily");
  const [editingPresets, setEditingPresets] = useState(false);
  const [presetDraft, setPresetDraft] = useState<PresetDraft | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanDraft, setScanDraft] = useState<ScanDraft | null>(null);
  const [describeOpen, setDescribeOpen] = useState(false);
  const [describeText, setDescribeText] = useState("");
  const [describeBusy, setDescribeBusy] = useState(false);
  const [foodAiOpen, setFoodAiOpen] = useState(false);
  const [foodAiText, setFoodAiText] = useState("");
  const [foodAiBusy, setFoodAiBusy] = useState(false);
  const [foodAiError, setFoodAiError] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const activity = plannedActivity(date);
  const supplementList = SUPPLEMENTS_DAILY.filter(
    (item) => item.tier === 1 && !archivedSupplements.includes(item.id)
  );
  const supplementsTaken = supplementList.filter((item) => day.supplements[item.id]).length;
  // Adaptive: deficit against the learned TDEE; static estimate as fallback.
  const deficit = engine ? engine.tdee.tdee - day.calories : estimatedDeficit(day);
  const targets = engine?.targets ?? BODYFI_PLAN.targets;

  // Net tab: body burn (learned TDEE already includes average daily movement)
  // plus logged exercise, minus everything eaten.
  const baseBurn = engine ? engine.tdee.tdee : 2600;
  const netBurned = baseBurn + day.estimatedActivityCalories - day.calories;
  const plannedDeficit = Math.max(0, baseBurn - targets.calories);
  // Exercise earns back budget: eating this much more still lands the deficit.
  const remainingToEat = targets.calories + day.estimatedActivityCalories - day.calories;

  const today = ptDateKey();

  const dayStrip = Array.from({ length: 5 }, (_, index) => {
    const key = shiftDateKey(date, index - 2);
    const cursor = new Date(`${key}T12:00:00`);
    return {
      key,
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

  // Latest known weight for calorie estimates: the engine's trend series
  // (daily weigh-ins + body scans + weekly check-ins), else raw daily logs,
  // else the plan baseline.
  const latestWeight = (() => {
    const point = engine ? latestTrendPoint(engine.trendSeries, date) : null;
    if (point) return point.weight;
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

  /** Opens the collapsed log card (if needed) and scrolls it into view. */
  function jumpToSection(id: string) {
    const section = document.getElementById(id);
    if (!section) return;
    if (section instanceof HTMLDetailsElement) section.open = true;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (scanDraft?.id === id) setScanDraft(null);
    patch({ workouts: (day.workouts ?? []).filter((scan) => scan.id !== id) });
  }

  function startEditScan(scan: WorkoutScan) {
    setScanDraft({
      id: scan.id,
      activity: scan.activity,
      durationMinutes: scan.durationMinutes != null ? String(scan.durationMinutes) : "",
      exercises: scan.exercises.map((exercise) => ({
        name: exercise.name,
        weightLbs: exercise.weightLbs != null ? String(exercise.weightLbs) : "",
        sets: exercise.sets != null ? String(exercise.sets) : "",
        reps: exercise.reps != null ? String(exercise.reps) : "",
      })),
    });
  }

  function patchScanDraftExercise(index: number, updates: Partial<ScanDraft["exercises"][number]>) {
    if (!scanDraft) return;
    setScanDraft({
      ...scanDraft,
      exercises: scanDraft.exercises.map((exercise, i) =>
        i === index ? { ...exercise, ...updates } : exercise
      ),
    });
  }

  function saveScanDraft() {
    if (!scanDraft) return;
    patch({
      workouts: (day.workouts ?? []).map((scan) =>
        scan.id !== scanDraft.id
          ? scan
          : {
              ...scan,
              activity: scanDraft.activity.trim() || scan.activity,
              durationMinutes: draftNumber(scanDraft.durationMinutes),
              exercises: scanDraft.exercises
                .filter((exercise) => exercise.name.trim())
                .map((exercise) => ({
                  name: exercise.name.trim(),
                  weightLbs: draftNumber(exercise.weightLbs),
                  sets: draftNumber(exercise.sets),
                  reps: draftNumber(exercise.reps),
                })),
            }
      ),
    });
    setScanDraft(null);
  }

  async function logDescribedWorkout() {
    const description = describeText.trim();
    if (!description) return;
    setDescribeBusy(true);
    setScanError(null);
    try {
      const response = await fetch("/api/log-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          weightLb: latestWeight,
          plannedActivity: activity.label,
          history: strengthHistory(allDays, date),
        }),
      });
      const result = (await response.json()) as DescribeResponse;
      if (!response.ok) throw new Error(result.error ?? "Couldn't log that workout — try again.");
      if (!result.isWorkout) {
        throw new Error("That doesn't sound like a workout. Describe what you did, e.g. '30 min spin class'.");
      }

      const scan: WorkoutScan = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        activity: result.activity || "Workout",
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

      // Added workouts stack on top of the class estimate instead of replacing it.
      patch({
        workouts: [...(day.workouts ?? []), scan],
        activityCompleted: true,
        estimatedActivityCalories:
          day.estimatedActivityCalories + Math.round(result.calories ?? 0),
      });
      setDescribeText("");
      setDescribeOpen(false);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Couldn't log that workout — try again.");
    } finally {
      setDescribeBusy(false);
    }
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

  async function logDescribedMeal() {
    const description = foodAiText.trim();
    if (!description) return;
    setFoodAiBusy(true);
    setFoodAiError(null);
    try {
      const response = await fetch("/api/log-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          timeOfDay: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        }),
      });
      const result = (await response.json()) as {
        isFood: boolean;
        label: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number | null;
        category: FoodPreset["category"];
        notes: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Couldn't log that meal — try again.");
      if (!result.isFood) {
        throw new Error("That doesn't sound like food. Describe what you ate, e.g. 'chicken burrito bowl'.");
      }

      const entry: MealEntry = {
        id: `ai-${crypto.randomUUID()}`,
        label: result.label,
        calories: Math.round(result.calories),
        protein: Math.round(result.protein),
        carbs: Math.round(result.carbs),
        fat: Math.round(result.fat),
        fiber: result.fiber != null ? Math.round(result.fiber) : undefined,
        at: new Date().toISOString(),
        category: result.category,
      };
      patch({
        meals: [...day.meals, entry],
        calories: day.calories + entry.calories,
        protein: day.protein + entry.protein,
        carbs: day.carbs + entry.carbs,
        fat: day.fat + entry.fat,
        fiber: day.fiber + (entry.fiber ?? 0),
      });
      setFoodAiText("");
      setFoodAiOpen(false);
    } catch (error) {
      setFoodAiError(error instanceof Error ? error.message : "Couldn't log that meal — try again.");
    } finally {
      setFoodAiBusy(false);
    }
  }

  /** Rough category from the entry's logged time, for favorites missing an AI category. */
  function inferMealCategory(at: string): FoodPreset["category"] {
    const hour = new Date(at).getHours();
    if (hour < 11) return "breakfast";
    if (hour < 15) return "lunch";
    if (hour < 17) return "snack";
    if (hour < 22) return "dinner";
    return "snack";
  }

  function favoriteMeal(meal: MealEntry) {
    const preset: FoodPreset = {
      id: `custom-${crypto.randomUUID()}`,
      label: meal.label,
      say: meal.label.toLowerCase(),
      category: meal.category ?? inferMealCategory(meal.at),
      cals: meal.calories,
      p: meal.protein,
      c: meal.carbs,
      f: meal.fat,
      fiber: meal.fiber,
    };
    onUpdatePresets([...customPresets, preset]);
  }

  /** Removes user-added presets matching this meal's label (built-ins and their edits stay). */
  function unfavoriteMeal(meal: MealEntry) {
    onUpdatePresets(
      customPresets.filter(
        (preset) =>
          BUILTIN_PRESET_IDS.has(preset.id) ||
          preset.label.toLowerCase() !== meal.label.toLowerCase()
      )
    );
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

  const presetLabelSet = useMemo(
    () => new Set(allPresets.map((preset) => preset.label.toLowerCase())),
    [allPresets]
  );

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

      <div className="hc-pill-toggle" role="tablist" aria-label="Daily, net calories, or month">
        <button className={tab === "daily" ? "active" : ""} onClick={() => setTab("daily")}>
          Daily
        </button>
        <button className={tab === "net" ? "active" : ""} onClick={() => setTab("net")}>
          Net
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
      ) : tab === "net" ? (
        <>
          <div className="hc-bigstat">
            <strong>
              {netBurned < 0 ? "−" : ""}
              {Math.abs(netBurned).toLocaleString()}
            </strong>
            <span>{netBurned < 0 ? "Net calories over burn" : "Net calories burned"}</span>
          </div>

          <div className="hc-net-card">
            <div className="hc-net-rows">
              <div>
                <span>
                  Your daily burn
                  <small>
                    {engine && engine.tdee.confidence >= 0.4
                      ? "body + everyday movement, learned from your data"
                      : "body + everyday movement, estimate"}
                  </small>
                </span>
                <strong>+{baseBurn.toLocaleString()}</strong>
              </div>
              <div>
                <span>
                  Exercise logged
                  <small>classes, workouts, and walks you tracked today</small>
                </span>
                <strong>+{day.estimatedActivityCalories.toLocaleString()}</strong>
              </div>
              <div>
                <span>
                  Food eaten
                  <small>{day.meals.length} {day.meals.length === 1 ? "entry" : "entries"} logged</small>
                </span>
                <strong>−{day.calories.toLocaleString()}</strong>
              </div>
              <div className="hc-net-total">
                <span>Net so far today</span>
                <strong>
                  {netBurned < 0 ? "−" : ""}
                  {Math.abs(netBurned).toLocaleString()} cal
                </strong>
              </div>
            </div>

            <div className="hc-callout">
              {remainingToEat >= 0 ? (
                <span>
                  You can eat <strong>{remainingToEat.toLocaleString()} more cal</strong> today
                  and still hit your {plannedDeficit.toLocaleString()} cal daily deficit.
                </span>
              ) : (
                <span>
                  You&apos;re <strong>{Math.abs(remainingToEat).toLocaleString()} cal over</strong>{" "}
                  today&apos;s budget. A walk or a lighter dinner protects the deficit.
                </span>
              )}
              <small>
                Target: {targets.calories.toLocaleString()} cal eaten, plus anything you burn
                with exercise.
              </small>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="hc-bigstat">
            <strong>{day.calories.toLocaleString()}</strong>
            <span>Calories</span>
          </div>

          <div className="hc-feature-row">
            <button
              type="button"
              className="hc-feature-card"
              onClick={() => jumpToSection("log-meals")}
            >
              <span className="hc-feature-icon"><FoodIcon /></span>
              <span>Protein</span>
              <strong>{day.protein} g</strong>
            </button>
            <button
              type="button"
              className="hc-feature-card"
              onClick={() => jumpToSection("log-hydration")}
            >
              <span className="hc-feature-icon"><DropIcon /></span>
              <span>Water</span>
              <strong>{day.waterOz} oz</strong>
            </button>
            <button
              type="button"
              className="hc-feature-card"
              onClick={() => jumpToSection("log-activity")}
            >
              <span className="hc-feature-icon"><StepsIcon /></span>
              <span>Steps</span>
              <strong>{day.steps.toLocaleString()}</strong>
            </button>
            <button
              type="button"
              className="hc-feature-card"
              onClick={() => jumpToSection("log-activity")}
            >
              <span className="hc-feature-icon"><FlameIcon /></span>
              <span>Burned</span>
              <strong>{day.estimatedActivityCalories.toLocaleString()} cal</strong>
            </button>
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
          status={
            day.protein >= targets.protein
              ? "Excellent"
              : day.protein >= targets.protein * 0.9
                ? "Great"
                : "Low"
          }
          statusLow={day.protein < targets.protein * 0.9}
          value={String(day.protein)}
          unit="g"
        >
          <DotColumnsChart values={proteinSeries} />
        </UpdateCard>

        <UpdateCard
          label="Calories"
          delta={weeklyDelta(calorieSeries)}
          status={day.calories <= targets.calories * 1.05 ? "On plan" : "High"}
          statusLow={day.calories > targets.calories * 1.05}
          value={day.calories.toLocaleString()}
          unit="cal"
        >
          <LineChart values={calorieSeries} />
        </UpdateCard>

        <UpdateCard
          label="Sleep"
          delta={weeklyDelta(sleepSeries)}
          status={(day.sleepHours ?? 0) >= targets.sleepHours * 0.9 ? "Normal" : "Low"}
          statusLow={(day.sleepHours ?? 0) < targets.sleepHours * 0.9}
          value={String(day.sleepHours ?? 0)}
          unit="hr"
        >
          <StepChart values={sleepSeries} />
        </UpdateCard>

        <UpdateCard
          label="Water"
          delta={weeklyDelta(waterSeries)}
          status={day.waterOz >= targets.waterOz * 0.8 ? "Normal" : "Low"}
          statusLow={day.waterOz < targets.waterOz * 0.8}
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
            Weighted by what moves results most — calories 30%, protein 20%, training 20%,
            sleep 15%, then steps, water, and supplements at 5% each — with partial credit
            inside every category, so a near-miss still counts.
          </p>
        </div>
      </div>

      <h2 className="hc-section-title">Log today</h2>

      <div className="hc-log-grid">
      <CollapsibleCard
        id="log-activity"
        eyebrow="Next best action"
        title={activity.label}
        icon={<DumbbellIcon />}
        action={
          <StatusBadge tone={day.activityCompleted ? "good" : "neutral"}>
            {day.activityCompleted ? "Done" : "Open"}
          </StatusBadge>
        }
      >
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
            disabled={scanBusy || describeBusy}
          >
            <CameraIcon />
            {scanBusy ? "Reading your screen…" : "Scan class screen"}
          </button>
          <small>
            Snap the class display or your watch summary — calories, time, heart rate, and weights
            get logged automatically.
          </small>
          {!describeOpen ? (
            <button
              className="hc-text-button hc-describe-toggle"
              onClick={() => setDescribeOpen(true)}
              disabled={scanBusy || describeBusy}
            >
              No screen to scan? Describe the workout instead
            </button>
          ) : (
            <div className="hc-describe-form">
              <textarea
                className="hc-describe-input"
                rows={2}
                placeholder="e.g. 45 min spin class, pushed hard — or leg day: goblet squats 3×10 at 50 lb"
                value={describeText}
                autoFocus
                onChange={(event) => setDescribeText(event.target.value)}
              />
              <div className="hc-button-row">
                <button
                  className="hc-button"
                  onClick={() => void logDescribedWorkout()}
                  disabled={describeBusy || !describeText.trim()}
                >
                  {describeBusy ? "Estimating…" : "Log with AI"}
                </button>
                <button
                  className="hc-text-button"
                  onClick={() => {
                    setDescribeOpen(false);
                    setDescribeText("");
                  }}
                  disabled={describeBusy}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
      </CollapsibleCard>

      <CollapsibleCard
        id="log-hydration"
        eyebrow="Hydration"
        title={`${day.waterOz} of ${targets.waterOz} oz`}
        icon={<DropIcon />}
      >
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
      </CollapsibleCard>

      <CollapsibleCard
        id="log-meals"
        eyebrow="Fuel"
        title="Your go-to meals"
        icon={<FoodIcon />}
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
      >
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
          <button
            className={foodAiOpen ? "hc-text-button active" : "hc-text-button"}
            onClick={() => {
              setFoodAiOpen(!foodAiOpen);
              setFoodAiError(null);
            }}
          >
            Describe it — AI logs the macros
          </button>
        </div>
        {foodAiOpen && (
          <div className="hc-describe-form hc-food-ai-form">
            <textarea
              className="hc-describe-input"
              rows={2}
              placeholder="e.g. chipotle chicken bowl with brown rice, no cheese — or 2 eggs and sourdough toast with butter"
              value={foodAiText}
              autoFocus
              onChange={(event) => setFoodAiText(event.target.value)}
            />
            <div className="hc-button-row">
              <button
                className="hc-button"
                onClick={() => void logDescribedMeal()}
                disabled={foodAiBusy || !foodAiText.trim()}
              >
                {foodAiBusy ? "Estimating…" : "Log with AI"}
              </button>
              <button
                className="hc-text-button"
                onClick={() => {
                  setFoodAiOpen(false);
                  setFoodAiText("");
                  setFoodAiError(null);
                }}
                disabled={foodAiBusy}
              >
                Cancel
              </button>
            </div>
            {foodAiError && <p className="hc-scan-error">{foodAiError}</p>}
          </div>
        )}
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
      </CollapsibleCard>

      <CollapsibleCard
        eyebrow="Recovery"
        title="Sleep & readiness"
        icon={<MoonIcon />}
        action={
          day.sleepHours && day.sleepHours >= targets.sleepHours ? (
            <StatusBadge tone="good">On target</StatusBadge>
          ) : undefined
        }
      >
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
      </CollapsibleCard>

      <CollapsibleCard
        eyebrow="Daily stack"
        title="Supplements"
        icon={<PillIcon />}
        action={
          <StatusBadge tone={supplementsTaken === supplementList.length ? "good" : "neutral"}>
            {supplementsTaken}/{supplementList.length}
          </StatusBadge>
        }
      >
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
      </CollapsibleCard>

      <CollapsibleCard eyebrow="Journal" title="Daily note" icon={<PencilIcon />}>
        <Field label="Note">
          <textarea
            value={day.notes}
            placeholder="What affected your energy, hunger, training, or sleep?"
            onChange={(event) => patch({ notes: event.target.value })}
          />
        </Field>
        <button className="hc-danger-link" style={{ marginTop: 10 }} onClick={clearDay}>
          Clear this day
        </button>
      </CollapsibleCard>

      {day.meals.length > 0 && (
        <CollapsibleCard
          className="hc-food-log-card"
          eyebrow="Fuel"
          title={`Today's log (${day.meals.length})`}
          icon={<FoodIcon />}
          action={
            <button className="hc-danger-link" onClick={clearMeals}>
              Clear meals
            </button>
          }
        >
          <div className="hc-food-log">
            <div className="hc-entry-list">
              {day.meals.slice().reverse().map((meal) => {
                const savedCustom = customPresets.some(
                  (preset) =>
                    !BUILTIN_PRESET_IDS.has(preset.id) &&
                    preset.label.toLowerCase() === meal.label.toLowerCase()
                );
                const saved = savedCustom || presetLabelSet.has(meal.label.toLowerCase());
                return (
                  <div key={meal.id}>
                    <span>
                      <strong>{meal.label}</strong>
                      <small>
                        {meal.calories} cal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
                      </small>
                    </span>
                    <span className="hc-entry-actions">
                      {savedCustom ? (
                        <button
                          className="hc-fav-button hc-fav-saved"
                          aria-label={`Remove ${meal.label} from your presets`}
                          title="Tap to remove from presets"
                          onClick={() => unfavoriteMeal(meal)}
                        >
                          ★
                        </button>
                      ) : saved ? (
                        <span className="hc-fav-saved" title="Built-in preset">★</span>
                      ) : (
                        <button
                          className="hc-fav-button"
                          aria-label={`Save ${meal.label} as a preset`}
                          onClick={() => favoriteMeal(meal)}
                        >
                          ☆ Save
                        </button>
                      )}
                      <button className="hc-danger-link" onClick={() => removeMeal(meal.id)}>Remove</button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleCard>
      )}
      </div>
      </>
      )}
    </div>
  );
}
