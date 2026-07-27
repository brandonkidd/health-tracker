"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildInsightDigest,
  computeEngineSnapshot,
  hashDigest,
} from "@/lib/health/engine";
import type { EngineSnapshot } from "@/lib/health/engine";
import {
  emptyHealthState,
  loadHealthState,
  parseHealthBackup,
  saveHealthState,
} from "@/lib/health/storage";
import type { DailyInsight, HealthState, SyncState } from "@/lib/health/types";

export type InsightStatus =
  | "idle"
  | "insufficient"
  | "loading"
  | "ready"
  | "error";

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Days with anything meaningful logged — gate for AI analysis. */
function loggedDayCount(state: HealthState): number {
  return Object.values(state.days).filter(
    (day) =>
      day.calories > 0 ||
      day.meals.length > 0 ||
      typeof day.weight === "number" ||
      typeof day.sleepHours === "number"
  ).length;
}

export function useHealthState() {
  const [state, setState] = useState<HealthState>(emptyHealthState);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [cloudChecked, setCloudChecked] = useState(false);
  const [insightStatus, setInsightStatus] = useState<InsightStatus>("idle");
  const cloudEnabled = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insightAttempted = useRef<string | null>(null);

  useEffect(() => {
    const local = loadHealthState();
    setState(local);
    setReady(true);

    void fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Cloud unavailable");
        const payload = (await response.json()) as { state: HealthState };
        cloudEnabled.current = true;
        const cloudHasData =
          Object.keys(payload.state.days).length > 0 ||
          payload.state.weeklyCheckIns.length > 0 ||
          payload.state.bodyScans.length > 0 ||
          payload.state.labPanels.length > 0;
        if (cloudHasData) {
          setState(payload.state);
          saveHealthState(payload.state);
        } else if (
          Object.keys(local.days).length ||
          local.weeklyCheckIns.length ||
          local.bodyScans.length ||
          local.labPanels.length
        ) {
          await fetch("/api/health", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(local),
          });
        }
        setSyncState("synced");
      })
      .catch(() => setSyncState("local"))
      .finally(() => setCloudChecked(true));
  }, []);

  const updateState = useCallback((updater: (current: HealthState) => HealthState) => {
    setState((current) => {
      const next = updater(current);
      saveHealthState(next);
      if (cloudEnabled.current) {
        setSyncState("syncing");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void fetch("/api/health", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          })
            .then((response) => {
              if (!response.ok) throw new Error("Save failed");
              setSyncState("synced");
            })
            .catch(() => setSyncState("error"));
        }, 500);
      }
      return next;
    });
  }, []);

  const importBackup = useCallback(
    (raw: string) => {
      const imported = parseHealthBackup(raw);
      updateState(() => imported);
    },
    [updateState]
  );

  /** Adaptive metrics, recomputed in real time as data is logged. */
  const engine: EngineSnapshot | null = useMemo(() => {
    if (!ready) return null;
    return computeEngineSnapshot(state, todayIso());
  }, [state, ready]);

  const generateInsight = useCallback(
    (current: HealthState, force: boolean) => {
      const today = todayIso();
      const snapshot = computeEngineSnapshot(current, today);
      if (loggedDayCount(current) < 3) {
        setInsightStatus("insufficient");
        return;
      }
      const digest = buildInsightDigest(current, snapshot, today);
      const hash = hashDigest(digest);
      const cached = current.insights?.[today];
      if (!force && cached && cached.digestHash === hash) {
        setInsightStatus("ready");
        return;
      }
      setInsightStatus("loading");
      void fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Insight generation failed");
          const payload = (await response.json()) as Omit<
            DailyInsight,
            "date" | "digestHash" | "generatedAt"
          >;
          const insight: DailyInsight = {
            ...payload,
            date: today,
            digestHash: hash,
            generatedAt: new Date().toISOString(),
          };
          updateState((prev) => ({
            ...prev,
            insights: { ...(prev.insights ?? {}), [today]: insight },
          }));
          setInsightStatus("ready");
        })
        .catch(() => setInsightStatus("error"));
    },
    [updateState]
  );

  // On open (after the cloud check settles): generate today's insight once,
  // unless the cached one still matches the data. Mid-session log entries do
  // not retrigger generation — use refreshInsight for an on-demand update.
  useEffect(() => {
    if (!ready || !cloudChecked) return;
    const today = todayIso();
    if (insightAttempted.current === today) return;
    insightAttempted.current = today;
    generateInsight(state, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cloudChecked]);

  const refreshInsight = useCallback(() => {
    generateInsight(state, true);
  }, [generateInsight, state]);

  const insight: DailyInsight | null = state.insights?.[todayIso()] ?? null;

  return {
    state,
    updateState,
    ready,
    syncState,
    importBackup,
    engine,
    insight,
    insightStatus,
    refreshInsight,
  };
}
