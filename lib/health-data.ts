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
  carbs: 140,
  fat: 70,
  fiber: 25,
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

export const MEALS_PLAN = [
  {
    time: "Morning",
    name: "Breakfast - High Protein",
    cals: 521,
    p: 39,
    c: 28,
    f: 27,
    items: [
      "3 large eggs (19g P)",
      "½ avocado (75g)",
      "2 tbsp salsa",
      "½ slice sourdough (25g)",
      "Coffee + Califia oat barista",
      "¾ cup nonfat Greek yogurt (16g P)",
    ],
  },
  {
    time: "12:30 pm",
    name: "Lunch - Chicken Power Bowl",
    cals: 558,
    p: 57,
    c: 32,
    f: 21,
    items: [
      "6 oz grilled chicken breast (52g P)",
      "2 cups mixed greens + vegetables",
      "½ cup cooked brown rice",
      "1 tbsp olive oil",
      "Vinegar / salsa to taste",
    ],
  },
  {
    time: "3:30 pm",
    name: "Snack - Whey Shake + Apple",
    cals: 215,
    p: 26,
    c: 28,
    f: 2,
    items: ["1 scoop whey (25g P)", "1 medium apple"],
  },
  {
    time: "6:30 pm",
    name: "Dinner - Sirloin + Potatoes + Veg",
    cals: 600,
    p: 62,
    c: 40,
    f: 21,
    items: [
      "7 oz lean sirloin, cooked (55g P)",
      "1 cup boiled potatoes",
      "1.5 cups roasted vegetables + 1 tsp oil",
    ],
  },
  {
    time: "Optional",
    name: "Daily Treat",
    cals: 125,
    p: 1,
    c: 18,
    f: 5,
    items: ["1 cookie or square of chocolate"],
  },
];

export type FoodPreset = {
  id: string;
  label: string;
  say: string;
  category: 'breakfast' | 'snack' | 'lunch' | 'dinner' | 'restaurant' | 'quick' | 'drink';
  cals: number;
  p: number;
  c: number;
  f: number;
  fiber?: number;
  notes?: string;
};

