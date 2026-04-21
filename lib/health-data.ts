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

export const MEALS_PLAN = [
  { time: "6:30–7:30am", name: "BREAKFAST", cals: 500, p: 50, c: 39, f: 21, items: ["4 whole eggs scrambled + 2 whites (30g P)", "1 cup oatmeal + cinnamon (5g P)", "½ cup mixed berries (1g P)", "Black coffee", "Optional: ½ scoop protein in oats"] },
  { time: "10:30am", name: "MID-MORNING SNACK", cals: 250, p: 35, c: 18, f: 5, items: ["1 cup Greek yogurt 2% (17g P)", "1 scoop protein stirred in (25g P)", "Berries or 1 tsp honey", "OR: Cottage cheese + shake"] },
  { time: "12:30–1:30pm", name: "LUNCH", cals: 550, p: 50, c: 50, f: 17, items: ["6 oz grilled chicken breast (42g P)", "1 cup cooked brown rice/quinoa (5g P)", "2 cups roasted veg (broccoli/zucchini)", "1 tbsp olive oil", "Season generously"] },
  { time: "3:30–4:00pm", name: "PRE-WORKOUT SNACK", cals: 200, p: 10, c: 30, f: 8, items: ["1 medium banana", "1 tbsp natural peanut/almond butter", "OR apple + string cheese", "Eat 45–60 min before lift"] },
  { time: "Post-Workout", name: "POST-WORKOUT SHAKE", cals: 200, p: 30, c: 10, f: 3, items: ["1–1.5 scoops whey in water/almond milk", "Optional: ½ banana", "Within 60–90 min of finishing"] },
  { time: "6:30–7:30pm", name: "DINNER", cals: 550, p: 45, c: 35, f: 18, items: ["6 oz salmon (34g P, 13g F)", "OR 6 oz lean ground beef 90/10", "1 medium sweet potato", "Large salad + olive oil + lemon", "Optional: ¼ avocado"] },
  { time: "8:30pm", name: "EVENING SNACK (optional)", cals: 150, p: 20, c: 6, f: 2, items: ["1 cup cottage cheese (25g casein)", "Slow-release through night", "Skip if already at calories", "Moon Brew 30–45 min before sleep"] }
];

export const LABS_2023 = [
  { marker: "Total Testosterone", result: "468 ng/dL", range: "250–827", pct: "38th", verdict: "Low-normal", cls: "orange" },
  { marker: "Free Testosterone", result: "68.5 pg/mL", range: "46–224", pct: "13th", verdict: "Functionally low", cls: "red" },
  { marker: "Bioavailable T", result: "146.9 ng/dL", range: "110–575", pct: "8th", verdict: "Functionally low", cls: "red" },
  { marker: "SHBG", result: "29 nmol/L", range: "10–50", pct: "48th", verdict: "Good (midrange)", cls: "green" },
  { marker: "Albumin", result: "4.7 g/dL", range: "3.6–5.1", pct: "73rd", verdict: "Good", cls: "green" }
];

export const RETEST_PANEL = [
  { test: "Total Testosterone", target: "600–900 ng/dL", why: "Your baseline was 468. Optimal body comp + energy" },
  { test: "Free Testosterone", target: ">100 pg/mL", why: "Drives recovery, muscle, drive" },
  { test: "Bioavailable T", target: ">300 ng/dL", why: "True production reflection" },
  { test: "SHBG", target: "10–40 nmol/L", why: "Was good at 29 — track" },
  { test: "Estradiol (sensitive)", target: "20–30 pg/mL", why: "As T rises, E2 may follow" },
  { test: "LH + FSH", target: "Normal range", why: "Brain-testes signaling check" },
  { test: "Thyroid (TSH, T3, T4)", target: "TSH 0.5–2.5", why: "Fatigue + weight differential" },
  { test: "Vitamin D", target: ">50 ng/mL", why: "Critical for T, mood, muscle" },
  { test: "Ferritin + CBC", target: "Ferritin >50", why: "Iron stores affect energy" },
  { test: "Fasting Insulin + HbA1c", target: "Normal", why: "Blood sugar / body comp" },
  { test: "hs-CRP", target: "<1.0 mg/L", why: "Chronic inflammation check" }
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
  { t: "7:45 am", type: "work", what: "OUT THE DOOR", d: "Normal departure." },
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
  { t: "6:45 am", type: "work", what: "OUT THE DOOR", d: "Leave ~45–60 min earlier so you can leave work by 3:30pm." },
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

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}
