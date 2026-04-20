// Complete health plan data extracted from original HTML
export const DATES = {
  start: "2026-04-19",
  phase1End: "2026-06-15",
  maui: "2026-07-15",
  lifeTime: "2026-07-01",
  birthday: "2026-09-15"
};

export const BASELINE = {
  age: 41,
  height: "6'0\"",
  weight: 191.8,
  bmi: 26.0,
  bodyFat: 20.9,
  leanMass: 151.8,
  muscleMass: 144.2,
  bodyWater: 57.2,
  skeletalMuscle: 51.2,
  subcutaneousFat: 18.2,
  visceralFat: 9,
  boneMass: 7.6,
  protein: 18.0,
  bmr: 1856,
  metabolicAge: 41
};

export const TARGETS = {
  cals: 2100,
  protein: 190,
  carbs: 190,
  fat: 65,
  water: 4,
  steps: 10000
};

export const SUPPLEMENTS_DAILY = [
  { id: "armra", name: "ARMRA Colostrum", dose: "Per label", when: "Pre-food / empty stomach", status: "have", tier: 1, why: "Gut lining, immune, growth factors" },
  { id: "ag1", name: "AG1 (Athletic Greens)", dose: "1 scoop + 16oz water", when: "Morning w/ breakfast", status: "have", tier: 1, why: "Foundational micronutrients, B vits, probiotics" },
  { id: "creatine", name: "Creatine Monohydrate", dose: "5g", when: "Morning — mix into AG1", status: "buy", tier: 1, why: "Strength, muscle, cognition" },
  { id: "tongkat", name: "Tongkat Ali (Momentous)", dose: "400mg", when: "Morning with food", status: "buy", tier: 1, why: "+10–20% free T, LH signaling. 8 on / 2–4 off." },
  { id: "d3k2", name: "Vitamin D3 + K2 (Thorne)", dose: "2,000 IU D3 + 100mcg K2", when: "Breakfast w/ fat", status: "buy", tier: 1, why: "+20–30% total T in deficient men. K2 directs calcium." },
  { id: "omega3", name: "Omega-3 Fish Oil (Momentous)", dose: "2–3g EPA+DHA", when: "With breakfast", status: "buy", tier: 1, why: "Inflammation, joints, cardio recovery" },
  { id: "collagen", name: "Collagen Peptides", dose: "10–15g", when: "Morning or post-workout", status: "buy", tier: 2, why: "Tendons, joints, connective tissue" },
  { id: "lmnt", name: "LMNT Electrolytes", dose: "1 packet", when: "Post-workout / sweat", status: "buy", tier: 1, why: "Sodium, K, Mg replenishment" },
  { id: "protein", name: "Protein Shake", dose: "1–1.5 scoops (25–35g)", when: "Post-workout / fill gaps", status: "have", tier: 1, why: "Hit 190g daily protein" },
  { id: "nac", name: "NAC (Thorne/Pure)", dose: "600mg", when: "With dinner", status: "buy", tier: 2, why: "Liver support, glutathione, anti-inflammatory" },
  { id: "moonbrew", name: "Moon Brew", dose: "Per label", when: "30–45 min before bed", status: "have", tier: 1, why: "Sleep quality = T production" },
  { id: "mag", name: "Magnesium Glycinate/L-Threonate", dose: "300–400mg", when: "Before bed", status: "consider", tier: 2, why: "Deep sleep, cortisol, cognitive (if Moon Brew lacks)" }
];