/** Recomp preset meals — from data/recomp-meals.xlsx */
export const FOOD_PRESETS: FoodPreset[] = [
  // Home — breakfast
  { id: 'bf-simple', label: 'Breakfast Simple', say: 'eggs avocado', category: 'breakfast', cals: 336, p: 20, c: 7, f: 25, fiber: 5 },
  { id: 'bf-eggs-avo', label: 'Eggs & Avo (Full)', say: 'eggs avocado sourdough', category: 'breakfast', cals: 426, p: 23, c: 22, f: 27, fiber: 6 },
  { id: 'bf-high-protein', label: 'High Protein Breakfast', say: 'eggs yogurt breakfast', category: 'breakfast', cals: 521, p: 39, c: 28, f: 27, fiber: 6 },
  { id: 'bf-greek-bowl', label: 'Greek Yogurt Bowl', say: 'greek yogurt berries', category: 'breakfast', cals: 360, p: 36, c: 35, f: 8, fiber: 4, notes: '1.5 cup nonfat Greek yogurt, berries, honey, nuts' },
  // Home — lunch
  { id: 'lunch-power-bowl', label: 'Chicken Power Bowl', say: 'chicken rice bowl lunch', category: 'lunch', cals: 558, p: 57, c: 32, f: 21, fiber: 5 },
  { id: 'lunch-baja-salad', label: 'Baja Salad + Chicken', say: 'baja salad chicken', category: 'lunch', cals: 590, p: 60, c: 31, f: 26, fiber: 11, notes: 'Dressing on side or halved' },
  // Home — snack
  { id: 'snack-shake-apple', label: 'Whey Shake + Apple', say: 'protein shake apple', category: 'snack', cals: 215, p: 26, c: 28, f: 2, fiber: 4 },
  { id: 'snack-cottage-berries', label: 'Cottage Cheese + Berries', say: 'cottage cheese berries', category: 'snack', cals: 215, p: 25, c: 17, f: 5, fiber: 2 },
  { id: 'snack-moonbrew', label: 'Whey + Moon Brew', say: 'moon brew shake night', category: 'snack', cals: 140, p: 25, c: 5, f: 2, fiber: 1, notes: 'Nighttime protein before bed' },
  // Home — dinner
  { id: 'dinner-sirloin', label: 'Sirloin + Potatoes + Veg', say: 'sirloin steak dinner', category: 'dinner', cals: 600, p: 62, c: 40, f: 21, fiber: 7 },
  { id: 'dinner-salmon', label: 'Salmon + Rice + Veg', say: 'salmon rice dinner', category: 'dinner', cals: 600, p: 48, c: 43, f: 26, fiber: 7 },
  { id: 'dinner-kabobs', label: 'Chicken Kabobs + Veg', say: 'chicken kabobs', category: 'dinner', cals: 515, p: 64, c: 14, f: 22, fiber: 4 },
  { id: 'dinner-burger-bowl', label: 'Hamburger Bowl', say: 'burger bowl bunless', category: 'dinner', cals: 485, p: 55, c: 10, f: 26, fiber: 2 },
  { id: 'dinner-mexican-bowl', label: 'Ground Chicken Mexican Bowl', say: 'mexican chicken bowl', category: 'dinner', cals: 583, p: 57, c: 44, f: 22, fiber: 10 },
  { id: 'dinner-turkey-tacos', label: 'Turkey Taco Lettuce Wraps', say: 'turkey tacos lettuce', category: 'dinner', cals: 450, p: 48, c: 12, f: 22, fiber: 5 },
  { id: 'dinner-shrimp-stirfry', label: 'Shrimp Stir-Fry', say: 'shrimp stir fry', category: 'dinner', cals: 450, p: 48, c: 40, f: 8, fiber: 5, notes: 'Cauliflower rice to cut carbs' },
  { id: 'dinner-sheet-pan', label: 'Sheet-Pan Chicken + Veg', say: 'sheet pan chicken', category: 'dinner', cals: 520, p: 58, c: 35, f: 14, fiber: 7, notes: '7 oz chicken, veg, 1 small potato' },
  { id: 'dinner-salmon-greens', label: 'Salmon over Greens', say: 'salmon salad greens', category: 'dinner', cals: 420, p: 44, c: 8, f: 24, fiber: 4 },
  // Quick singles (6 oz proteins from spreadsheet)
  { id: 'quick-eggs', label: '3 Eggs', say: 'three eggs', category: 'quick', cals: 216, p: 19, c: 1, f: 14 },
  { id: 'quick-chicken', label: '6oz Chicken', say: 'chicken breast', category: 'quick', cals: 280, p: 52, c: 0, f: 6 },
  { id: 'quick-sirloin', label: '7oz Sirloin', say: 'sirloin steak', category: 'quick', cals: 380, p: 55, c: 0, f: 16 },
  { id: 'quick-salmon', label: '6oz Salmon', say: 'salmon', category: 'quick', cals: 350, p: 40, c: 0, f: 20 },
  { id: 'quick-avocado', label: '½ Avocado', say: 'avocado', category: 'quick', cals: 120, p: 2, c: 6, f: 11, fiber: 5 },
  { id: 'quick-rice', label: '½ Cup Brown Rice', say: 'rice', category: 'quick', cals: 108, p: 3, c: 22, f: 1, fiber: 2 },
  // Cha Cha's Latin Kitchen
  { id: 'out-chachas-fajitas', label: "Cha Cha's Fajitas", say: 'cha chas fajitas', category: 'restaurant', cals: 600, p: 50, c: 30, f: 28, fiber: 5, notes: '1–2 corn tortillas, pico + guac. Skip rice, beans, chips.' },
  { id: 'out-chachas-asada', label: "Cha Cha's Carne Asada", say: 'cha chas carne asada', category: 'restaurant', cals: 550, p: 48, c: 18, f: 30, fiber: 4, notes: 'Limit or skip potatoes' },
  { id: 'out-chachas-yucatan', label: "Cha Cha's Yucatan Chicken", say: 'cha chas yucatan chicken', category: 'restaurant', cals: 520, p: 50, c: 22, f: 22, fiber: 5 },
  // Baja Fish Tacos
  { id: 'out-baja-wahoo-salad', label: 'Baja Wahoo Salad', say: 'baja wahoo salad', category: 'restaurant', cals: 450, p: 40, c: 20, f: 22, fiber: 5, notes: 'Charbroiled only, dressing on side' },
  { id: 'out-baja-fish-tacos', label: 'Baja Fish Tacos x3', say: 'baja fish tacos', category: 'restaurant', cals: 480, p: 38, c: 42, f: 16, fiber: 6, notes: 'Corn tortillas, no rice + beans' },
  { id: 'out-baja-ceviche', label: 'Baja Wahoo Ceviche', say: 'baja ceviche', category: 'restaurant', cals: 350, p: 35, c: 18, f: 14, fiber: 4 },
  // Que Vida
  { id: 'out-quevida-salmon', label: 'Que Vida Salmon Salad', say: 'que vida salmon salad', category: 'restaurant', cals: 520, p: 40, c: 22, f: 28, fiber: 6, notes: 'Skip tortilla strips' },
  { id: 'out-quevida-shrimp-salad', label: 'Que Vida Shrimp Salad', say: 'que vida shrimp salad', category: 'restaurant', cals: 450, p: 42, c: 18, f: 22, fiber: 5 },
  { id: 'out-quevida-bowl', label: 'Que Vida Lean Protein Bowl', say: 'que vida protein bowl', category: 'restaurant', cals: 520, p: 55, c: 25, f: 20, fiber: 5, notes: 'Double chicken, extra veg, skip rice + chips' },
  // Mendocino Farms
  { id: 'out-mendo-ensalada', label: 'Mendo Ensalada + Chicken', say: 'mendocino ensalada chicken', category: 'restaurant', cals: 600, p: 39, c: 40, f: 35, fiber: 9, notes: 'Dressing on side, use ~half' },
  { id: 'out-mendo-soup', label: 'Mendo Soup + Side Salad', say: 'mendocino soup salad', category: 'restaurant', cals: 400, p: 28, c: 35, f: 14, fiber: 4 },
  { id: 'out-mendo-caesar', label: 'Mendo Greens + Chicken', say: 'mendocino caesar chicken', category: 'restaurant', cals: 500, p: 38, c: 18, f: 30, fiber: 5 },
  // In-N-Out
  { id: 'out-innout-double', label: 'In-N-Out Double-Double PS', say: 'in n out protein style', category: 'restaurant', cals: 410, p: 30, c: 11, f: 28, fiber: 2, notes: 'No bun, no spread, no fries' },
  { id: 'out-innout-3x3', label: 'In-N-Out 3x3 PS', say: 'in n out 3x3', category: 'restaurant', cals: 580, p: 45, c: 13, f: 40, fiber: 2, notes: 'Higher protein, higher sodium' },
  { id: 'out-innout-double-meat', label: 'In-N-Out Double Meat PS', say: 'in n out no cheese', category: 'restaurant', cals: 350, p: 32, c: 8, f: 24, fiber: 2, notes: 'No cheese — leanest In-N-Out build' },
  // Drinks
  { id: 'quick-ag1', label: 'AG1 Scoop', say: 'ag1 greens', category: 'drink', cals: 50, p: 2, c: 6, f: 0 },
  { id: 'quick-coffee', label: 'Black Coffee', say: 'coffee', category: 'drink', cals: 5, p: 0, c: 0, f: 0 },
];

