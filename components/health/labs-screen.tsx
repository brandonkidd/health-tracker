"use client";

import { FormEvent, useState } from "react";
import { LAB_COMPARISONS, RETEST_PANEL } from "@/lib/health-data";
import type { HealthState, LabPanel, MetricStatus } from "@/lib/health/types";
import { Card, EmptyState, Field, SectionHeader, StatusBadge } from "./ui";

const badgeTone = (status: string) =>
  status === "optimal" ? "good" : status === "follow-up" ? "follow" : status === "watch" ? "watch" : "neutral";

export function LabsScreen({
  state,
  onChange,
}: {
  state: HealthState;
  onChange: (next: HealthState) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...Array.from(new Set(LAB_COMPARISONS.map((lab) => lab.category)))];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const panelId = crypto.randomUUID();
    const panel: LabPanel = {
      id: panelId,
      date: String(data.get("date")),
      labName: String(data.get("labName") ?? ""),
      notes: String(data.get("panelNotes") ?? ""),
      results: [
        {
          id: crypto.randomUUID(),
          panelId,
          marker: String(data.get("marker")),
          category: String(data.get("category") ?? "Other"),
          value: String(data.get("value")),
          unit: String(data.get("unit") ?? ""),
          referenceRange: String(data.get("referenceRange") ?? ""),
          status: String(data.get("status") ?? "unrated") as MetricStatus,
          notes: String(data.get("notes") ?? ""),
        },
      ],
    };
    onChange({ ...state, labPanels: [...state.labPanels, panel] });
    setShowForm(false);
  }

  const filtered = LAB_COMPARISONS.filter((lab) => filter === "All" || lab.category === filter);

  return (
    <div className="hc-stack">
      <Card className="hc-hero">
        <div>
          <div className="hc-eyebrow">Know the inside, too</div>
          <h1>Labs with context.</h1>
          <p>Keep results, ranges, dates, and follow-up questions together. Status labels organize the conversation; they are not a diagnosis.</p>
        </div>
        <button className="hc-button" onClick={() => setShowForm(!showForm)}>Add result</button>
      </Card>

      {showForm && (
        <Card>
          <SectionHeader eyebrow="Structured record" title="Add a lab result" />
          <form className="hc-form-grid" onSubmit={submit}>
            <Field label="Collection date"><input required name="date" type="date" /></Field>
            <Field label="Lab / provider"><input name="labName" placeholder="Quest, physician office…" /></Field>
            <Field label="Marker"><input required name="marker" placeholder="ApoB" /></Field>
            <Field label="Category"><input name="category" placeholder="Cardiovascular" /></Field>
            <Field label="Value"><input required name="value" placeholder="78" /></Field>
            <Field label="Unit"><input name="unit" placeholder="mg/dL" /></Field>
            <Field label="Reference range"><input name="referenceRange" placeholder="<90" /></Field>
            <Field label="Status">
              <select name="status" defaultValue="unrated">
                <option value="unrated">Not rated</option>
                <option value="optimal">Optimal</option>
                <option value="watch">Watch</option>
                <option value="follow-up">Follow-up</option>
              </select>
            </Field>
            <Field label="Result note"><input name="notes" placeholder="Question for clinician" /></Field>
            <Field label="Panel note"><input name="panelNotes" /></Field>
            <button className="hc-button" type="submit">Save result</button>
          </form>
        </Card>
      )}

      <Card>
        <SectionHeader eyebrow="Your records" title="Entered panels" />
        {state.labPanels.length ? (
          <div className="hc-lab-list">
            {state.labPanels.slice().sort((a, b) => b.date.localeCompare(a.date)).map((panel) => (
              <div key={panel.id} className="hc-lab-panel">
                <div><strong>{panel.labName || "Lab panel"}</strong><span>{panel.date}</span></div>
                {panel.results.map((result) => (
                  <div className="hc-lab-row" key={result.id}>
                    <span><strong>{result.marker}</strong><small>{result.category}</small></span>
                    <span>{result.value} {result.unit}<small>{result.referenceRange || "No range entered"}</small></span>
                    <StatusBadge tone={badgeTone(result.status)}>{result.status}</StatusBadge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No structured results yet. Your existing May 2026 reference data remains below.</EmptyState>
        )}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="May 2026 reference"
          title="Current snapshot"
          action={
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter lab category">
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          }
        />
        <div className="hc-lab-list">
          {filtered.map((lab) => (
            <div className="hc-lab-row" key={lab.marker}>
              <span><strong>{lab.marker}</strong><small>{lab.category}</small></span>
              <span>{lab.current2026}<small>{lab.range}</small></span>
              <StatusBadge tone={lab.cls2026 === "green" ? "good" : lab.cls2026 === "red" ? "follow" : lab.cls2026 === "orange" ? "watch" : "neutral"}>
                {lab.verdict2026}
              </StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Oct–Nov reminder" title="Retest checklist" />
        <div className="hc-retest-grid">
          {RETEST_PANEL.slice(0, 12).map((item) => (
            <div key={item.test}>
              <strong>{item.test}</strong>
              <span>{item.target}</span>
              <small>{item.why}</small>
            </div>
          ))}
        </div>
        <p className="hc-disclaimer">Discuss lab interpretation, symptoms, medications, and supplement changes with a qualified clinician.</p>
      </Card>
    </div>
  );
}
