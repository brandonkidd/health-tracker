"use client";

import { useEffect, useRef, useState } from "react";
import type { EngineSnapshot } from "@/lib/health/engine";
import type { CoachChatStatus, InsightStatus } from "@/hooks/use-health-state";
import type { DailyInsight } from "@/lib/health/types";
import { StatusBadge } from "./ui";

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
  todayActivityCalories = 0,
  onRefresh,
  onSendMessage,
  chatStatus = "idle",
  chatError = null,
}: {
  engine: EngineSnapshot | null;
  insight: DailyInsight | null;
  status: InsightStatus;
  todayCalories: number;
  todayActivityCalories?: number;
  onRefresh: () => void;
  onSendMessage?: (message: string) => Promise<void> | void;
  chatStatus?: CoachChatStatus;
  chatError?: string | null;
}) {
  // Always starts collapsed; only expands when the user clicks it.
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const conversation = insight?.conversation ?? [];
  const sending = chatStatus === "sending";

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [conversation.length, sending]);

  if (!engine) return null;

  const { tdee, targets, forecast } = engine;
  // Base burn + tracked exercise − food; the base has no exercise baked in.
  const deficit = tdee.tdee + todayActivityCalories - todayCalories;
  const eta = forecast ? formatEta(forecast) : null;

  const chips: { label: string; value: string; hint?: string }[] = [
    {
      label: "Base burn",
      value: `${tdee.tdee.toLocaleString()} cal`,
      hint:
        todayActivityCalories > 0
          ? `+${todayActivityCalories.toLocaleString()} exercise today`
          : confidenceLabel(tdee.confidence),
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

  async function handleSend() {
    const message = draft.trim();
    if (!message || !onSendMessage || sending) return;
    setDraft("");
    await onSendMessage(message);
  }

  return (
    <details
      className="hc-card hc-collapsible hc-coach-card"
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
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

            {onSendMessage && (
              <div className="hc-coach-talk">
                <div className="hc-coach-talk-header">
                  <strong>Talk it through</strong>
                  <span>Push back, clarify, or add context the coach missed.</span>
                </div>

                {(conversation.length > 0 || sending) && (
                  <div className="hc-coach-thread" ref={threadRef} aria-live="polite">
                    {conversation.map((turn) => (
                      <div
                        key={turn.id}
                        className={
                          turn.role === "user"
                            ? "hc-coach-bubble hc-coach-bubble-user"
                            : "hc-coach-bubble hc-coach-bubble-ai"
                        }
                      >
                        <span className="hc-coach-bubble-label">
                          {turn.role === "user" ? "You" : "Coach"}
                        </span>
                        <p>{turn.content}</p>
                      </div>
                    ))}
                    {sending && (
                      <div className="hc-coach-bubble hc-coach-bubble-ai hc-coach-bubble-pending">
                        <span className="hc-coach-bubble-label">Coach</span>
                        <p>Thinking…</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="hc-coach-composer">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="e.g. I slept 5 hours and had two drinks — does that change today?"
                    rows={3}
                    disabled={sending}
                    aria-label="Message the adaptive coach"
                  />
                  <div className="hc-coach-composer-actions">
                    <button
                      type="button"
                      className="hc-button"
                      onClick={() => void handleSend()}
                      disabled={sending || !draft.trim()}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>

                {chatError && <p className="hc-scan-error">{chatError}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