export const FOOD_CATEGORIES: FoodPreset['category'][] = ['breakfast', 'snack', 'lunch', 'dinner', 'restaurant', 'quick', 'drink'];

export const LABS_2023 = [
  { marker: "Total Testosterone", result: "468 ng/dL", range: "250–827", pct: "38th", verdict: "Low-normal", cls: "orange" },
  { marker: "Free Testosterone", result: "68.5 pg/mL", range: "46–224", pct: "13th", verdict: "Functionally low", cls: "red" },
  { marker: "Bioavailable T", result: "146.9 ng/dL", range: "110–575", pct: "8th", verdict: "Functionally low", cls: "red" },
  { marker: "SHBG", result: "29 nmol/L", range: "10–50", pct: "48th", verdict: "Good (midrange)", cls: "green" },
  { marker: "Albumin", result: "4.7 g/dL", range: "3.6–5.1", pct: "73rd", verdict: "Good", cls: "green" }
];

export type LabComparison = {
  marker: string;
  category: string;
  baseline2023: string | null;
  current2026: string;
  range: string;
  verdict2023: string | null;
  verdict2026: string;
  cls2023: "red" | "orange" | "green" | "grey" | null;
  cls2026: "red" | "orange" | "green" | "grey";
  note?: string;
};

export const LABS_MAY_2026_DRAWN = "May 2026";

export const LAB_COMPARISONS: LabComparison[] = [
  // Hormones
  {
    marker: "Total Testosterone",
    category: "Hormones",
    baseline2023: "468 ng/dL",
    current2026: "512 ng/dL",
    range: "250–1100 (opt 700–900)",
    verdict2023: "Low-normal (38th %ile)",
    verdict2026: "Mid-range — +44 from baseline",
    cls2023: "orange",
    cls2026: "orange",
    note: "+9% vs 2023; still below optimization target",
  },
  {
    marker: "Free Testosterone",
    category: "Hormones",
    baseline2023: "68.5 pg/mL",
    current2026: "Not tested",
    range: "46–224 (opt >100)",
    verdict2023: "Functionally low (13th %ile)",
    verdict2026: "Retest recommended",
    cls2023: "red",
    cls2026: "grey",
    note: "Order on follow-up panel",
  },
  {
    marker: "Bioavailable Testosterone",
    category: "Hormones",
    baseline2023: "146.9 ng/dL",
    current2026: "Not tested",
    range: "110–575 (opt >300)",
    verdict2023: "Functionally low (8th %ile)",
    verdict2026: "Retest recommended",
    cls2023: "red",
    cls2026: "grey",
    note: "Order on follow-up panel",
  },
  {
    marker: "SHBG",
    category: "Hormones",
    baseline2023: "29 nmol/L",
    current2026: "Not tested",
    range: "10–50",
    verdict2023: "Good (midrange)",
    verdict2026: "Retest recommended",
    cls2023: "green",
    cls2026: "grey",
  },
  {
    marker: "Cortisol (AM)",
    category: "Hormones",
    baseline2023: null,
    current2026: "8.8 mcg/dL",
    range: "4–22",
    verdict2023: null,
    verdict2026: "Good",
    cls2023: null,
    cls2026: "green",
  },
  {
    marker: "TSH",
    category: "Hormones",
    baseline2023: null,
    current2026: "1.67 mIU/L",
    range: "0.40–4.50",
    verdict2023: null,
    verdict2026: "Optimal",
    cls2023: null,
    cls2026: "green",
  },
  {
    marker: "PSA (Total)",
    category: "Hormones",
    baseline2023: null,
    current2026: "0.95 ng/mL",
    range: "<4.00",
    verdict2023: null,
    verdict2026: "Optimal",
    cls2023: null,
    cls2026: "green",
  },
  // Metabolic
  {
    marker: "Fasting Glucose",
    category: "Metabolic",
    baseline2023: null,
    current2026: "97 mg/dL",
    range: "65–99 (opt 75–85)",
    verdict2023: null,
    verdict2026: "Watch",
    cls2023: null,
    cls2026: "orange",
  },
  {
    marker: "Hemoglobin A1c",
    category: "Metabolic",
    baseline2023: null,
    current2026: "5.2%",
    range: "<5.7",
    verdict2023: null,
    verdict2026: "Optimal",
    cls2023: null,
    cls2026: "green",
  },
  {
    marker: "Fasting Insulin",
    category: "Metabolic",
    baseline2023: null,
    current2026: "6.4 µIU/mL",
    range: "<18.4 (opt 3–5)",
    verdict2023: null,
    verdict2026: "Good",
    cls2023: null,
    cls2026: "green",
  },
  // Cardiovascular
  {
    marker: "Total Cholesterol",
    category: "Cardiovascular",
    baseline2023: null,
    current2026: "174 mg/dL",
    range: "<200",
    verdict2023: null,
    verdict2026: "Good",
    cls2023: null,
    cls2026: "green",
  },
  {
    marker: "HDL Cholesterol",
    category: "Cardiovascular",
    baseline2023: null,
    current2026: "62 mg/dL",
    range: ">40",
    verdict2023: null,
    verdict2026: "Optimal",
    cls2023: null,
    cls2026: "green",
  },
  {
    marker: "LDL Cholesterol",
    category: "Cardiovascular",
    baseline2023: null,
    current2026: "99 mg/dL",
    range: "<100",
    verdict2023: null,
    verdict2026: "Watch",
    cls2023: null,
    cls2026: "orange",
  },
  {
    marker: "Triglycerides",
    category: "Cardiovascular",
    baseline2023: null,
    current2026: "51 mg/dL",
    range: "<150",
    verdict2023: null,
    verdict2026: "Optimal",
    cls2023: null,
    cls2026: "green",
  },
  {
    marker: "ApoB",
    category: "Cardiovascular",
    baseline2023: null,
    current2026: "78 mg/dL",
    range: "<90 (opt <70)",
    verdict2023: null,
    verdict2026: "Good",
    cls2023: null,
    cls2026: "green",
    note: "Target under 70",
  },
  {
    marker: "Lipoprotein(a)",
    category: "Cardiovascular",
    baseline2023: null,
    current2026: "<10 nmol/L",
    range: "<75",
    verdict2023: null,
    verdict2026: "Optimal",
    cls2023: null,
    cls2026: "green",
  },
  {
    marker: "hs-CRP",
    category: "Cardiovascular",
    baseline2023: null,
    current2026: "<0.2 mg/L",
    range: "opt <1.0",
    verdict2023: null,
    verdict2026: "Optimal",
    cls2023: null,
    cls2026: "green",
  },
  // Kidney
  {
    marker: "Creatinine",
    category: "Kidney",
    baseline2023: null,
    current2026: "1.23 mg/dL",
    range: "0.60–1.29",
    verdict2023: null,
    verdict2026: "Watch",
    cls2023: null,
    cls2026: "orange",
  },
  {
    marker: "eGFR",
    category: "Kidney",
    baseline2023: null,
    current2026: "76 mL/min/1.73m²",
    range: ">60",
    verdict2023: null,
    verdict2026: "Follow-up",
    cls2023: null,
    cls2026: "red",
    note: "Confirm with Cystatin C + UACR",
  },
  // Vitamins
  {
    marker: "Vitamin D (25-OH)",
    category: "Vitamins",
    baseline2023: null,
    current2026: "34 ng/mL",
    range: "30–100 (opt 60–70)",
    verdict2023: null,
    verdict2026: "Watch",
    cls2023: null,
    cls2026: "orange",
  },
  {
    marker: "Omega-3 Index",
    category: "Vitamins",
    baseline2023: null,
    current2026: "5.5%",
    range: "opt ≥8%",
    verdict2023: null,
    verdict2026: "Watch",
    cls2023: null,
    cls2026: "orange",
  },
];

