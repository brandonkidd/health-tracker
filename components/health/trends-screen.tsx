"use client";

import { useState } from "react";
import { BODYFI_PLAN } from "@/lib/health/config";
import { ptDateKey, shiftDateKey } from "@/lib/health/date";
import type { EngineSnapshot } from "@/lib/health/engine";
import { emptyDailyLog } from "@/lib/health/storage";
import type { DailyLog, HealthState } from "@/lib/health/types";
import { Card, CollapsibleCard, EmptyState, SectionHeader, StatusBadge } from "./ui";

const HEATMAP_ROWS = 13;

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <EmptyState>Log at least two days to see a trend.</EmptyState>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 38 - ((value - min) / range) * 32;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="hc-sparkline" viewBox="0 0 100 42" preserveAspectRatio="none" aria-label="Trend line">
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Calendar keys for the selected window: the last 7 days, or the current
 *  month up to today — so rates are measured against days that have actually
 *  happened, not a full 30-day block. */
function windowDateKeys(range: "week" | "month"): string[] {
  const today = ptDateKey();
  if (range === "week") {
    return Array.from({ length: 7 }, (_, i) => shiftDateKey(today, i - 6));
  }
  const dayOfMonth = Number(today.slice(8, 10));
  return Array.from(
    { length: dayOfMonth },
    (_, i) => `${today.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`
  );
}

