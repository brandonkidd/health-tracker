"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BodyScreen } from "@/components/health/body-screen";
import { LabsScreen } from "@/components/health/labs-screen";
import { PlanScreen } from "@/components/health/plan-screen";
import { TodayScreen } from "@/components/health/today-screen";
import { TrendsScreen } from "@/components/health/trends-screen";
import { useHealthState } from "@/hooks/use-health-state";
import { ptDateKey } from "@/lib/health/date";
import { emptyDailyLog } from "@/lib/health/storage";
import type { DailyLog, HealthState } from "@/lib/health/types";
import type { FoodPreset } from "@/lib/health-data";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 10.6 12 3.8l8.5 6.8V20a1.2 1.2 0 0 1-1.2 1.2H4.7A1.2 1.2 0 0 1 3.5 20Z" />
      <path d="M9.6 21v-6.4h4.8V21" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M8 2.8V7M16 2.8V7M3.5 10.4h17" />
      <path d="M8 14.4h.01M12 14.4h.01M16 14.4h.01M8 17.6h.01M12 17.6h.01" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7.6" r="3.8" />
      <path d="M4.8 20.8c.9-3.9 3.8-6 7.2-6s6.3 2.1 7.2 6" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12h4l2.4-6.4 4.4 12.8L16 12h5.5" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.7" />
      <path d="M12 7.4V12l3.1 1.9" />
    </svg>
  );
}

const NAV = [
  { id: "today", label: "Today", icon: <HomeIcon /> },
  { id: "trends", label: "Stats", icon: <CalendarIcon /> },
  { id: "body", label: "Body", icon: <PersonIcon /> },
  { id: "labs", label: "Labs", icon: <PulseIcon /> },
  { id: "plan", label: "Plan", icon: <GearIcon /> },
] as const;

type View = (typeof NAV)[number]["id"];

const TITLES: Record<View, string> = {
  today: "Today",
  trends: "Stats",
  body: "Body",
  labs: "Labs",
  plan: "Plan",
};

/**
 * Tracks "today" in Pacific Time and updates when the PT day rolls over, so an
 * app left open (or resumed from a phone's background) flips to the new day.
 */
function usePtToday(): string {
  const [today, setToday] = useState(() => ptDateKey());
  useEffect(() => {
    const check = () => setToday((prev) => (prev === ptDateKey() ? prev : ptDateKey()));
    const timer = setInterval(check, 30_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return today;
}

export default function HealthCommandCenter() {
  const {
    state,
    updateState,
    ready,
    syncState,
    importBackup,
    engine,
    insight,
    insightStatus,
    refreshInsight,
  } = useHealthState();
  const [view, setView] = useState<View>("today");
  const today = usePtToday();
  const [date, setDate] = useState(today);
  const day = useMemo(() => state.days[date] ?? emptyDailyLog(date), [state.days, date]);

  // When the PT day rolls over, follow it — unless the user navigated to a past date.
  const lastToday = useRef(today);
  useEffect(() => {
    if (today === lastToday.current) return;
    setDate((current) => (current === lastToday.current ? today : current));
    lastToday.current = today;
  }, [today]);

  function updateDay(next: DailyLog) {
    updateState((current) => ({
      ...current,
      days: { ...current.days, [date]: next },
    }));
  }

  function clearDay() {
    updateState((current) => {
      const days = { ...current.days };
      delete days[date];
      return { ...current, days };
    });
  }

  function replaceState(next: HealthState) {
    updateState(() => next);
  }

  function updateCustomPresets(next: FoodPreset[]) {
    updateState((current) => ({ ...current, customPresets: next }));
  }

  if (!ready) {
    return (
      <main className="hc-loading">
        <div className="hc-logo-mark">BF</div>
        <span>Preparing your health system…</span>
      </main>
    );
  }

  return (
    <div className="hc-app">
      <header className="hc-topbar">
        <button
          className="hc-icon-btn"
          onClick={() => {
            setDate(ptDateKey());
            setView("today");
          }}
          aria-label="Back to today"
        >
          <ClockIcon />
        </button>
        <div className="hc-topbar-title">{TITLES[view]}</div>
        <button className="hc-icon-btn" onClick={() => setView("plan")} aria-label="Plan and settings">
          <GearIcon />
          <span
            className={`hc-sync-dot hc-sync-${syncState}`}
            title={syncState === "local" ? "On this device" : syncState === "syncing" ? "Saving" : syncState === "error" ? "Sync issue" : "Cloud synced"}
          />
        </button>
      </header>

      <main className="hc-main">
        {view === "today" && (
          <TodayScreen
            date={date}
            day={day}
            allDays={state.days}
            archivedSupplements={state.archivedSupplements}
            customPresets={state.customPresets ?? []}
            onUpdatePresets={updateCustomPresets}
            engine={engine}
            insight={insight}
            insightStatus={insightStatus}
            onRefreshInsight={refreshInsight}
            onChange={updateDay}
            onClear={clearDay}
            onDateChange={setDate}
          />
        )}
        {view === "trends" && <TrendsScreen state={state} engine={engine} />}
        {view === "body" && <BodyScreen state={state} engine={engine} onChange={replaceState} />}
        {view === "labs" && <LabsScreen state={state} onChange={replaceState} />}
        {view === "plan" && (
          <PlanScreen
            state={state}
            onChange={replaceState}
            onImport={(raw) => {
              try {
                importBackup(raw);
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "Could not import backup.");
              }
            }}
          />
        )}
      </main>

      <nav className="hc-bottom-nav" aria-label="Primary navigation">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => {
              if (item.id === "today") setDate(ptDateKey());
              setView(item.id);
            }}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
            <span className="hc-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