export const RETEST_PANEL = [
  // HORMONES
  { test: "Total Testosterone", target: "600–900 ng/dL", why: "Your baseline was 468. Optimal body comp + energy", category: "Hormones" },
  { test: "Free Testosterone", target: ">100 pg/mL", why: "Drives recovery, muscle, drive", category: "Hormones" },
  { test: "Bioavailable Testosterone", target: ">300 ng/dL", why: "True production reflection", category: "Hormones" },
  { test: "SHBG", target: "10–40 nmol/L", why: "Was good at 29 — track", category: "Hormones" },
  { test: "Estradiol (sensitive assay)", target: "20–30 pg/mL", why: "As T rises, E2 may follow", category: "Hormones" },
  { test: "LH (Luteinizing Hormone)", target: "Normal range", why: "Brain-testes signaling", category: "Hormones" },
  { test: "FSH (Follicle Stimulating Hormone)", target: "Normal range", why: "Sperm production signal", category: "Hormones" },
  { test: "DHEA-S", target: "Normal range", why: "Adrenal function, vitality", category: "Hormones" },
  
  // THYROID
  { test: "TSH", target: "0.5–2.5 µIU/mL", why: "Fatigue + weight differential", category: "Thyroid" },
  { test: "Free T3", target: "Normal range", why: "Active thyroid hormone", category: "Thyroid" },
  { test: "Free T4", target: "Normal range", why: "Thyroid hormone production", category: "Thyroid" },
  
  // METABOLIC
  { test: "Fasting Insulin", target: "<5 µIU/mL", why: "Insulin sensitivity marker", category: "Metabolic" },
  { test: "HbA1c", target: "<5.7%", why: "3-month glucose average", category: "Metabolic" },
  { test: "Fasting Glucose", target: "70–90 mg/dL", why: "Blood sugar control", category: "Metabolic" },
  { test: "Comprehensive Metabolic Panel (CMP)", target: "Normal range", why: "Kidney, liver, electrolytes", category: "Metabolic" },
  { test: "Lipid Panel (Total, LDL, HDL, Trig)", target: "Optimal ranges", why: "Cardiovascular health", category: "Metabolic" },
  
  // MICRONUTRIENTS
  { test: "Vitamin D (25-hydroxy)", target: ">50 ng/mL", why: "Critical for T, mood, muscle", category: "Micronutrients" },
  { test: "Ferritin", target: ">50 ng/mL", why: "Iron stores affect energy", category: "Micronutrients" },
  { test: "Magnesium, RBC (not serum)", target: "Normal range", why: "Muscle, recovery, sleep", category: "Micronutrients" },
  { test: "Zinc", target: "Normal range", why: "Testosterone production", category: "Micronutrients" },
  
  // CARDIOVASCULAR / INFLAMMATION
  { test: "ApoB (Apolipoprotein B)", target: "<90 mg/dL", why: "True cardiovascular risk", category: "Cardiovascular" },
  { test: "Lp(a) (test once, genetic)", target: "<30 mg/dL", why: "Genetic CVD risk", category: "Cardiovascular" },
  { test: "hs-CRP", target: "<1.0 mg/L", why: "Chronic inflammation check", category: "Cardiovascular" },
  { test: "Homocysteine", target: "<10 µmol/L", why: "Vascular inflammation", category: "Cardiovascular" },
  
  // PROSTATE (baseline before any Rx)
  { test: "PSA (Prostate-Specific Antigen)", target: "<4.0 ng/mL", why: "Baseline before T optimization", category: "Prostate" },
  { test: "Free PSA (if total PSA borderline)", target: ">25%", why: "Cancer risk assessment", category: "Prostate" },
  
  // BLOOD HEALTH / LIVER
  { test: "CBC (Complete Blood Count)", target: "Normal range", why: "RBC, WBC, platelets", category: "Blood Health" },
  { test: "GGT (Gamma-Glutamyl Transferase)", target: "<30 U/L", why: "Liver function, oxidative stress", category: "Blood Health" }
];

