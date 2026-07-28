"use client";

import { useEffect, useState } from "react";
import type { EngineSnapshot } from "@/lib/health/engine";
import type { InsightStatus } from "@/hooks/use-health-state";
import type { DailyInsight } from "@/lib/health/types";
import { StatusBadge } from "./ui";

const COACH_OPEN_KEY = "hc-coach-open";

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return "learned from your data";
  if (confidence >= 0.4) return "calibrating";
  return "estimate — keep logging";
}

function formatEta(forecast: NonNullable<EngineSnapshot["forecast"]>): string | null {
  if (forecast.etaWeeks == null || forecast.etaDate == null) return null;
  if (forecast.etaWeeks === 0) return "Goal reached";
  const date = new Date(`${forecast.etaDate}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${forecast.goalWeight} lb around ${date}`;
}

export function CoachCard({
  engine,
  insight,
  status,
  todayCalories,
  onRefresh,
}: {
  engine: EngineSnapshot | null;
  insight: DailyInsight | null;
  status: InsightStatus;
  todayCalories: number;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(true);

  // Restore the last open/collapsed choice after mount (localStorage isn't
  // available during server render).
  useEffect(() => {
    setOpen(window.localStorage.getItem(COACH_OPEN_KEY) !== "0");
  }, []);

  if (!engine) return null;

  const { tdee, targets, forecast } = engine;
  const deficit = tdee.tdee - todayCalories;
  const eta = forecast ? formatEta(forecast) : null;

  const chips: { label: string; value: string; hint?: string }[] = [
    {
      label: "Your burn (TDEE)",
      value: `${tdee.tdee.toLocaleString()} cal`,
      hint: confidenceLabel(tdee.confidence),
    },
    {
      label: "Today's target",
      value: `${targets.calories.toLocaleString()} cal`,
      hint:
        targets.deltaFromPlan === 0
          ? "matches plan"
          : `${targets.deltaFromPlan > 0 ? "+" : ""}${targets.deltaFromPlan} vs plan`,
    },
    {
      label: "Balance today",
      value: `${deficit >= 0 ? "−" : "+"}${Math.abs(deficit).toLocaleString()} cal`,
      hint: deficit >= 0 ? "deficit so far" : "over your burn",
    },
  ];
  if (engine.trendWeight != null) {
    chips.push({
      label: "Trend weight",
      value: `${engine.trendWeight} lb`,
      hint:
        forecast?.observedRatePerWeek != null
          ? `${forecast.observedRatePerWeek > 0 ? "+" : ""}${forecast.observedRatePerWeek} lb/wk`
          : undefined,
    });
  }
  if (eta) {
    chips.push({ label: "On pace for", value: eta });
  }

  return (
    <details
      className="hc-card hc-collapsible hc-coach-card"
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        setOpen(next);
        window.localStorage.setItem(COACH_OPEN_KEY, next ? "1" : "0");
      }}
    >
      <summary>
        <div className="hc-section-header">
          <div>
            <div className="hc-eyebrow">Adaptive coach</div>
            <h2>{insight?.headline ?? "Reading your trajectory"}</h2>
          </div>
          {status === "loading" ? (
            <StatusBadge>Analyzing…</StatusBadge>
          ) : (
            <span
              className="hc-collapsible-action"
              onClick={(event) => {
                // Refresh shouldn't toggle the card.
                event.preventDefault();
              }}
            >
              <button className="hc-text-button" onClick={onRefresh}>
                Refresh
              </button>
            </span>
          )}
          <span className="hc-collapse-chevron" aria-hidden="true">
            ›
          </span>
        </div>
      </summary>

      <div className="hc-coach-inner">
      <div className="hc-coach-chips">
        {chips.map((chip) => (
          <div key={chip.label} className="hc-coach-chip">
            <span>{chip.label}</span>
            <strong>{chip.value}</strong>
            {chip.hint && <small>{chip.hint}</small>}
          </div>
        ))}
      </div>

      {status === "error" && (
        <p className="hc-scan-error">
          Couldn&apos;t generate today&apos;s analysis.{" "}
          <button className="hc-text-button" style={{ padding: 0 }} onClick={onRefresh}>
            Try again
          </button>
        </p>
      )}

      {insight && (
        <div className="hc-coach-body">
          <p className="hc-coach-summary">{insight.summary}</p>

          {(insight.wins.length > 0 || insight.risks.length > 0) && (
            <div className="hc-coach-tags">
              {insight.wins.map((win, index) => (
                <span key={`win-${index}`} className="hc-badge hc-badge-good">
                  {win}
                </span>
              ))}
              {insight.risks.map((risk, index) => (
                <span key={`risk-${index}`} className="hc-badge hc-badge-watch">
                  {risk}
                </span>
              ))}
            </div>
          )}

          {insight.recommendations.length > 0 && (
            <div className="hc-coach-recs">
              {insight.recommendations.map((rec, index) => (
                <div key={index} className="hc-coach-rec">
                  <strong>{rec.title}</strong>
                  <span>{rec.detail}</span>
                </div>
              ))}
            </div>
          )}

          {insight.outlook && <p className="hc-coach-outlook">{insight.outlook}</p>}
        </div>
      )}
      </div>
    </details>
  );
}
