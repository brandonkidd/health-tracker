export const BODYFI_PLAN = {
  startDate: "2026-07-24",
  baseline: {
    heightInches: 71,
    weight: 192.9,
    waist: 42,
    bmi: 26.9,
    bodyFat: 21.5,
    bodyFatMass: 41.4,
    leanMass: 151.5,
    skeletalMuscleMass: 87.1,
    visceralFatLevel: 8,
    inBodyScore: 81,
    totalBodyWater: 110.7,
    intracellularWater: 70.1,
    extracellularWater: 40.6,
    segmentalLeanMass: {
      trunk: 68.1,
      leftArm: 8.71,
      rightArm: 9.22,
      leftLeg: 22.64,
      rightLeg: 22.42,
    },
    segmentalFatMass: {
      leftArm: 2.2,
      rightArm: 2.0,
      leftLeg: 5.5,
      rightLeg: 5.5,
    },
  },
  targets: {
    calories: 2100,
    protein: 180,
    carbs: 190,
    fat: 70,
    fiber: 30,
    waterOz: 128,
    sleepHours: 7.5,
    steps: 9000,
    walkingMinutes: 30,
  },
  schedule: {
    0: { label: "Recovery walk", type: "walk" },
    1: { label: "Alpha class", type: "alpha" },
    2: { label: "Yoga", type: "yoga" },
    3: { label: "Alpha class", type: "alpha" },
    4: { label: "Yoga", type: "yoga" },
    5: { label: "Alpha class", type: "alpha" },
    6: { label: "Recovery walk", type: "walk" },
  },
  anchors: [
    { week: 0, weight: 192.9, waist: 42, bodyFat: 21.5, phase: "Cut" },
    { week: 20, weight: 170, waist: 35.5, bodyFat: 15, phase: "Cut" },
    { week: 26, weight: 170, waist: 35.5, bodyFat: 15, phase: "Maintain" },
    { week: 78, weight: 175, waist: 35.5, bodyFat: 15, phase: "Build" },
    { week: 182, weight: 185, waist: 36.5, bodyFat: 15, phase: "Build" },
  ],
} as const;

export type ActivityType = "alpha" | "yoga" | "walk" | "rest";

export function plannedActivity(date: string): {
  label: string;
  type: ActivityType;
} {
  const day = new Date(`${date}T12:00:00`).getDay() as keyof typeof BODYFI_PLAN.schedule;
  return BODYFI_PLAN.schedule[day];
}