export const PELOTON_DAY = [
  { t: "5:00 am", type: "sleep", what: "WAKE UP", d: "16–20 oz water immediately. Set out ARMRA, LMNT, AG1 for post-ride." },
  { t: "5:05 am", type: "exercise", what: "GET READY", d: "Kit up for Peloton. DO NOT eat. No coffee yet." },
  { t: "5:15 am", type: "exercise", what: "PELOTON RIDE (45–60 min)", d: "Push intensity. Plain water during. LMNT in last 15 min if hard Z3–4." },
  { t: "6:15 am", type: "exercise", what: "COOL DOWN", d: "5 min stretch — hips, hamstrings, thoracic spine." },
  { t: "6:20 am", type: "supp", what: "ARMRA + LMNT", d: "ARMRA colostrum in 8 oz cold water first. Then LMNT in 16–20 oz water. Wait 10–15 min before food." },
  { t: "6:25 am", type: "", what: "SHOWER", d: "Keep sipping LMNT water." },
  { t: "6:40 am", type: "food", what: "BREAKFAST + COFFEE ☕", d: "3 whole eggs + ½ avocado + microgreens. Black coffee or 2–3 oz oat milk. ~20g P · 30g F · 4g C · 380 cal." },
  { t: "6:40 am", type: "supp", what: "SUPPLEMENTS w/ breakfast", d: "AG1 (8–10 oz water) • Creatine 5g • Tongkat Ali 400mg • D3+K2 • Omega-3 2–3g EPA+DHA • Collagen 10–15g" },
  { t: "10:00 am", type: "food", what: "MID-MORNING PROTEIN", d: "1 cup Greek yogurt (17g P) OR protein bar (20g+) OR 2 oz jerky + apple." },
  { t: "12:30 pm", type: "food", what: "LUNCH", d: "6 oz chicken (42g) + 1 cup rice (5g) + 2 cups roasted veg + olive oil. ~50g P · 50g C · 15g F · 530 cal." },
  { t: "3:00 pm", type: "food", what: "AFTERNOON SNACK", d: "Apple + string cheese (7g P) OR almonds + 1 oz jerky." },
  { t: "5:00 pm", type: "", what: "HOME · Water check", d: "Fill water to reach 3–4 L for the day." },
  { t: "6:00 pm", type: "food", what: "DINNER", d: "6 oz salmon or lean beef + 1 sweet potato + large salad + olive oil. ~45g P · 35g C · 18g F · 530 cal." },
  { t: "6:30 pm", type: "supp", what: "NAC 600mg w/ dinner", d: "Liver support, glutathione boost. Always with food." },
  { t: "8:00 pm", type: "food", what: "OPTIONAL EVENING SNACK", d: "1 cup cottage cheese (25g casein) — only if short on protein (< 170g total)." },
  { t: "8:30 pm", type: "sleep", what: "WIND DOWN", d: "Dim screens. Blue blockers. Room temp 65–68°F." },
  { t: "8:45 pm", type: "supp", what: "MOON BREW + MAGNESIUM", d: "Moon Brew in warm water. Mg glycinate/L-threonate 300–400mg (if not in Moon Brew)." },
  { t: "9:30 pm", type: "sleep", what: "SLEEP 😴", d: "7.5–8 hours non-negotiable. Cold, dark room. Phone away." }
];