function BurnHeatmap({ days }: { days: DailyLog[] }) {
  const values = days.map((day) => day.estimatedActivityCalories ?? 0);
  const max = Math.max(...values, 1);
  const hasData = values.some((value) => value > 0);

  if (!hasData) {
    return (
      <div className="hc-heatmap-empty">
        Log workouts or walking on the Today screen and your burn chart builds itself here.
      </div>
    );
  }

  const cells = values.map((value) =>
    value > 0 ? Math.max(1, Math.round((value / max) * HEATMAP_ROWS)) : 0
  );

  // Callout labels: highest, lowest logged, and most recent logged day.
  const logged = values
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value > 0);
  const maxEntry = logged.reduce((a, b) => (b.value > a.value ? b : a), logged[0]);
  const minEntry = logged.reduce((a, b) => (b.value < a.value ? b : a), logged[0]);
  const lastEntry = logged[logged.length - 1];
  const labelled = Array.from(
    new Map(
      [minEntry, maxEntry, lastEntry].map((entry) => [entry.index, entry])
    ).values()
  );

  const columnWidthPct = 100 / values.length;

  return (
    <div className="hc-heatmap-wrap">
      {labelled.map((entry) => {
        const weekday = new Date(`${days[entry.index].date}T12:00:00`).toLocaleDateString(
          undefined,
          { weekday: "short" }
        );
        const heightPct = (cells[entry.index] / HEATMAP_ROWS) * 100;
        const leftPct = Math.min(84, Math.max(14, (entry.index + 0.5) * columnWidthPct));
        return (
          <div
            key={entry.index}
            className="hc-heatmap-label"
            style={{ left: `${leftPct}%`, bottom: `calc(${heightPct}% + 12px)` }}
          >
            {weekday}: {entry.value.toLocaleString()}
          </div>
        );
      })}
      <div className="hc-heatmap" aria-label="Daily calories burned chart">
        {cells.map((count, column) => (
          <div className="hc-heatmap-col" key={column}>
            {Array.from({ length: Math.max(count, 1) }, (_, row) => (
              <span
                key={row}
                className="hc-heatmap-cell"
                style={{
                  opacity:
                    count === 0
                      ? 0.1
                      : 0.14 + (row / HEATMAP_ROWS) * 0.86 * (values[column] / max),
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendsScreen({
  state,
  engine,
}: {
  state: HealthState;
  engine: EngineSnapshot | null;
}) {
  const [range, setRange] = useState<"week" | "month">("week");
  const windowKeys = windowDateKeys(range);
  const heatmap = windowKeys.map((key) => state.days[key] ?? emptyDailyLog(key));
  const days = windowKeys.flatMap((key) => (state.days[key] ? [state.days[key]] : []));
  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  // Every weigh-in source (daily scale, weekly check-in, InBody scan) via the
  // engine's trend series; raw daily logs as the fallback.
  const weights = engine
    ? engine.trendSeries
        .filter((point) => point.date >= windowKeys[0] && point.date <= windowKeys[windowKeys.length - 1])
        .map((point) => point.weight)
    : days.flatMap((day) => (day.weight ? [day.weight] : []));
  const sleep = days.flatMap((day) => (day.sleepHours ? [day.sleepHours] : []));
  const burnDays = days.filter((day) => day.estimatedActivityCalories > 0);
  const averageBurn = average(burnDays.map((day) => day.estimatedActivityCalories));
  const averageProtein = average(days.map((day) => day.protein));
  // Rates are out of calendar days elapsed in the window, not logged days.
  const trainingRate =
    (days.filter((day) => day.activityCompleted).length / windowKeys.length) * 100;

  return (
    <div className="hc-stack">
      <div className="hc-pill-toggle" role="tablist" aria-label="Stats range">
        <button className={range === "month" ? "active" : ""} onClick={() => setRange("month")}>
          Month
        </button>
        <button className={range === "week" ? "active" : ""} onClick={() => setRange("week")}>
          Week
        </button>
      </div>

      <div className="hc-bigstat">
        <strong>{Math.round(averageBurn).toLocaleString()}</strong>
        <span>Calories burned</span>
      </div>

      <BurnHeatmap days={heatmap} />

      <h2 className="hc-section-title">Averages</h2>

      <div className="hc-status-rail">
        <Card>
          <span>Avg protein</span>
          <strong>
            {Math.round(averageProtein)}
            <small> g</small>
          </strong>
        </Card>
        <Card>
          <span>Training consistency</span>
          <strong>
            {Math.round(trainingRate)}
            <small> %</small>
          </strong>
        </Card>
        <Card>
          <span>Days logged</span>
          <strong>
            {days.length}
            <small> / {windowKeys.length}</small>
          </strong>
        </Card>
        <Card>
          <span>Avg sleep</span>
          <strong>
            {sleep.length ? average(sleep).toFixed(1) : "—"}
            <small> hr</small>
          </strong>
        </Card>
      </div>

      <div className="hc-two-col">
        <Card>
          <SectionHeader
            eyebrow="Scale"
            title="Weight"
            action={weights.length ? <StatusBadge>{weights[weights.length - 1]} lb latest</StatusBadge> : undefined}
          />
          <Sparkline values={weights} />
          <p className="hc-muted">Use the direction of the 7-day average, not a single weigh-in.</p>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Recovery"
            title="Sleep"
            action={sleep.length ? <StatusBadge>{average(sleep).toFixed(1)} hr avg</StatusBadge> : undefined}
          />
          <Sparkline values={sleep} />
          <p className="hc-muted">
            Target {BODYFI_PLAN.targets.sleepHours}–8 hours for recovery and appetite control.
          </p>
        </Card>
      </div>

      <CollapsibleCard
        eyebrow="What your data connects"
        title="Your patterns"
        defaultOpen
        action={
          engine?.correlations.findings.length ? (
            <StatusBadge tone="good">
              {engine.correlations.findings.length} found
            </StatusBadge>
          ) : undefined
        }
      >
        {engine && engine.correlations.findings.length > 0 ? (
          <div className="hc-pattern-list">
            {engine.correlations.findings.map((finding) => (
              <div key={finding.id} className="hc-pattern-row">
                <div className="hc-pattern-head">
                  <strong>{finding.title}</strong>
                  <span className={`hc-pattern-strength ${finding.strength}`}>
                    {finding.strength} · r {finding.r > 0 ? "+" : ""}
                    {finding.r} · {finding.n} days
                  </span>
                </div>
                <p>{finding.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>
            The engine checks sleep, steps, alcohol, training, and eating against each other
            every day. Once a pattern clears the statistical bar (8+ days of paired data), it
            shows up here in plain language.
          </EmptyState>
        )}
      </CollapsibleCard>

      <Card>
        <SectionHeader eyebrow="Daily history" title="Recent scorecard" />
        {days.length ? (
          <div className="hc-history">
            {days.slice().reverse().map((day) => (
              <div key={day.date}>
                <strong>
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </strong>
                <span>{day.weight ? `${day.weight} lb` : "No weight"}</span>
                <span>{day.protein}g protein</span>
                <span>{day.steps.toLocaleString()} steps</span>
                <StatusBadge tone={day.activityCompleted ? "good" : "neutral"}>
                  {day.activityCompleted ? "Moved" : "Open"}
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Your history will build automatically as you log each day.</EmptyState>
        )}
      </Card>
    </div>
  );
}
