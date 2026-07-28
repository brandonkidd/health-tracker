"use client";

import { FormEvent, useRef, useState } from "react";
import { BODYFI_PLAN } from "@/lib/health/config";
import { ptDateKey } from "@/lib/health/date";
import { checkInDelta, planWeek, projectionAtWeek } from "@/lib/health/projections";
import type { AdaptiveForecast, EngineSnapshot } from "@/lib/health/engine";
import type { BodyScan, DailyLog, HealthState, WeeklyCheckIn } from "@/lib/health/types";
import { Card, EmptyState, Field, SectionHeader, StatusBadge } from "./ui";
import { BodyModel } from "./body-model";
import { PhotoTimeline } from "./photo-timeline";

function numberValue(data: FormData, name: string): number | undefined {
  const value = data.get(name);
  return value ? Number(value) : undefined;
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M4 7.5h2.6l1.5-2.3h7.8l1.5 2.3H20a1.6 1.6 0 0 1 1.6 1.6v8.6A1.6 1.6 0 0 1 20 19.3H4a1.6 1.6 0 0 1-1.6-1.6V9.1A1.6 1.6 0 0 1 4 7.5Z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

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

interface InBodyScanResponse {
  isBodyScan: boolean;
  date: string | null;
  weightLb: number | null;
  bodyFatPercent: number | null;
  leanMassLb: number | null;
  muscleMassLb: number | null;
  skeletalMuscleLb: number | null;
  visceralFatLevel: number | null;
  bmr: number | null;
  inBodyScore: number | null;
  summary: string;
  error?: string;
}

interface StrengthRow {
  name: string;
  latestWeight: number;
  latestDate: string;
  previousWeight?: number;
  sessions: number;
}

/** Per-exercise latest working weight vs the previous session, from scanned workouts. */
function strengthProgress(days: Record<string, DailyLog>): StrengthRow[] {
  const byName = new Map<string, { name: string; entries: { date: string; weightLbs: number }[] }>();
  for (const day of Object.values(days)) {
    for (const scan of day.workouts ?? []) {
      for (const exercise of scan.exercises) {
        if (!exercise.weightLbs) continue;
        const key = exercise.name.trim().toLowerCase();
        const group = byName.get(key) ?? { name: exercise.name.trim(), entries: [] };
        group.entries.push({ date: day.date, weightLbs: exercise.weightLbs });
        byName.set(key, group);
      }
    }
  }
  const rows: StrengthRow[] = [];
  for (const { name, entries } of Array.from(byName.values())) {
    entries.sort((a, b) => b.date.localeCompare(a.date));
    const latest = entries[0];
    const previous = entries.find((entry) => entry.date !== latest.date);
    rows.push({
      name,
      latestWeight: latest.weightLbs,
      latestDate: latest.date,
      previousWeight: previous?.weightLbs,
      sessions: new Set(entries.map((entry) => entry.date)).size,
    });
  }
  return rows.sort((a, b) => b.latestDate.localeCompare(a.latestDate)).slice(0, 12);
}

function ArcChart({
  entries,
  fullArc,
  forecast,
}: {
  entries: WeeklyCheckIn[];
  fullArc: boolean;
  forecast?: AdaptiveForecast | null;
}) {
  const maxWeek = fullArc ? 182 : 26;
  const projected = Array.from({ length: 40 }, (_, index) =>
    projectionAtWeek((index / 39) * maxWeek)
  );
  const forecastInRange = (forecast?.points ?? [])
    .map((point) => ({ ...point, week: planWeek(point.date) }))
    .filter((point) => point.week <= maxWeek);
  const allWeights = [
    ...projected.map((point) => point.weight),
    ...entries.flatMap((entry) => (entry.weight ? [entry.weight] : [])),
    ...forecastInRange.flatMap((point) => [point.low, point.high]),
  ];
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
  const forecastPoints = forecastInRange
    .map((point) => `${x(point.week)},${y(point.weight)}`)
    .join(" ");
  const bandPoints =
    forecastInRange.length > 1
      ? [
          ...forecastInRange.map((point) => `${x(point.week)},${y(point.high)}`),
          ...forecastInRange
            .slice()
            .reverse()
            .map((point) => `${x(point.week)},${y(point.low)}`),
        ].join(" ")
      : "";

  return (
    <svg className="hc-arc-chart" viewBox="0 0 100 62" preserveAspectRatio="none" aria-label="Actual versus projected weight">
      <line x1="0" y1="58" x2="100" y2="58" />
      {bandPoints && <polygon className="forecast-band" points={bandPoints} />}
      <polyline className="projection" points={projectionPoints} fill="none" vectorEffect="non-scaling-stroke" />
      {forecastPoints && (
        <polyline className="forecast" points={forecastPoints} fill="none" vectorEffect="non-scaling-stroke" />
      )}
      {actualPoints && <polyline className="actual" points={actualPoints} fill="none" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

export function BodyScreen({
  state,
  engine,
  onChange,
}: {
  state: HealthState;
  engine: EngineSnapshot | null;
  onChange: (next: HealthState) => void;
}) {
  const [fullArc, setFullArc] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Partial<BodyScan> | null>(null);
  const [prefillVersion, setPrefillVersion] = useState(0);
  const inBodyInputRef = useRef<HTMLInputElement>(null);
  const strengthRows = strengthProgress(state.days);
  const latest = state.weeklyCheckIns.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const latestScan = state.bodyScans.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const delta = latest ? checkInDelta(latest) : undefined;
  const forecast = engine?.forecast ?? null;
  const etaLabel = (() => {
    if (!forecast || forecast.etaDate == null) return "—";
    if (forecast.etaWeeks === 0) return "Now";
    return new Date(`${forecast.etaDate}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  })();

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
    setPrefill(null);
  }

  async function scanInBodyPhoto(file: File) {
    setScanBusy(true);
    setScanError(null);
    try {
      const image = await fileToDataUrl(file);
      const response = await fetch("/api/scan-inbody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const result = (await response.json()) as InBodyScanResponse;
      if (!response.ok) throw new Error(result.error ?? "Scan failed — try again.");
      if (!result.isBodyScan) {
        throw new Error(
          "That photo doesn't look like a body composition result. Try a clearer shot of the InBody printout or screen."
        );
      }

      const noteParts = [
        result.inBodyScore != null ? `InBody score ${result.inBodyScore}` : "",
        "Read from photo",
      ].filter(Boolean);

      setPrefill({
        date: result.date ?? ptDateKey(),
        weight: result.weightLb ?? undefined,
        bodyFat: result.bodyFatPercent ?? undefined,
        leanMass: result.leanMassLb ?? undefined,
        muscleMass: result.muscleMassLb ?? undefined,
        skeletalMuscle: result.skeletalMuscleLb ?? undefined,
        visceralFat: result.visceralFatLevel ?? undefined,
        bmr: result.bmr ?? undefined,
        notes: noteParts.join(" · "),
      });
      setPrefillVersion((version) => version + 1);
      setShowScan(true);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Scan failed — try again.");
    } finally {
      setScanBusy(false);
    }
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
            <Field label="Date"><input name="date" type="date" required defaultValue={ptDateKey()} /></Field>
            <Field label="Weight (lb)"><input name="weight" type="number" step="0.1" /></Field>
            <Field label="Waist at navel (in)"><input name="waist" type="number" step="0.1" /></Field>
            <Field label="Body fat % (scan weeks)"><input name="bodyFat" type="number" step="0.1" /></Field>
            <Field label="Note"><input name="note" placeholder="Steps, sleep, how you feel" /></Field>
            <button className="hc-button" type="submit">Save check-in</button>
          </form>
        </Card>
      )}

      <div className="hc-status-rail">
        <Card><span>Trend weight</span><strong>{engine?.trendWeight ?? latest?.weight ?? "—"}<small> lb</small></strong></Card>
        <Card><span>Latest waist</span><strong>{latest?.waist ?? "—"}<small> in</small></strong></Card>
        <Card><span>Vs plan</span><strong>{forecast ? `${forecast.deltaVsPlan > 0 ? "+" : ""}${forecast.deltaVsPlan}` : delta?.weight == null ? "—" : `${delta.weight > 0 ? "+" : ""}${delta.weight}`}<small> lb</small></strong></Card>
        <Card><span>{forecast ? `ETA ${forecast.goalWeight} lb` : "Plan week"}</span><strong>{forecast ? etaLabel : planWeek(ptDateKey())}</strong></Card>
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
        <ArcChart entries={state.weeklyCheckIns} fullArc={fullArc} forecast={forecast} />
        <div className="hc-chart-legend">
          <span className="projected">Plan</span>
          <span className="actual">Actual</span>
          {forecast && <span className="forecasted">Your pace</span>}
        </div>
        {forecast && (
          <p className="hc-muted hc-compact-copy" style={{ marginTop: 10 }}>
            At your current pace ({forecast.projectedRatePerWeek > 0 ? "+" : ""}
            {forecast.projectedRatePerWeek} lb/week from a {forecast.startTrendWeight} lb trend
            weight), you reach <strong>{forecast.goalWeight} lb</strong>
            {forecast.etaWeeks != null && forecast.etaWeeks > 0
              ? ` in about ${Math.round(forecast.etaWeeks)} weeks (${etaLabel}). `
              : forecast.etaWeeks === 0
                ? " — you're there. "
                : " — pace has stalled; see the coach's recommendations. "}
            The shaded band shows the uncertainty from day-to-day scale noise.
          </p>
        )}
      </Card>

      <Card>
        <SectionHeader eyebrow="From scanned workouts" title="Strength progression" />
        {strengthRows.length ? (
          <div className="hc-strength-list">
            {strengthRows.map((row) => {
              const delta =
                row.previousWeight != null ? row.latestWeight - row.previousWeight : null;
              return (
                <div key={row.name} className="hc-strength-row">
                  <div>
                    <strong>{row.name}</strong>
                    <small>
                      {row.sessions} session{row.sessions === 1 ? "" : "s"} · last {row.latestDate}
                    </small>
                  </div>
                  <span className="hc-strength-weight">
                    {row.latestWeight}
                    <small> lb</small>
                  </span>
                  {delta != null && (
                    <span
                      className={
                        delta > 0
                          ? "hc-strength-delta up"
                          : delta < 0
                            ? "hc-strength-delta down"
                            : "hc-strength-delta"
                      }
                    >
                      {delta > 0 ? `+${delta}` : delta === 0 ? "same" : delta} {delta !== 0 ? "lb" : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState>
            Scan a class screen from the Today tab and any weights it shows will start building
            your progression history here.
          </EmptyState>
        )}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Every 4–6 weeks"
          title="InBody scans"
          action={<button className="hc-button hc-button-secondary" onClick={() => setShowScan(!showScan)}>Add scan</button>}
        />
        <div className="hc-scan-block">
          <input
            ref={inBodyInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void scanInBodyPhoto(file);
            }}
          />
          <button
            className="hc-scan-button"
            onClick={() => inBodyInputRef.current?.click()}
            disabled={scanBusy}
          >
            <CameraIcon />
            {scanBusy ? "Reading your results…" : "Scan InBody results"}
          </button>
          <small>
            Snap the printout or app screen — date, body fat %, muscle mass, skeletal muscle,
            visceral fat, and BMR fill in automatically for you to review.
          </small>
          {scanError && <p className="hc-scan-error">{scanError}</p>}
        </div>
        {showScan && (
          <form key={prefillVersion} className="hc-form-grid" onSubmit={submitScan}>
            {prefill && (
              <p className="hc-muted hc-compact-copy" style={{ gridColumn: "1 / -1", margin: 0 }}>
                Read from your photo — double-check the values, then save.
              </p>
            )}
            <Field label="Date"><input name="date" type="date" required defaultValue={prefill?.date ?? ptDateKey()} /></Field>
            <Field label="Weight (lb)"><input name="weight" type="number" step="0.1" defaultValue={prefill?.weight} /></Field>
            <Field label="Body fat %"><input name="bodyFat" type="number" step="0.1" defaultValue={prefill?.bodyFat} /></Field>
            <Field label="Lean mass (lb)"><input name="leanMass" type="number" step="0.1" defaultValue={prefill?.leanMass} /></Field>
            <Field label="Muscle mass (lb)"><input name="muscleMass" type="number" step="0.1" defaultValue={prefill?.muscleMass} /></Field>
            <Field label="Skeletal muscle"><input name="skeletalMuscle" type="number" step="0.1" defaultValue={prefill?.skeletalMuscle} /></Field>
            <Field label="Visceral fat"><input name="visceralFat" type="number" step="0.1" defaultValue={prefill?.visceralFat} /></Field>
            <Field label="BMR"><input name="bmr" type="number" defaultValue={prefill?.bmr} /></Field>
            <Field label="Waist (in)"><input name="waist" type="number" step="0.1" /></Field>
            <Field label="Notes"><input name="notes" defaultValue={prefill?.notes} /></Field>
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