export const WORKOUTS = {
  A: {
    name: "Workout A — Lower Body + Posterior Chain",
    day: "Monday",
    duration: "45–50 min",
    equipment: "35 lb KB, 44 lb KB, TRX, bodyweight",
    rest: "60–90 sec",
    exercises: [
      { name: "KB Goblet Squat", sets: 3, reps: "12", note: "35 lb KB at chest. Squat to depth. Drive through heels." },
      { name: "KB Sumo Deadlift", sets: 3, reps: "10", note: "44 lb KB between legs. Wide stance. Flat back." },
      { name: "TRX Hamstring Curl", sets: 3, reps: "10–12", note: "Heels in TRX. Bridge hips. Curl heels to glutes." },
      { name: "KB Swing", sets: 3, reps: "15", note: "35 lb. Power from hips. Drive hips forward — let KB float." },
      { name: "TRX Assisted Split Squat", sets: 3, reps: "8–10 ea", note: "Hold TRX lightly. Progress with 25 lb DBs." },
      { name: "Glute Bridge + KB Hold", sets: 3, reps: "15", note: "44 lb KB on hips. Pause 1 sec at top." },
      { name: "Dead Bug", sets: 3, reps: "8 ea side", note: "Lower back glued to floor. Breathe out." }
    ]
  },
  B: {
    name: "Workout B — Upper Body Push + Pull",
    day: "Wednesday",
    duration: "45–50 min",
    equipment: "15/20/25 lb DBs, TRX, bodyweight",
    rest: "60–90 sec",
    exercises: [
      { name: "TRX Push-up", sets: 3, reps: "10–12", note: "Feet in cradles OR hands in handles. Harder than regular." },
      { name: "TRX Row", sets: 3, reps: "12", note: "Plank body. Row chest to handles. Walk feet forward = harder." },
      { name: "DB Shoulder Press", sets: 3, reps: "10–12", note: "25 lb. Seated or standing. Brace core. Full range." },
      { name: "DB Single-Arm Row", sets: 3, reps: "12 ea", note: "25 lb. Row to hip (not armpit). Squeeze at top." },
      { name: "TRX Y-Fly / Face Pull", sets: 3, reps: "15", note: "Y overhead or face-height. Critical for posture." },
      { name: "TRX Bicep Curl", sets: 3, reps: "12–15", note: "Palms up. Curl to forehead. Squeeze at top." },
      { name: "DB Lateral Raise", sets: 3, reps: "15", note: "15 lb. Slight elbow bend. To shoulder height only." }
    ]
  },
  C: {
    name: "Workout C — Full Body Power + Stability",
    day: "Friday",
    duration: "45–50 min",
    equipment: "35 lb KB, 44 lb KB, 20/25 lb DBs, TRX",
    rest: "60–90 sec",
    exercises: [
      { name: "KB Single-Leg RDL", sets: 3, reps: "8 ea", note: "35 lb in opposite hand. Hinge forward. Balance + glute builder." },
      { name: "KB Clean + Press", sets: 3, reps: "8 ea side", note: "35 lb. Swing → clean to rack → press overhead." },
      { name: "DB Floor Press", sets: 3, reps: "12", note: "25 lb each. Elbows 45° from body." },
      { name: "TRX Row (underhand)", sets: 3, reps: "12", note: "Palms up. Hits lower traps + biceps." },
      { name: "Cossack Squat", sets: 3, reps: "8 ea side", note: "Wide stance. Shift weight to one knee. Hip mobility gold." },
      { name: "TRX Atomic Push-up", sets: 3, reps: "8–10", note: "Feet in TRX. Push-up + tuck knees to chest." },
      { name: "KB Farmer's Carry", sets: 3, reps: "40 steps", note: "Both KBs (35 + 44 lb). Tall posture. Grip + core + traps." }
    ]
  }
};

export const NON_NEGOTIABLES = [
  "Hit 190g protein — every single day",
  "Drink 3–4 L water — Peloton + runs dehydrate heavily",
  "Eat within 1 hour of waking",
  "ZERO alcohol for 8 weeks (April 19 → June 15)",
  "8,000–12,000 steps daily — treadmill desk counts",
  "Coffee cut-off: 2:00 pm sharp",
  "Moon Brew + Mg every night — no skipping",
  "7.5–8 hours sleep — this is training, not optional",
  "Log every workout: exercise, weight, sets, reps",
  "Never cut below 1,800 calories"
];

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}