export const LIFTING_DAY = [
  { t: "5:00 am", type: "sleep", what: "WAKE UP", d: "16–20 oz water. Slower, intentional morning." },
  { t: "5:05 am", type: "supp", what: "ARMRA (empty stomach)", d: "8 oz cold water. Wait 10–15 min before breakfast." },
  { t: "5:15 am", type: "supp", what: "AG1 + CREATINE", d: "AG1 1 scoop in 12–16 oz cold water. Creatine 5g stirred in. Sip while getting ready." },
  { t: "5:30 am", type: "food", what: "BREAKFAST + COFFEE ☕", d: "3 whole eggs + ½ avocado + microgreens. Black coffee. ~20g P · 30g F · 4g C · 380 cal." },
  { t: "5:30 am", type: "supp", what: "SUPPLEMENTS w/ breakfast", d: "Tongkat Ali 400mg • D3+K2 • Omega-3 2–3g • Collagen 10–15g." },
  { t: "10:00 am", type: "food", what: "MID-MORNING PROTEIN", d: "Greek yogurt (17g) or protein bar or jerky + fruit." },
  { t: "12:30 pm", type: "food", what: "LUNCH (pre-workout fuel)", d: "6 oz chicken + 1 cup rice + veg + olive oil. Carb-heavy is intentional. ~50g P · 55g C · 15g F." },
  { t: "2:45 pm", type: "food", what: "PRE-WORKOUT SNACK", d: "Banana + 1 tbsp peanut/almond butter. 45–60 min before lift. NOT optional." },
  { t: "3:00 pm", type: "work", what: "HEAD HOME / TRANSITION", d: "5-min dynamic warmup before lift (arm/hip/leg circles)." },
  { t: "3:30 pm", type: "exercise", what: "LIFT WEIGHTS 🏋️", d: "Mon = Workout A (Lower) · Wed = Workout B (Upper) · Fri = Workout C (Full Body). Log every set." },
  { t: "4:30 pm", type: "supp", what: "POST-WORKOUT SHAKE + LMNT", d: "Protein shake 1–1.5 scoops (25–35g) + LMNT packet in 16–20 oz water. Within 30 min." },
  { t: "4:30 pm", type: "", what: "COOL DOWN + SHOWER", d: "5–10 min stretch: hip flexors, chest, lats. Foam roll." },
  { t: "6:00 pm", type: "food", what: "DINNER", d: "6 oz salmon/lean beef + sweet potato + salad. Extra ½ cup rice if hard session." },
  { t: "6:30 pm", type: "supp", what: "NAC 600mg w/ dinner", d: "Every night, no exceptions." },
  { t: "7:30 pm", type: "food", what: "OPTIONAL EVENING SNACK", d: "1 cup cottage cheese (25g casein). Skip if 185g+ already." },
  { t: "8:30 pm", type: "sleep", what: "WIND DOWN", d: "Hard stop on screens. Lifting cortisol needs 3+ hrs to clear." },
  { t: "8:45 pm", type: "supp", what: "MOON BREW + MAGNESIUM", d: "Treat it as a ritual." },
  { t: "9:30 pm", type: "sleep", what: "SLEEP 😴", d: "7.5–8 hours. Non-negotiable. Cold (65–68°F), dark, phone away." }
];

// ============================================================
// RECOMP PROGRAM — 195 → 178, athletic lean
// Built around foot recovery. Birthday (9/7) = "look athletic" checkpoint.
// ============================================================

export const RECOMP_GOAL = {
  start: "~195 lbs · ~19% body fat (≈37 lbs fat, ≈158 lbs lean)",
  target: "178–182 lbs · 11–12% body fat",
  framing: "This isn't weight loss — it's fat loss while holding every pound of muscle.",
  coreIdea: [
    "Moderate calorie deficit (not aggressive) so the body has little reason to burn muscle for fuel.",
    "Heavy, progressive resistance training that signals 'keep this muscle, it is being used.'",
    "Cardio and steps support, but in a deficit diet drives the fat loss and lifting protects the muscle.",
  ],
};

export const NUTRITION_FRAMEWORK = {
  protein: "175–190g/day — the single most important number for keeping muscle in a deficit.",
  calories: "2,050–2,150/day. Sample day in Full Meal Plan hits ~2,020 cal with treat.",
  fats: "60–80g/day.",
  carbs: "120–160g/day — flexible. Time more around training days.",
  fiber: "25g or more per day.",
  adjustmentRules: [
    "Weigh daily, first thing, and track the 7-day average.",
    "Weekly average dropping 1–1.5 lbs → hold steady.",
    "Stalls for 10–14 days → drop calories ~150 or add conditioning.",
    "Dropping faster than ~1.7 lbs/week → eat a bit more. Faster costs you muscle.",
  ],
};

export const FAST_START = {
  window: "First 3 weeks · 21 days",
  why: "Get the scale moving and clothes fitting better the right way. Early drop is partly water + bloat on top of fat — you feel it before you see it.",
  rules: [
    { title: "Protein first, every meal", detail: "175–190g/day. Blunts hunger and protects muscle while you lose." },
    { title: "Cut added sugar + most packaged carbs", detail: "Lowers calories without counting every one and sheds water weight fast. Have the one cookie, not the sleeve." },
    { title: "Hydrate hard", detail: "3–4 L water/day. More water actually reduces water retention — less puffy." },
    { title: "20 minutes of daily reps", detail: "Every day. Consistency is the whole engine." },
    { title: "Sleep 7–8 hours", detail: "Short sleep raises hunger and makes fat loss harder. A real lever." },
  ],
  expect: "Scale may drop 4–7 lbs in the first two weeks, then settle to ~1–1.5 lbs/week. Don't chase week-one rate by eating less and less — steady keeps the loss muscle-sparing.",
};

export type ProgramPhase = {
  phase: string;
  title: string;
  status: string;
  cls: "orange" | "green" | "grey";
  points: string[];
};

