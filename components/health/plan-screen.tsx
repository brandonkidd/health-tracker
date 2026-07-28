"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { BODYFI_PLAN } from "@/lib/health/config";
import {
  listHealthSnapshots,
  restoreHealthSnapshot,
  type HealthSnapshot,
} from "@/lib/health/storage";
import type { HealthState } from "@/lib/health/types";
import { SUPPLEMENTS_DAILY } from "@/lib/health-data";
import { Card, SectionHeader, StatusBadge } from "./ui";

function currentWeekDates(): string[] {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + index);
    return new Date(day.getTime() - day.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  });
}

export function PlanScreen({
  state,
  onChange,
  onImport,
}: {
  state: HealthState;
  onChange: (next: HealthState) => void;
  onImport: (raw: string) => void;
}) {
  const weekDates = currentWeekDates();
  const todayKey = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  function downloadBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bodyfi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void file.text().then(onImport);
  }

  const [snapshots, setSnapshots] = useState<HealthSnapshot[]>([]);
  useEffect(() => {
    setSnapshots(listHealthSnapshots());
  }, []);

  function restoreSnapshot(date: string) {
    if (
      !window.confirm(
        `Merge the ${date} snapshot back into your data? Nothing logged since then is lost — missing days and entries are recovered.`
      )
    ) {
      return;
    }
    const restored = restoreHealthSnapshot(date, state);
    if (!restored) {
      window.alert("Could not read that snapshot.");
      return;
    }
    onChange(restored);
  }

  function toggleArchive(id: string) {
    const archived = state.archivedSupplements.includes(id)
      ? state.archivedSupplements.filter((item) => item !== id)
      : [...state.archivedSupplements, id];
    onChange({ ...state, archivedSupplements: archived });
  }

  return (
    <div className="hc-stack">
      <Card className="hc-hero">
        <div>
          <div className="hc-eyebrow">The roadmap</div>
          <h1>Cut with control. Build with patience.</h1>
          <p>First reach a healthy, maintainable 170. Hold. Then earn the slow build to 185 while waist and labs stay honest.</p>
        </div>
        <StatusBadge tone="good">Current phase: Cut</StatusBadge>
      </Card>

      <Card>
        <SectionHeader eyebrow="2026–2029" title="BFIT arc" />
        <div className="hc-timeline">
          {BODYFI_PLAN.anchors.map((anchor) => (
            <div key={anchor.week}>
              <span>Week {anchor.week}</span>
              <strong>{anchor.weight} lb</strong>
              <small>{anchor.phase} · {anchor.waist}&quot; waist · {anchor.bodyFat}% BF guide</small>
            </div>
          ))}
        </div>
      </Card>

      <div className="hc-two-col">
        <Card>
          <SectionHeader eyebrow="Weekly rhythm" title="3 Alpha + 2 yoga" />
          <div className="hc-week-plan">
            {Object.values(BODYFI_PLAN.schedule).map((day, index) => {
              const date = weekDates[index];
              const done = Boolean(state.days[date]?.activityCompleted);
              const isToday = date === todayKey;
              return (
                <div key={index} className={isToday ? "hc-week-today" : undefined}>
                  <span>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}</span>
                  <strong>{day.label}</strong>
                  <em className={done ? "hc-week-check done" : "hc-week-check"} aria-label={done ? "Completed" : "Not completed"}>
                    {done ? "✓" : ""}
                  </em>
                </div>
              );
            })}
          </div>
          <p className="hc-muted">
            Checks fill in automatically when you hit “Mark complete” on the Today screen.
            Walking is the adjustable lever—do not add hard classes to force a larger deficit.
          </p>
        </Card>

        <Card>
          <SectionHeader eyebrow="Daily dials" title="Targets" />
          <div className="hc-target-list">
            <div><span>Calories</span><strong>~{BODYFI_PLAN.targets.calories}</strong></div>
            <div><span>Protein floor</span><strong>{BODYFI_PLAN.targets.protein}g</strong></div>
            <div><span>Water</span><strong>{BODYFI_PLAN.targets.waterOz} oz</strong></div>
            <div><span>Steps</span><strong>{BODYFI_PLAN.targets.steps.toLocaleString()}</strong></div>
            <div><span>Sleep</span><strong>{BODYFI_PLAN.targets.sleepHours}–8 hr</strong></div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader eyebrow="Steering rules" title="What changes the plan" />
        <ul className="hc-rules">
          <li>Judge progress by 7-day average weight plus weekly waist.</li>
          <li>If both stall for 10–14 compliant days, reduce roughly 150 calories or add walking.</li>
          <li>Keep loss under roughly 1.25 lb per week; protect strength, recovery, and lean mass.</li>
          <li>If lifts, sleep, or energy fall sharply, recover and eat appropriately—do not add more training.</li>
          <li>Hold around 170 before beginning a slow, measured build.</li>
        </ul>
      </Card>

      <Card>
        <SectionHeader eyebrow="Daily list control" title="Supplement stack" />
        <div className="hc-supplement-settings">
          {SUPPLEMENTS_DAILY.map((supplement) => {
            const archived = state.archivedSupplements.includes(supplement.id);
            return (
              <div key={supplement.id}>
                <span><strong>{supplement.name}</strong><small>{supplement.dose} · {supplement.when}</small></span>
                <button className="hc-text-button" onClick={() => toggleArchive(supplement.id)}>
                  {archived ? "Restore" : "Archive"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="hc-disclaimer">The app records your chosen regimen. Review doses, interactions, and lab-driven changes with your clinician.</p>
      </Card>

      <Card>
        <SectionHeader eyebrow="Ownership" title="Backup & restore" />
        <p className="hc-muted">Cloud sync is preferred, but a readable JSON backup keeps your records portable.</p>
        <div className="hc-button-row">
          <button className="hc-button hc-button-secondary" onClick={downloadBackup}>Export backup</button>
          <label className="hc-button hc-button-secondary">
            Import backup
            <input className="hc-hidden-input" type="file" accept="application/json" onChange={importBackup} />
          </label>
        </div>
        {snapshots.length > 0 && (
          <>
            <p className="hc-muted" style={{ marginTop: 14 }}>
              Automatic safety snapshots (end-of-day copies kept on this device, last {snapshots.length}):
            </p>
            <div className="hc-history">
              {snapshots.map((snapshot) => (
                <div key={snapshot.date}>
                  <strong>{snapshot.date}</strong>
                  <span>{Object.keys(snapshot.state.days).length} days logged</span>
                  <span>{snapshot.state.bodyScans.length} scans</span>
                  <button className="hc-text-button" onClick={() => restoreSnapshot(snapshot.date)}>
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
