"use client";

import { FormEvent, useState } from "react";
import { BODYFI_PLAN } from "@/lib/health/config";
import { checkInDelta, planWeek, projectionAtWeek } from "@/lib/health/projections";
import type { BodyScan, HealthState, WeeklyCheckIn } from "@/lib/health/types";
import { Card, EmptyState, Field, SectionHeader, StatusBadge } from "./ui";
import { BodyModel } from "./body-model";
import { PhotoTimeline } from "./photo-timeline";

function numberValue(data: FormData, name: string): number | undefined {
  const value = data.get(name);
  return value ? Number(value) : undefined;
}

function ArcChart({
  entries,
  fullArc,
}: {
  entries: WeeklyCheckIn[];
  fullArc: boolean;
}) {
  const maxWeek = fullArc ? 182 : 26;
  const projected = Array.from({ length: 40 }, (_, index) =>
    projectionAtWeek((index / 39) * maxWeek)
  );
  const allWeights = [...projected.map((point) => point.weight), ...entries.flatMap((entry) => entry.weight ? [entry.weight] : [])];
  const min = Math.min(...allWeights) - 3;
  const max = Math.max(...allWeights) + 3;
  const x = (week: number) => (week / maxWeek) * 100;
  const y = (weight: number) => 58 - ((weight - min) / (max - min)) * 50;
  const projectionPoints = projected.map((point) => `${x(point.week)},${y(point.weight)}`).join(" ");
  const actualPoints = entries
    .filter((entry) => entry.weight != null && planWeek(entry.date) <= maxWeek)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => `${x(planWeek(entry.date))},${y(entry.weight!)}`)
    .join(" ");

  return (
    <svg className="hc-arc-chart" viewBox="0 0 100 62" preserveAspectRatio="none" aria-label="Actual versus projected weight">
      <line x1="0" y1="58" x2="100" y2="58" />
      <polyline className="projection" points={projectionPoints} fill="none" vectorEffect="non-scaling-stroke" />
      {actualPoints && <polyline className="actual" points={actualPoints} fill="none" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

export function BodyScreen({
  state,
  onChange,
}: {
  state: HealthState;
  onChange: (next: HealthState) => void;
}) {
  const [fullArc, setFullArc] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const latest = state.weeklyCheckIns.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const latestScan = state.bodyScans.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const delta = latest ? checkInDelta(latest) : undefined;

  function submitCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date"));
    const entry: WeeklyCheckIn = {
      id: `checkin-${date}`,
      date,
      weight: numberValue(data, "weight"),
      waist: numberValue(data, "waist"),
      bodyFat: numberValue(data, "bodyFat"),
      note: String(data.get("note") ?? ""),
    };
    onChange({
      ...state,
      weeklyCheckIns: [...state.weeklyCheckIns.filter((item) => item.date !== date), entry],
    });
    setShowCheckIn(false);
  }

  function submitScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date"));
    const scan: BodyScan = {
      id: `scan-${date}`,
      date,
      weight: numberValue(data, "weight"),
      bodyFat: numberValue(data, "bodyFat"),
      leanMass: numberValue(data, "leanMass"),
      muscleMass: numberValue(data, "muscleMass"),
      skeletalMuscle: numberValue(data, "skeletalMuscle"),
      visceralFat: numberValue(data, "visceralFat"),
      bmr: numberValue(data, "bmr"),
      waist: numberValue(data, "waist"),
      notes: String(data.get("notes") ?? ""),
    };
    onChange({
      ...state,
      bodyScans: [...state.bodyScans.filter((item) => item.date !== date), scan],
    });
    setShowScan(false);
  }

  return (
    <div className="hc-stack">
      <Card className="hc-hero">
        <div>
          <div className="hc-eyebrow">Cut → 170 → build → 185</div>
          <h1>Your body, measured honestly.</h1>
          <p>Weight is daily noise. Waist, 7-day averages, strength, and consistent InBody conditions tell the story.</p>
        </div>
        <button className="hc-button" onClick={() => setShowCheckIn(!showCheckIn)}>Weekly check-in</button>
      </Card>

      {showCheckIn && (
        <Card>
          <SectionHeader eyebrow="Once per week" title="Log the steering metrics" />
          <form className="hc-form-grid" onSubmit={submitCheckIn}>
            <Field label="Date"><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Weight (lb)"><input name="weight" type="number" step="0.1" /></Field>
            <Field label="Waist at navel (in)"><input name="waist" type="number" step="0.1" /></Field>
            <Field label="Body fat % (scan weeks)"><input name="bodyFat" type="number" step="0.1" /></Field>
            <Field label="Note"><input name="note" placeholder="Steps, sleep, how you feel" /></Field>
            <button className="hc-button" type="submit">Save check-in</button>
          </form>
        </Card>
      )}

      <div className="hc-status-rail">
        <Card><span>Latest weight</span><strong>{latest?.weight ?? "—"}<small> lb</small></strong></Card>
        <Card><span>Latest waist</span><strong>{latest?.waist ?? "—"}<small> in</small></strong></Card>
        <Card><span>Vs projection</span><strong>{delta?.weight == null ? "—" : `${delta.weight > 0 ? "+" : ""}${delta.weight}`}<small> lb</small></strong></Card>
        <Card><span>Plan week</span><strong>{planWeek(new Date().toISOString().slice(0, 10))}</strong></Card>
      </div>

      <BodyModel latestCheckIn={latest} latestScan={latestScan} />
      <PhotoTimeline />

      <Card>
        <SectionHeader
          eyebrow="The curve, live"
          title="Actual vs projected weight"
          action={
            <div className="hc-segmented">
              <button className={!fullArc ? "active" : ""} onClick={() => setFullArc(false)}>Cut</button>
              <button className={fullArc ? "active" : ""} onClick={() => setFullArc(true)}>Full arc</button>
            </div>
          }
        />
        <ArcChart entries={state.weeklyCheckIns} fullArc={fullArc} />
        <div className="hc-chart-legend"><span className="projected">Projected</span><span className="actual">Actual</span></div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Every 4–6 weeks"
          title="InBody scans"
          action={<button className="hc-button hc-button-secondary" onClick={() => setShowScan(!showScan)}>Add scan</button>}
        />
        {showScan && (
          <form className="hc-form-grid" onSubmit={submitScan}>
            <Field label="Date"><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Weight (lb)"><input name="weight" type="number" step="0.1" /></Field>
            <Field label="Body fat %"><input name="bodyFat" type="number" step="0.1" /></Field>
            <Field label="Lean mass (lb)"><input name="leanMass" type="number" step="0.1" /></Field>
            <Field label="Muscle mass (lb)"><input name="muscleMass" type="number" step="0.1" /></Field>
            <Field label="Skeletal muscle"><input name="skeletalMuscle" type="number" step="0.1" /></Field>
            <Field label="Visceral fat"><input name="visceralFat" type="number" step="0.1" /></Field>
            <Field label="BMR"><input name="bmr" type="number" /></Field>
            <Field label="Waist (in)"><input name="waist" type="number" step="0.1" /></Field>
            <Field label="Notes"><input name="notes" /></Field>
            <button className="hc-button" type="submit">Save measured scan</button>
          </form>
        )}
        {state.bodyScans.length ? (
          <div className="hc-history">
            {state.bodyScans.slice().sort((a, b) => b.date.localeCompare(a.date)).map((scan) => (
              <div key={scan.id}>
                <strong>{scan.date}</strong>
                <span>{scan.weight ?? "—"} lb</span>
                <span>{scan.bodyFat ?? "—"}% body fat</span>
                <span>{scan.leanMass ?? "—"} lb lean</span>
                <StatusBadge tone="good">Measured</StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Your first scan will establish the measured baseline. Use the same machine, time, hydration, and fasting conditions.</EmptyState>
        )}
      </Card>

      <Card>
        <SectionHeader eyebrow="Measurement protocol" title="Keep comparisons clean" />
        <ul className="hc-rules">
          <li>Daily: fasted weight; react only to the 7-day average.</li>
          <li>Weekly: fasted waist at the navel, same tape tension.</li>
          <li>Every 4–6 weeks: same InBody machine, time, fasting, and hydration conditions.</li>
          <li>Use measured scans as truth; projections are a steering tool, not a promise.</li>
        </ul>
      </Card>
    </div>
  );
}
