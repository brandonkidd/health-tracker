"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { BODYFI_PLAN } from "@/lib/health/config";
import type { BodyScan, WeeklyCheckIn } from "@/lib/health/types";
import { Card, SectionHeader, StatusBadge } from "./ui";

const BodyModel3D = dynamic(
  () => import("./body-model-3d").then((mod) => mod.BodyModel3D),
  {
    ssr: false,
    loading: () => <div className="hc-model-loading">Loading 3D model…</div>,
  }
);

const STAGES = [
  { id: "now", label: "Now", weight: 192.9, waist: 42, bodyFat: 21.5, note: "July 24 InBody baseline" },
  { id: "180", label: "Cut · 180", weight: 180, waist: 38.5, bodyFat: 17.5, note: "Estimated checkpoint" },
  { id: "170", label: "Cut · 170", weight: 170, waist: 35.5, bodyFat: 15, note: "Estimated cut target" },
  { id: "175", label: "Build · 175", weight: 175, waist: 35.5, bodyFat: 15, note: "Estimated build stage" },
  { id: "185", label: "Build · 185", weight: 185, waist: 36.5, bodyFat: 15, note: "Estimated long-term stage" },
] as const;

export function BodyModel({
  latestCheckIn,
  latestScan,
}: {
  latestCheckIn?: WeeklyCheckIn;
  latestScan?: BodyScan;
}) {
  const [selectedId, setSelectedId] = useState("now");
  const stages = useMemo(() => {
    const actualWeight = latestScan?.weight ?? latestCheckIn?.weight;
    const actualWaist = latestScan?.waist ?? latestCheckIn?.waist;
    const actualBodyFat = latestScan?.bodyFat ?? latestCheckIn?.bodyFat;
    return STAGES.map((stage) =>
      stage.id === "now"
        ? {
            ...stage,
            weight: actualWeight ?? BODYFI_PLAN.baseline.weight,
            waist: actualWaist ?? BODYFI_PLAN.baseline.waist,
            bodyFat: actualBodyFat ?? BODYFI_PLAN.baseline.bodyFat,
            note: actualWeight || actualWaist || actualBodyFat ? "Latest measured values" : stage.note,
          }
        : stage
    );
  }, [latestCheckIn, latestScan]);
  const selected = stages.find((stage) => stage.id === selectedId) ?? stages[0];
  const isMeasured = selected.id === "now";

  return (
    <Card className="hc-model-card">
      <SectionHeader
        eyebrow="Body map"
        title="Visualize the journey"
        action={<StatusBadge tone={isMeasured ? "good" : "watch"}>{isMeasured ? "Measured inputs" : "Illustrative estimate"}</StatusBadge>}
      />
      <div className="hc-model-layout">
        <div className="hc-model-stage">
          <BodyModel3D bodyFat={selected.bodyFat} weight={selected.weight} />
          <div className="hc-model-hint">Drag to rotate · scroll to zoom</div>
        </div>
        <div className="hc-model-controls">
          <div className="hc-model-stats">
            <div><span>Weight</span><strong>{selected.weight}<small> lb</small></strong></div>
            <div><span>Waist</span><strong>{selected.waist}<small> in</small></strong></div>
            <div><span>Body fat</span><strong>{selected.bodyFat}<small>%</small></strong></div>
          </div>
          {isMeasured && (
            <div className="hc-inbody-summary">
              <div><span>InBody score</span><strong>{BODYFI_PLAN.baseline.inBodyScore}</strong></div>
              <div><span>Skeletal muscle</span><strong>{BODYFI_PLAN.baseline.skeletalMuscleMass} lb</strong></div>
              <div><span>Body fat mass</span><strong>{BODYFI_PLAN.baseline.bodyFatMass} lb</strong></div>
              <div><span>Visceral fat</span><strong>Level {BODYFI_PLAN.baseline.visceralFatLevel}</strong></div>
              <div><span>Total body water</span><strong>{BODYFI_PLAN.baseline.totalBodyWater} lb</strong></div>
              <div><span>BMI</span><strong>{BODYFI_PLAN.baseline.bmi}</strong></div>
            </div>
          )}
          <p>
            {selected.note}. The figure reshapes with each stage&apos;s weight and body-fat
            estimate—rotate it freely. Future stages remain estimates, not promises of exact
            appearance.
          </p>
          <div className="hc-stage-picker">
            {stages.map((stage) => (
              <button
                key={stage.id}
                className={selected.id === stage.id ? "active" : ""}
                onClick={() => setSelectedId(stage.id)}
              >
                <span>{stage.label}</span>
                <strong>{stage.weight} lb</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