export const PROGRAM_PHASES: ProgramPhase[] = [
  {
    phase: "Phase 1",
    title: "Foot still healing",
    status: "Now · in / transitioning out of the boot",
    cls: "orange",
    points: [
      "Upper body: full program, go hard. Build momentum here.",
      "Lower days become seated leg curl + leg extension (light, pain-free range only), plus core and extra arm work. No loaded standing movements, no impact.",
      "Conditioning: upper-body ergometer (arm bike), seated cardio, swimming if cleared.",
      "Low step count means the deficit comes mostly from the kitchen — be tight on nutrition.",
    ],
  },
  {
    phase: "Phase 2",
    title: "Cleared for loading",
    status: "Target July · when Lifetime starts",
    cls: "grey",
    points: [
      "Reintroduce lower body gradually: leg press, RDLs, goblet squats — pain-free range, light before heavy.",
      "Add low-impact conditioning: incline walking, bike, elliptical.",
      "Build step count back up. Steps are your friend for fat loss.",
    ],
  },
  {
    phase: "Phase 3",
    title: "Foot fully recovered",
    status: "Target August",
    cls: "grey",
    points: [
      "Full program, full loading.",
      "Optional higher-intensity conditioning once the foot is 100%.",
      "This is where you push the final lean-out.",
    ],
  },
];

export const DAILY_REPS = {
  intro: "Skye Mackintosh style — 20 minutes every day, minimal equipment, consistency over intensity, adapted to the healing foot. The recommended way to run Phase 1.",
  rules: [
    "Show up every day. 20 minutes. The daily habit is the point, not any single session.",
    "Keep it submaximal. Stop a rep or two short of failure — you train daily, so never grind to exhaustion.",
    "Slow the lowering: 3–4 seconds down on every rep. Eccentric emphasis = more strength for less fatigue, and it costs nothing.",
  ],
  footRule: "No jumping, no jump squats, no loaded standing legs. Do the push-ups, skip the jumps until cleared. Daily work stays upper body + core until the foot heals, then legs and treadmill walking fold in.",
  rotation: [
    { day: "1", focus: "Push", moves: "TRX/floor push-ups, KB or band overhead press, band lateral raise, band triceps extension" },
    { day: "2", focus: "Pull", moves: "TRX rows, single-arm KB row, band face pull, band or TRX curl" },
    { day: "3", focus: "Core + carry", moves: "KB carries (if standing tolerated) or seated KB press-outs, hollow hold, dead bug, plank" },
    { day: "4", focus: "Push variation", moves: "Feet-elevated push-ups, KB floor press, band front raise, overhead triceps" },
    { day: "5", focus: "Pull variation", moves: "Wide TRX row, band pull-apart, light KB high pull, hammer curl" },
    { day: "6", focus: "Full upper", moves: "Push-up, TRX row, KB press, curl-to-pushdown superset" },
    { day: "7", focus: "Easy day", moves: "Mobility, band pull-aparts, light core, breathing. Still show up — gentle" },
  ],
  graduation: "When cleared, add 10 min treadmill walking after each session and fold lower-body moves into Days 3 & 7. At Lifetime (August), graduate to the Phase 2/3 gym workouts.",
};

export type HomeWorkout = {
  id: string;
  title: string;
  exercises: { name: string; scheme: string }[];
};

export const HOME_PROGRAM_TIPS = {
  gear: "TRX, resistance bands, kettlebell, yoga mat, walking treadmill.",
  goal: "Maintain muscle through the cut while the foot heals. Bands/bodyweight can't load as heavy as a gym, so keep the stimulus high with tempo, pauses, leverage, and reps.",
  howToWork: [
    "Slow the lowering phase to 3–4 seconds.",
    "Add a 1–2 second pause at the hardest point.",
    "Push closer to failure than with heavy weights (1 rep in reserve on most sets).",
    "Shorten rest to 45–75 seconds.",
    "TRX: walk feet forward to make rows/presses harder. Bands: shorten grip or stack a second band.",
  ],
  rotation: "Run as a 3–4 day rotation: A, B, C, repeat — with a rest or light day between as the foot needs.",
};

export const HOME_PROGRAM: HomeWorkout[] = [
  {
    id: "A",
    title: "Home Day A — Push + Core",
    exercises: [
      { name: "TRX push-up or feet-elevated push-up", scheme: "4 × 8–15" },
      { name: "KB floor press or band chest press", scheme: "3 × 10–15" },
      { name: "KB or band overhead press", scheme: "3 × 8–12" },
      { name: "Band lateral raise", scheme: "3 × 15–20" },
      { name: "TRX or band overhead triceps extension", scheme: "3 × 12–15" },
      { name: "Hollow hold + dead bug", scheme: "3 rounds" },
    ],
  },
  {
    id: "B",
    title: "Home Day B — Pull + Core",
    exercises: [
      { name: "TRX row (lean back further to add difficulty)", scheme: "4 × 8–15" },
      { name: "Single-arm KB row (supported, knee braced)", scheme: "3 × 8–12" },
      { name: "Band face pull or pull-apart", scheme: "3 × 15–20" },
      { name: "TRX or band biceps curl", scheme: "3 × 10–15" },
      { name: "KB or band shrug", scheme: "3 × 12–15" },
      { name: "Plank + side plank", scheme: "3 rounds" },
    ],
  },
  {
    id: "C",
    title: "Home Day C — Full Upper + Core",
    exercises: [
      { name: "TRX push-up", scheme: "3 × 10–15" },
      { name: "TRX row", scheme: "3 × 10–15" },
      { name: "KB overhead press", scheme: "3 × 8–12" },
      { name: "Band curl + band pushdown superset", scheme: "3 × 12–15 each" },
      { name: "Band lateral raise", scheme: "3 × 15–20" },
      { name: "Ab circuit (leg raise, dead bug, hollow hold)", scheme: "3 rounds" },
    ],
  },
];

export const HOME_LOWER_NOTE = "Hold off on loaded lower-body work until the foot is cleared — most home lower moves push weight through the foot. If PT clears gentle non-weight-bearing work, lying band leg curls (pain-free) are safest. Otherwise wait for Phase 2. Your legs hold their muscle fine for a few weeks and you make it back fast once you load them again.";

