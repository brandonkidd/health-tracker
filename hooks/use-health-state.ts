"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyHealthState,
  loadHealthState,
  parseHealthBackup,
  saveHealthState,
} from "@/lib/health/storage";
import type { HealthState, SyncState } from "@/lib/health/types";

export function useHealthState() {
  const [state, setState] = useState<HealthState>(emptyHealthState);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("local");
  const cloudEnabled = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      .catch(() => setSyncState("local"));
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

  return { state, updateState, ready, syncState, importBackup };
}
