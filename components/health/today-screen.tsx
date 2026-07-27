"use client";

import { useState } from "react";
import { BODYFI_PLAN, plannedActivity } from "@/lib/health/config";
import { estimatedDeficit } from "@/lib/health/projections";
import type { DailyLog } from "@/lib/health/types";
import {
  ALCOHOL_PRESETS,
  FOOD_CATEGORIES,
  FOOD_PRESETS,
  SUPPLEMENTS_DAILY,
  type FoodPreset,
} from "@/lib/health-data";
import { Card, Field, SectionHeader, StatusBadge } from "./ui";

const WATER_SERVING_OZ = 8;
const WATER_SERVINGS = BODYFI_PLAN.targets.waterOz / WATER_SERVING_OZ;

const CATEGORY_LABELS: Record<FoodPreset["category"], string> = {
  breakfast: "Breakfast",
  snack: "Snacks",
  lunch: "Lunch",
  dinner: "Dinner",
  restaurant: "Restaurant go-tos",
  quick: "Quick add-ons",
  drink: "Drinks",
  alcohol: "Alcohol",
};

/* ——— icons ——— */

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21.4s6.8-5.5 6.8-11A6.8 6.8 0 0 0 5.2 10.4c0 5.5 6.8 11 6.8 11Z" />
      <circle cx="12" cy="10.4" r="2.4" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4.2h3.4M13.6 4.2H17M7 19.8h3.4M13.6 19.8H17M8.7 4.2c0 5.2 6.6 5.2 6.6 7.8s-6.6 2.6-6.6 7.8M15.3 4.2c0 5.2-6.6 5.2-6.6 7.8s6.6 2.6 6.6 7.8" />
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
  onChange,
  onClear,
  onDateChange,
}: {
  date: string;
  day: DailyLog;
  allDays: Record<string, DailyLog>;
  archivedSupplements: string[];
  onChange: (next: DailyLog) => void;
  onClear: () => void;
  onDateChange: (next: string) => void;
}) {
  const [tab, setTab] = useState<"nutrition" | "activity">("nutrition");
  const activity = plannedActivity(date);
  const supplementList = SUPPLEMENTS_DAILY.filter(
    (item) => item.tier === 1 && !archivedSupplements.includes(item.id)
  );
  const supplementsTaken = supplementList.filter((item) => day.supplements[item.id]).length;
  const deficit = estimatedDeficit(day);
  const targets = BODYFI_PLAN.targets;

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

  const distanceKm = (day.steps * 0.000762).toFixed(1);
  const activeTime =
    day.walkingMinutes >= 60
      ? `${Math.floor(day.walkingMinutes / 60)}h ${day.walkingMinutes % 60}m`
      : `${day.walkingMinutes}m`;

  const scoreChecks = [
    day.protein >= targets.protein,
    day.calories > 0 && day.calories <= targets.calories,
    day.waterOz >= targets.waterOz,
    day.steps >= targets.steps,
    (day.sleepHours ?? 0) >= targets.sleepHours,
    day.activityCompleted,
    supplementList.length > 0 && supplementsTaken === supplementList.length,
  ];
  const score = Math.round((scoreChecks.filter(Boolean).length / scoreChecks.length) * 100);

  function patch(updates: Partial<DailyLog>) {
    onChange({ ...day, ...updates });
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

  const mealPresets = (category: FoodPreset["category"]) =>
    FOOD_PRESETS.filter((preset) => preset.category === category).concat(
      category === "alcohol" ? ALCOHOL_PRESETS : []
    );

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

      <div className="hc-pill-toggle" role="tablist" aria-label="Nutrition or activity">
        <button className={tab === "nutrition" ? "active" : ""} onClick={() => setTab("nutrition")}>
          Nutrition
        </button>
        <button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>
          Activity
        </button>
      </div>

      <div className="hc-bigstat">
        <strong>{(tab === "nutrition" ? day.calories : day.steps).toLocaleString()}</strong>
        <span>{tab === "nutrition" ? "Calories" : "Steps"}</span>
      </div>

      {tab === "nutrition" ? (
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
        </div>
      ) : (
        <div className="hc-feature-row">
          <div className="hc-feature-card">
            <span className="hc-feature-icon"><PinIcon /></span>
            <span>Distance</span>
            <strong>{distanceKm} km</strong>
          </div>
          <div className="hc-feature-card">
            <span className="hc-feature-icon"><TimerIcon /></span>
            <span>Active Time</span>
            <strong>{activeTime}</strong>
          </div>
        </div>
      )}

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
            onClick={() => patch({ activityCompleted: !day.activityCompleted })}
          >
            {day.activityCompleted ? "Completed" : "Mark complete"}
          </button>
          <Field label="Class calories (estimate)">
            <input
              type="number"
              inputMode="numeric"
              value={day.estimatedActivityCalories || ""}
              placeholder="e.g. 420"
              onChange={(event) =>
                patch({ estimatedActivityCalories: Number(event.target.value) || 0 })
              }
            />
          </Field>
        </div>
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
          <small>Maintenance and wearable burn are estimates; use your 7-day weight trend to steer.</small>
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
          action={<StatusBadge>{day.meals.length} entries</StatusBadge>}
        />
        <div className="hc-macro-summary">
          <span><strong>{day.calories}</strong> cal</span>
          <span><strong>{day.protein}g</strong> protein</span>
          <span><strong>{day.carbs}g</strong> carbs</span>
          <span><strong>{day.fat}g</strong> fat</span>
          <span><strong>{day.fiber}g</strong> fiber</span>
        </div>
        <p className="hc-muted hc-compact-copy">
          Tap any meal to log its complete calories, protein, carbs, fat, and fiber.
        </p>
        <div className="hc-meal-catalog">
          {FOOD_CATEGORIES.map((category) => {
            const presets = mealPresets(category);
            if (presets.length === 0) return null;
            return (
              <details key={category} open={["breakfast", "lunch", "dinner"].includes(category)}>
                <summary>
                  <span>{CATEGORY_LABELS[category]}</span>
                  <small>{presets.length} options</small>
                </summary>
                <div className="hc-meal-grid">
                  {presets.map((meal) => (
                    <button className="hc-meal-option" key={meal.id} onClick={() => addMeal(meal)}>
                      <strong>{meal.label}</strong>
                      {meal.source && <small>{meal.source}</small>}
                      <span>
                        {meal.cals} cal · {meal.p}g P · {meal.c}g C · {meal.f}g F
                        {meal.fiber != null ? ` · ${meal.fiber}g fiber` : ""}
                      </span>
                      {meal.notes && <small>{meal.notes}</small>}
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
    </div>
  );
}
