import type { ActivityType } from "./config";
import type { FoodPreset } from "@/lib/health-data";

export type SyncState = "local" | "syncing" | "synced" | "error";
export type MetricStatus = "optimal" | "watch" | "follow-up" | "unrated";

export interface MealEntry {
  id: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  at: string;
  /** AI-suggested preset category; session-only (not persisted to Supabase). */
  category?: FoodPreset["category"];
}

export interface WorkoutExercise {
  name: string;
  weightLbs?: number;
  sets?: number;
  reps?: number;
}

/** A workout captured by photographing a class screen or watch summary. */
export interface WorkoutScan {
  id: string;
  at: string;
  activity: string;
  durationMinutes?: number;
  calories?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  exercises: WorkoutExercise[];
  summary?: string;
  recommendations?: string[];
}

export interface DailyLog {
  date: string;
  waterOz: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  weight?: number;
  sleepHours?: number;
  steps: number;
  walkingMinutes: number;
  activityType?: ActivityType;
  activityCompleted: boolean;
  estimatedActivityCalories: number;
  /**
   * Calories from steps already folded into estimatedActivityCalories via the
   * steps "Complete" action. Tracked so re-completing updates the contribution
   * instead of stacking, and so it can be undone. Optional so pre-existing saved
   * days without the field still parse.
   */
  stepsCaloriesLogged?: number;
  energy?: number;
  mood?: number;
  soreness?: number;
  supplements: Record<string, boolean>;
  meals: MealEntry[];
  /** Optional so pre-existing saved days without the field still parse. */
  workouts?: WorkoutScan[];
  notes: string;
}

export interface WeeklyCheckIn {
  id: string;
  date: string;
  weight?: number;
  waist?: number;
  bodyFat?: number;
  note: string;
}

export interface BodyScan {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  leanMass?: number;
  muscleMass?: number;
  skeletalMuscle?: number;
  visceralFat?: number;
  bmr?: number;
  waist?: number;
  notes: string;
}

export interface LabResult {
  id: string;
  panelId: string;
  marker: string;
  category: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: MetricStatus;
  notes: string;
}

export interface LabPanel {
  id: string;
  date: string;
  labName: string;
  notes: string;
  results: LabResult[];
}

export interface InsightRecommendation {
  title: string;
  detail: string;
}

/** AI-generated daily analysis, cached per date and keyed to the data digest. */
export interface DailyInsight {
  date: string;
  digestHash: string;
  generatedAt: string;
  headline: string;
  summary: string;
  wins: string[];
  risks: string[];
  recommendations: InsightRecommendation[];
  outlook: string;
}

export interface HealthState {
  version: 2;
  days: Record<string, DailyLog>;
  weeklyCheckIns: WeeklyCheckIn[];
  bodyScans: BodyScan[];
  labPanels: LabPanel[];
  archivedSupplements: string[];
  /** Optional so pre-existing saved states without the field still parse. */
  insights?: Record<string, DailyInsight>;
  /**
   * User-created and user-edited meal presets. An entry whose id matches a
   * built-in preset overrides it; any other entry is an added preset.
   */
  customPresets?: FoodPreset[];
}

export interface ProjectionPoint {
  week: number;
  weight: number;
  waist: number;
  bodyFat: number;
  phase: string;
}