export const GYM_SPLIT = {
  intro: "Kicks in at Lifetime once the foot is cleared (target August). Each muscle group hit twice a week — ideal for building and retaining muscle in a cut.",
  repGuide: "5–8 builds strength · 8–15 builds size · 15+ builds endurance/pump. All sets stop 1–2 reps short of failure except the final set of isolation work.",
  schedule: [
    { day: "Mon", focus: "Upper A (strength lean)" },
    { day: "Tue", focus: "Lower A" },
    { day: "Wed", focus: "Conditioning / rest" },
    { day: "Thu", focus: "Upper B (hypertrophy lean)" },
    { day: "Fri", focus: "Lower B" },
    { day: "Sat", focus: "Conditioning + light rest" },
    { day: "Sun", focus: "Rest" },
  ],
  scaling: "3 days: Upper A / Lower A / Upper B, rotating the lower day weekly. 5 days: add an arms + delts + core day Saturday.",
  workouts: [
    {
      id: "UA",
      title: "Upper A (strength lean)",
      exercises: [
        { name: "Barbell or DB bench press", scheme: "4 × 5–8" },
        { name: "Weighted pull-up or lat pulldown", scheme: "4 × 6–10" },
        { name: "Seated DB shoulder press", scheme: "3 × 8–12" },
        { name: "Chest-supported row", scheme: "3 × 8–12" },
        { name: "Incline DB curl", scheme: "3 × 10–15" },
        { name: "Cable tricep pushdown", scheme: "3 × 10–15" },
      ],
    },
    {
      id: "LA",
      title: "Lower A",
      exercises: [
        { name: "Leg press", scheme: "4 × 8–12" },
        { name: "Romanian deadlift", scheme: "3 × 8–12" },
        { name: "Seated leg curl", scheme: "3 × 10–15" },
        { name: "Leg extension", scheme: "3 × 12–15" },
        { name: "Seated calf raise", scheme: "3 × 12–20" },
        { name: "Hanging leg raise or cable crunch", scheme: "3 × 10–15" },
      ],
    },
    {
      id: "UB",
      title: "Upper B (hypertrophy lean)",
      exercises: [
        { name: "Incline DB press", scheme: "4 × 8–12" },
        { name: "Neutral-grip lat pulldown", scheme: "4 × 8–12" },
        { name: "Lateral raises", scheme: "4 × 12–20" },
        { name: "Machine or cable row", scheme: "3 × 10–15" },
        { name: "Face pulls", scheme: "3 × 15–20" },
        { name: "Hammer curl + rope pushdown superset", scheme: "3 × 10–15" },
      ],
    },
    {
      id: "LB",
      title: "Lower B",
      exercises: [
        { name: "Hack squat or goblet squat (pain-free)", scheme: "4 × 8–12" },
        { name: "Hip thrust", scheme: "3 × 8–12" },
        { name: "Walking lunge or split squat (Phase 3)", scheme: "3 × 10–12" },
        { name: "Seated leg curl", scheme: "3 × 12–15" },
        { name: "Standing calf raise", scheme: "3 × 15–20" },
        { name: "Ab wheel or weighted decline crunch", scheme: "3 × 12–15" },
      ],
    },
  ],
  phase1Lower: "Phase 1 version of both lower days: seated leg curl, leg extension (light), cable crunch, ab wheel, plus an extra arm superset. No standing loaded work.",
};

export const CONDITIONING_PHASES = [
  { phase: "Phase 1", detail: "Arm bike or swim, 2–3 sessions of 20–30 min, low to moderate." },
  { phase: "Phase 2", detail: "Incline walk, bike, elliptical, 3–4 sessions of 25–35 min." },
  { phase: "Phase 3", detail: "Same, plus optional intervals (8–10 rounds of 30s hard / 90s easy) once the foot is fully healed." },
];

export const STEP_TARGET = "Once mobile, work toward 8,000–10,000/day — worth 200–400 extra calories burned daily without touching your training.";

export const PROGRESSION = {
  title: "Double Progression",
  points: [
    "For every lift, pick a rep range (say 8–12).",
    "Hit the top of the range on all sets → add weight next time and start back near the bottom.",
    "Track every set: weight, reps, and reps in reserve.",
    "Beat the previous session on at least one metric weekly. In a deficit, even holding your numbers is a win — it means you're keeping muscle.",
  ],
};

export const WEEKLY_REVIEW = {
  daily: ["Bodyweight (+ 7-day average)", "Total calories and protein", "Steps", "Sleep hours"],
  perWorkout: ["Exercise, set, weight, reps, reps-in-reserve", "Session bodypart and phase", "Optional: 1–5 energy/recovery rating"],
  weekly: ["7-day average bodyweight vs last week", "Average daily protein and calories", "Whether lifts went up, held, or dropped"],
  steering: "If weight is dropping ~1–1.5 lbs/week and lifts are holding, do nothing and let it run. If lifts start dropping fast, you're cutting too hard or not eating enough protein.",
};

export type Checkpoint = { date: string; expected: string };

export const CHECKPOINTS: Checkpoint[] = [
  { date: "Now → early July", expected: "Upper body strength climbs, scale starts moving, foot heals." },
  { date: "Mid-July", expected: "Legs back in the program, conditioning ramps." },
  { date: "Birthday (9/7)", expected: "Noticeably leaner and more athletic, likely ~182–185 at ~14–15%." },
  { date: "Late Sept / Oct", expected: "178–180, closing in on 11–12%." },
];

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}
