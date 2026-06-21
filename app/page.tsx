'use client';
import { useState, useEffect } from 'react';
import './globals.css';
import { WORKOUTS, SUPPLEMENTS_DAILY, DATES, BASELINE, TARGETS, NON_NEGOTIABLES, daysUntil, MEALS_PLAN, LAB_COMPARISONS, LABS_MAY_2026_DRAWN, RETEST_PANEL, PELOTON_DAY, LIFTING_DAY, FOOD_PRESETS, FOOD_CATEGORIES, RECOMP_GOAL, NUTRITION_FRAMEWORK, FAST_START, PROGRAM_PHASES, DAILY_REPS, HOME_PROGRAM, HOME_PROGRAM_TIPS, HOME_LOWER_NOTE, GYM_SPLIT, CONDITIONING_PHASES, STEP_TARGET, PROGRESSION, WEEKLY_REVIEW, CHECKPOINTS } from '@/lib/health-data';
import { getMilestones, getNextMilestone, getUpNext, progressPct, progressColor, macroCalories } from '@/lib/tracking-helpers';
import type { FoodPreset, LabComparison } from '@/lib/health-data';

const STORE_KEY = "brandon_gameplan_v1";

type LabFilter = 'optimal' | 'watch' | 'follow';

function matchesLabFilter(lab: LabComparison, filter: LabFilter | null): boolean {
  if (!filter) return true;
  if (filter === 'optimal') return ['Optimal', 'Good'].includes(lab.verdict2026);
  if (filter === 'watch') return lab.verdict2026 === 'Watch' || lab.verdict2026.includes('Mid-range');
  return lab.verdict2026 === 'Follow-up' || lab.verdict2026.includes('Retest');
}

const NAV_SECTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'train', label: 'Train' },
  { id: 'plan', label: 'Plan' },
  { id: 'labs', label: 'Labs' },
  { id: 'home', label: 'Home' },
] as const;

type SectionId = (typeof NAV_SECTIONS)[number]['id'];

function ProgressBar({ current, target, label }: { current: number; target: number; label: string }) {
  const pct = progressPct(current, target);
  const color = progressColor(pct);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#a09ccc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
        <span>{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState<any>({});
  const [currentSection, setCurrentSection] = useState<SectionId>('today');
  const [currentWorkout, setCurrentWorkout] = useState<'A' | 'B' | 'C'>('A');
  const [mealPlanOpen, setMealPlanOpen] = useState(false);
  const [collapsedLabs, setCollapsedLabs] = useState<Record<string, boolean>>({});
  const [labFilter, setLabFilter] = useState<LabFilter | null>(null);
  const [retestOpen, setRetestOpen] = useState(false);
  const [collapsedPlan, setCollapsedPlan] = useState<Record<string, boolean>>({});
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [currentHome, setCurrentHome] = useState<'A' | 'B' | 'C'>('A');
  const [currentGym, setCurrentGym] = useState<'UA' | 'LA' | 'UB' | 'LB'>('UA');
  const [now, setNow] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) setState(JSON.parse(saved));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && Object.keys(state).length > 0) {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    }
  }, [state, mounted]);

  const todayKey = () => new Date().toISOString().slice(0, 10);

  const emptyDay = () => ({
    supps: {},
    water: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    foodLog: [] as any[],
    meals: {},
    workout: {},
    notes: '',
    weight: null,
  });

  const getDayFrom = (days: Record<string, any>, key: string) => {
    const existing = days[key] || emptyDay();
    return {
      ...existing,
      supps: { ...(existing.supps || {}) },
      foodLog: [...(existing.foodLog || [])],
    };
  };

  const updateState = (updater: (prev: any) => any) => {
    setState((prev: any) => ({ ...updater(prev) }));
  };

  const toggleWater = (index: number) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...(prev.days || {}) };
      const existing = days[key] || emptyDay();
      const d = { ...existing, supps: { ...(existing.supps || {}) } };
      const filled = d.water ?? 0; // water = number of 8oz glasses filled
      // Tap filled glass → set count to index (0 clears the first glass)
      d.water = index < filled ? index : index + 1;
      days[key] = d;
      return { ...prev, days };
    });
  };

  const addProtein = (amount: number) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...(prev.days || {}) };
      const d = getDayFrom(days, key);
      if (amount === -999) d.protein = 0;
      else d.protein = Math.max(0, (d.protein || 0) + amount);
      days[key] = d;
      return { ...prev, days };
    });
  };

  const toggleSupp = (id: string) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...(prev.days || {}) };
      const d = getDayFrom(days, key);
      d.supps = { ...d.supps, [id]: !d.supps[id] };
      days[key] = d;
      return { ...prev, days };
    });
  };

  const addFoodPreset = (preset: FoodPreset) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...(prev.days || {}) };
      const d = getDayFrom(days, key);
      d.carbs = (d.carbs || 0) + preset.c;
      d.fat = (d.fat || 0) + preset.f;
      d.protein = (d.protein || 0) + preset.p;
      d.foodLog.push({
        id: `${preset.id}-${Date.now()}`,
        label: preset.label,
        p: preset.p,
        c: preset.c,
        f: preset.f,
        at: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      });
      days[key] = d;
      return { ...prev, days };
    });
  };

  const removeFoodLogEntry = (entryId: string) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...(prev.days || {}) };
      const d = getDayFrom(days, key);
      const entry = d.foodLog.find((e: any) => e.id === entryId);
      if (!entry) return prev;
      d.carbs = Math.max(0, (d.carbs || 0) - entry.c);
      d.fat = Math.max(0, (d.fat || 0) - entry.f);
      d.protein = Math.max(0, (d.protein || 0) - entry.p);
      d.foodLog = d.foodLog.filter((e: any) => e.id !== entryId);
      days[key] = d;
      return { ...prev, days };
    });
  };

  const resetFuel = () => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...(prev.days || {}) };
      const d = getDayFrom(days, key);
      const proteinFromFood = d.foodLog.reduce((sum: number, entry: any) => sum + (entry.p || 0), 0);
      d.carbs = 0;
      d.fat = 0;
      d.protein = Math.max(0, (d.protein || 0) - proteinFromFood);
      d.foodLog = [];
      days[key] = d;
      return { ...prev, days };
    });
  };

  const resetMacro = (macro: 'calories' | 'protein' | 'carbs' | 'fat') => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...(prev.days || {}) };
      const d = getDayFrom(days, key);
      const log = d.foodLog || [];

      if (macro === 'calories' && log.length > 0) {
        const last = log[log.length - 1];
        d.protein = Math.max(0, (d.protein || 0) - (last.p || 0));
        d.carbs = Math.max(0, (d.carbs || 0) - (last.c || 0));
        d.fat = Math.max(0, (d.fat || 0) - (last.f || 0));
        d.foodLog = log.slice(0, -1);
      } else if (macro === 'protein') {
        const proteinFromFood = log.reduce((sum: number, entry: any) => sum + (entry.p || 0), 0);
        d.protein = Math.max(0, (d.protein || 0) - proteinFromFood);
      } else if (macro === 'carbs') {
        const carbsFromFood = log.reduce((sum: number, entry: any) => sum + (entry.c || 0), 0);
        d.carbs = Math.max(0, (d.carbs || 0) - carbsFromFood);
      } else if (macro === 'fat') {
        const fatFromFood = log.reduce((sum: number, entry: any) => sum + (entry.f || 0), 0);
        d.fat = Math.max(0, (d.fat || 0) - fatFromFood);
      }

      days[key] = d;
      return { ...prev, days };
    });
  };

  const macroResetStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #3a3778',
    color: '#a09ccc',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    cursor: 'pointer',
    marginTop: 8,
    width: '100%',
  };

  const toggleMeal = (mealName: string) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...(prev.days || {}) };
      const d = getDayFrom(days, key);
      d.meals = { ...(d.meals || {}), [mealName]: !d.meals?.[mealName] };
      days[key] = d;
      return { ...prev, days };
    });
  };

  if (!mounted) {
    return (
      <div style={{ background: '#13112e', minHeight: '100vh', color: '#ede9e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  const today = state.days?.[todayKey()] ?? emptyDay();
  const todayCalories = macroCalories(today.protein || 0, today.carbs || 0, today.fat || 0);
  const waterDots = 12; // 12 drops × 8oz = 96oz
  const targetWater = 96; // 96 oz total
  const targetProtein = 190;
  const suppsDone = Object.values(today.supps || {}).filter(Boolean).length;
  const suppsTotal = SUPPLEMENTS_DAILY.filter(s => s.tier === 1).length;

  // Calculate streak (consecutive days hitting goals)
  const calculateStreak = () => {
    if (!state.days) return 0;
    let streak = 0;
    const currentDate = new Date();
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() - i);
      const key = checkDate.toISOString().slice(0, 10);
      const day = state.days[key];
      
      if (!day) break;
      
      const waterGoal = (day.water || 0) >= 3; // At least 3L
      const proteinGoal = (day.protein || 0) >= 170; // At least 170g (90% of target)
      const suppGoal = Object.values(day.supps || {}).filter(Boolean).length >= 6; // At least 6 supps
      
      if (waterGoal && proteinGoal && suppGoal) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  const labColor = (cls: string | null) => {
    if (cls === 'red') return '#ff3b2d';
    if (cls === 'orange') return '#ff4e1b';
    if (cls === 'green') return '#5fc878';
    return '#6864a0';
  };

  const phaseColor = (cls: string) => {
    if (cls === 'orange') return '#ff4e1b';
    if (cls === 'green') return '#5fc878';
    return '#6864a0';
  };

  const planSectionOpen = (key: string, defaultOpen = false) => collapsedPlan[key] ?? defaultOpen;
  const togglePlan = (key: string) => setCollapsedPlan((prev) => ({ ...prev, [key]: !planSectionOpen(key, key === 'phases') }));

  const labCategories = Array.from(new Set(LAB_COMPARISONS.map((lab) => lab.category)));
  const milestones = getMilestones();
  const nextMilestone = getNextMilestone();
  const tierOneSupps = SUPPLEMENTS_DAILY.filter((s) => s.tier === 1);
  const foodLog = today.foodLog || [];

  const labSummary = {
    optimal: LAB_COMPARISONS.filter((l) => matchesLabFilter(l, 'optimal')).length,
    watch: LAB_COMPARISONS.filter((l) => matchesLabFilter(l, 'watch')).length,
    follow: LAB_COMPARISONS.filter((l) => matchesLabFilter(l, 'follow')).length,
  };

  const handleLabFilter = (filter: LabFilter) => {
    const next = labFilter === filter ? null : filter;
    setLabFilter(next);
    if (next) {
      const openCats: Record<string, boolean> = {};
      labCategories.forEach((cat) => {
        openCats[cat] = LAB_COMPARISONS.some(
          (l) => l.category === cat && matchesLabFilter(l, next)
        );
      });
      setCollapsedLabs(openCats);
    }
  };

  const filteredLabCount = labFilter ? labSummary[labFilter] : LAB_COMPARISONS.length;

  const renderNavButton = (id: SectionId, label: string, compact = false) => (
    <button
      key={id}
      onClick={() => setCurrentSection(id)}
      className={currentSection === id ? 'active' : undefined}
      style={{
        background: compact ? undefined : 'transparent',
        border: 'none',
        color: currentSection === id ? '#ff4e1b' : '#a09ccc',
        padding: compact ? undefined : '10px 14px',
        fontSize: compact ? undefined : 12,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: compact ? undefined : '1.2px',
        cursor: 'pointer',
        borderBottom: compact ? undefined : currentSection === id ? '2px solid #ff4e1b' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(19,17,46,.88)', backdropFilter: 'blur(18px)', borderBottom: '1px solid #2e2b5e' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: 12 }}>
          <div style={{ fontFamily: '"Archivo Black","Inter Black",-apple-system,sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: '.5px', textTransform: 'uppercase', fontStyle: 'italic', transform: 'skewX(-6deg)', flexShrink: 0 }}>
            BRANDON<span style={{ color: '#ff4e1b' }}>.FIT</span>
          </div>
          <div className="nav-clock" aria-live="polite">
            <div className="nav-clock-time">
              {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="nav-clock-date">
              {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="top-nav-links">
            {NAV_SECTIONS.map((s) => renderNavButton(s.id, s.label))}
          </div>
        </div>
      </nav>

      <div style={{ height: 2, background: 'linear-gradient(90deg,#ff4e1b 0%,#ff4e1b 45%,#5d58c7 100%)' }} />

      <main className="app-main">
        {currentSection === 'home' && (
          <div>
            <div style={{ background: 'radial-gradient(circle at 80% 20%,rgba(255,78,27,.32) 0%,transparent 50%),radial-gradient(circle at 15% 85%,rgba(93,88,199,.4) 0%,transparent 55%),linear-gradient(135deg,#1c1945 0%,#252352 60%,#2e2466 100%)', border: '1px solid #2e2b5e', borderRadius: 4, padding: '48px 36px', marginBottom: 22, borderLeft: '4px solid #ff4e1b' }}>
              <h4 style={{ color: '#ff4e1b', marginBottom: 16, fontSize: 12, letterSpacing: 3, fontWeight: 800 }}>— THE BRANDON PROJECT · 2026</h4>
              <h1 className="hero-title" style={{ fontSize: 72, lineHeight: 0.9, letterSpacing: -3, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic' }}>
                NO DAYS<br />OFF<span style={{ color: '#ff4e1b' }}>.</span>
              </h1>
              <div style={{ color: '#ede9e0', opacity: 0.85, marginTop: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
                HEALTH · FITNESS · FUEL · HORMONES — BIRTHDAY SEPT 2026
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 28 }}>
                <div style={{ background: 'rgba(26,24,64,.55)', backdropFilter: 'blur(6px)', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, fontWeight: 800 }}>TODAY</div>
                  <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, fontStyle: 'italic', letterSpacing: -2, color: '#ede9e0', marginTop: 8 }}>{todayKey()}</div>
                </div>
                <div style={{ background: 'radial-gradient(circle at 50% 120%,rgba(95,200,120,.22) 0%,transparent 60%),rgba(26,24,64,.55)', border: '1px solid #5fc878', borderRadius: 4, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, fontStyle: 'italic', letterSpacing: -2, color: '#5fc878' }}>
                    {streak}
                    <span style={{ fontSize: 16, marginLeft: 4 }}>🔥</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, fontWeight: 800 }}>Day Streak</div>
                </div>
                <div style={{ background: 'radial-gradient(circle at 50% 120%,rgba(255,78,27,.22) 0%,transparent 60%),rgba(26,24,64,.55)', border: '1px solid #ff4e1b', borderRadius: 4, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, fontStyle: 'italic', letterSpacing: -2, color: '#ff4e1b' }}>
                    {milestones.find((m) => m.label === 'Phase 1')!.days < 0 ? '✓' : milestones.find((m) => m.label === 'Phase 1')!.days}
                  </div>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, fontWeight: 800 }}>
                    {milestones.find((m) => m.label === 'Phase 1')!.days < 0 ? 'Phase 1 Complete' : 'Days to Phase 1 End'}
                  </div>
                </div>
                <div style={{ background: 'rgba(26,24,64,.55)', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, fontStyle: 'italic', letterSpacing: -2, color: '#ede9e0' }}>
                    {nextMilestone ? nextMilestone.days : '✓'}
                  </div>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, fontWeight: 800 }}>
                    {nextMilestone ? `Days to ${nextMilestone.label}` : 'All milestones passed'}
                  </div>
                </div>
                <div style={{ background: 'rgba(26,24,64,.55)', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, fontStyle: 'italic', letterSpacing: -2, color: '#ede9e0' }}>{daysUntil(DATES.birthday) >= 0 ? daysUntil(DATES.birthday) : '✓'}</div>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, fontWeight: 800 }}>Days to Birthday</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 26 }}>
                <h3 style={{ fontSize: 17, marginBottom: 14, fontWeight: 900, textTransform: 'uppercase' }}>Live Numbers</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: '#ede9e0' }}>
                      {Math.round((today.water || 0) * 8)}<span style={{ fontSize: 14, color: '#a09ccc' }}> / {targetWater} oz</span>
                    </div>
                    <ProgressBar current={(today.water || 0) * 8} target={targetWater} label="Water" />
                  </div>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: '#ede9e0' }}>
                      {today.protein || 0}<span style={{ fontSize: 14, color: '#a09ccc' }}> / {targetProtein}g</span>
                    </div>
                    <ProgressBar current={today.protein || 0} target={targetProtein} label="Protein" />
                  </div>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: '#ede9e0' }}>
                      {suppsDone}<span style={{ fontSize: 14, color: '#a09ccc' }}> / {suppsTotal}</span>
                    </div>
                    <ProgressBar current={suppsDone} target={suppsTotal} label="Supplements" />
                  </div>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: '#ede9e0' }}>
                      {todayCalories}<span style={{ fontSize: 14, color: '#a09ccc' }}> / {TARGETS.cals}</span>
                    </div>
                    <ProgressBar current={todayCalories} target={TARGETS.cals} label="Calories" />
                  </div>
                </div>
                <p style={{ marginTop: 18, fontSize: 13, color: '#a09ccc' }}>
                  Head to <button onClick={() => setCurrentSection('today')} style={{ background: 'none', border: 'none', color: '#ff4e1b', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Today →</button> to attack the checklist.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentSection === 'today' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>TODAY</h1>
            {(() => {
              const dayOfWeek = new Date().getDay();
              const isLiftDay = [1, 3, 5].includes(dayOfWeek);
              const dayType = isLiftDay ? 'LIFTING DAY' : 'PELOTON DAY';
              const rawSchedule = isLiftDay ? LIFTING_DAY : PELOTON_DAY;
              // Filter out individual supplement cards (keep only comprehensive "SUPPLEMENTS" cards)
              const schedule = rawSchedule.filter(item => {
                const isIndividualSupp = item.type === 'supp' && !item.what.toLowerCase().includes('supplements');
                return !isIndividualSupp;
              });
              const upNext = getUpNext(schedule);

              return (
                <>
                  <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} · {dayType}
                  </div>

                  {upNext && (
                    <div style={{ background: 'linear-gradient(135deg,#1e1c47,#262358)', border: '1px solid #ff4e1b', borderLeft: '4px solid #ff4e1b', borderRadius: 4, padding: '16px 18px', marginBottom: 20 }}>
                      <div style={{ fontSize: 10, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 6 }}>Up Next</div>
                      <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', color: '#ede9e0' }}>{upNext.t} — {upNext.what}</div>
                      <div style={{ fontSize: 13, color: '#a09ccc', marginTop: 6 }}>{upNext.d}</div>
                    </div>
                  )}

                  {isLiftDay && (
                    <button
                      onClick={() => setCurrentSection('train')}
                      style={{ width: '100%', background: '#ff4e1b', border: 'none', color: '#fff', padding: '14px 18px', borderRadius: 4, fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', marginBottom: 20 }}
                    >
                      Log Today&apos;s Workout →
                    </button>
                  )}

                  {/* Daily trackers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                    {/* Water */}
                    <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20 }}>
                      <h3 style={{ fontSize: 15, marginBottom: 4, fontWeight: 900, textTransform: 'uppercase' }}>
                        WATER · {Math.round((today.water || 0) * 8)} / 96 OZ
                      </h3>
                      <ProgressBar current={(today.water || 0) * 8} target={targetWater} label="Progress" />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {Array.from({ length: 16 }, (_, idx) => (
                          <div
                            key={idx}
                            onClick={() => toggleWater(idx)}
                            style={{
                              width: 28,
                              height: 36,
                              borderRadius: '0 0 50% 50% / 0 0 40% 40%',
                              border: '2px solid #3a3778',
                              background: idx < (today.water || 0) ? '#ede9e0' : 'transparent',
                              cursor: 'pointer',
                              transition: 'all .15s'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Protein */}
                    <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20 }}>
                      <h3 style={{ fontSize: 15, marginBottom: 4, fontWeight: 900, textTransform: 'uppercase' }}>
                        PROTEIN · {today.protein || 0} / 190G
                      </h3>
                      <ProgressBar current={today.protein || 0} target={targetProtein} label="Progress" />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {[
                          { label: '+18 3 EGGS', val: 18 },
                          { label: '+25 SHAKE', val: 25 },
                          { label: '+25 COTTAGE', val: 25 },
                          { label: '+52 CHICKEN', val: 52 },
                          { label: '+55 SIRLOIN', val: 55 },
                          { label: '+40 SALMON', val: 40 },
                          { label: '+17 YOGURT', val: 17 }
                        ].map(btn => (
                          <button
                            key={btn.label}
                            onClick={() => addProtein(btn.val)}
                            style={{
                              background: '#262358',
                              border: '1px solid #3a3778',
                              color: '#ede9e0',
                              padding: '6px 10px',
                              borderRadius: 2,
                              fontSize: 11,
                              fontWeight: 900,
                              cursor: 'pointer'
                            }}
                          >
                            {btn.label}
                          </button>
                        ))}
                        <button
                          onClick={() => addProtein(-999)}
                          style={{
                            background: '#ff3b2d',
                            border: '1px solid #ff3b2d',
                            color: '#ede9e0',
                            padding: '6px 10px',
                            borderRadius: 2,
                            fontSize: 11,
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          RESET
                        </button>
                      </div>
                    </div>

                    {/* Supplements — upfront checklist */}
                    <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20, gridColumn: '1 / -1' }}>
                      <h3 style={{ fontSize: 15, marginBottom: 4, fontWeight: 900, textTransform: 'uppercase' }}>
                        SUPPLEMENTS · {suppsDone} / {suppsTotal}
                      </h3>
                      <ProgressBar current={suppsDone} target={suppsTotal} label="Progress" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginTop: 14 }}>
                        {tierOneSupps.map((s) => {
                          const done = today.supps?.[s.id];
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSupp(s.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 12px',
                                borderRadius: 4,
                                background: done ? 'rgba(255,78,27,.08)' : '#1a1840',
                                border: `1px solid ${done ? 'rgba(255,78,27,.35)' : '#2e2b5e'}`,
                                cursor: 'pointer',
                                width: '100%',
                                textAlign: 'left',
                                fontFamily: 'inherit',
                                color: 'inherit',
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{
                                  width: 18,
                                  height: 18,
                                  flexShrink: 0,
                                  borderRadius: 2,
                                  border: `2px solid ${done ? '#ff4e1b' : '#3a3778'}`,
                                  background: done ? '#ff4e1b' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  color: '#fff',
                                  fontWeight: 900,
                                }}
                              >
                                {done ? '✓' : ''}
                              </span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: done ? '#6864a0' : '#ede9e0', textDecoration: done ? 'line-through' : 'none' }}>{s.name}</div>
                                <div style={{ fontSize: 10, color: '#6864a0' }}>{s.dose}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Cards */}
                  <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 16 }}>TODAY'S SCHEDULE</h2>
                  
                  {schedule.map((item, i) => {
                    const taskKey = `task-${todayKey()}-${i}`;
                    const taskDone = state.tasks?.[taskKey] || false;
                    
                    // Determine if we need a time block header
                    const timeHour = parseInt(item.t.split(':')[0]);
                    const prevTimeHour = i > 0 ? parseInt(schedule[i-1].t.split(':')[0]) : -1;
                    let showHeader = '';
                    
                    if (i === 0 || (timeHour >= 5 && prevTimeHour < 5)) {
                      showHeader = '🌅 MORNING ROUTINE (5:00-7:30 AM)';
                    } else if (timeHour >= 8 && prevTimeHour < 8) {
                      showHeader = '💼 WORK (8:00 AM-3:30 PM)';
                    } else if (timeHour >= 15 && prevTimeHour < 15) {
                      showHeader = '🏋️ TRAINING (3:00-5:30 PM)';
                    } else if (timeHour >= 17 && prevTimeHour < 17) {
                      showHeader = '🍽️ EVENING (5:30-8:00 PM)';
                    } else if (timeHour >= 20 && prevTimeHour < 20) {
                      showHeader = '🌙 WIND DOWN (8:00-9:30 PM)';
                    }
                    
                    // Only show supplements for cards with "SUPPLEMENTS" (plural) in title
                    let suppGroup: any[] = [];
                    
                    // Only show supplement list if card title mentions "SUPPLEMENTS" (comprehensive cards only)
                    if (item.what.toLowerCase().includes('supplements')) {
                      const timeHour = parseInt(item.t.split(':')[0]);
                      
                      if (timeHour >= 5 && timeHour < 8) {
                        suppGroup = SUPPLEMENTS_DAILY.filter(s => 
                          s.when.toLowerCase().includes('morning') || 
                          s.when.toLowerCase().includes('breakfast') ||
                          s.when.toLowerCase().includes('empty stomach')
                        );
                      } else if (item.what.toLowerCase().includes('post-workout')) {
                        suppGroup = SUPPLEMENTS_DAILY.filter(s => 
                          s.when.toLowerCase().includes('post-workout') || 
                          s.when.toLowerCase().includes('sweat')
                        );
                      } else if (timeHour >= 18 && timeHour < 20) {
                        suppGroup = SUPPLEMENTS_DAILY.filter(s => 
                          s.when.toLowerCase().includes('dinner')
                        );
                      } else if (timeHour >= 20 || timeHour < 5) {
                        suppGroup = SUPPLEMENTS_DAILY.filter(s => 
                          s.when.toLowerCase().includes('bed') || 
                          s.when.toLowerCase().includes('before sleep')
                        );
                      }
                    }

                    return (
                      <>
                        {showHeader && (
                          <div style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', color: '#ff4e1b', marginTop: i === 0 ? 0 : 28, marginBottom: 14, letterSpacing: '1.5px', paddingLeft: 4 }}>
                            {showHeader}
                          </div>
                        )}
                        <div
                          key={i}
                        onClick={() => {
                          updateState((prev: any) => {
                            const tasks = { ...prev.tasks };
                            tasks[taskKey] = !tasks[taskKey];
                            return { ...prev, tasks };
                          });
                        }}
                        style={{
                          background: taskDone ? 'rgba(255,78,27,.08)' : '#1e1c47',
                          border: `1px solid ${taskDone ? 'rgba(255,78,27,.35)' : '#2e2b5e'}`,
                          borderLeft: `3px solid ${taskDone ? '#ff4e1b' : item.type === 'exercise' ? '#ff4e1b' : item.type === 'food' ? '#5fc878' : item.type === 'supp' ? '#c9a96e' : '#2e2b5e'}`,
                          borderRadius: 4,
                          padding: 20,
                          marginBottom: 12,
                          cursor: 'pointer',
                          transition: 'all .15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                          <input
                            type="checkbox"
                            checked={taskDone}
                            readOnly
                            style={{
                              width: 22,
                              height: 22,
                              border: '2px solid #3a3778',
                              borderRadius: 2,
                              flexShrink: 0,
                              marginTop: 2,
                              cursor: 'pointer',
                              accentColor: '#ff4e1b'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <div>
                                <div style={{ fontSize: 11, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>{item.t}</div>
                                <h3 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', color: taskDone ? '#6864a0' : '#ede9e0', textDecoration: taskDone ? 'line-through' : 'none', marginBottom: 6 }}>{item.what}</h3>
                              </div>
                            </div>
                            <div style={{ fontSize: 13, color: taskDone ? '#6864a0' : '#a09ccc', marginBottom: suppGroup.length > 0 ? 12 : 0, textDecoration: taskDone ? 'line-through' : 'none' }}>{item.d}</div>
                            
                            {/* Show supplements for this time block */}
                            {suppGroup.length > 0 && !taskDone && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2e2b5e' }}>
                                <div style={{ fontSize: 11, color: '#c9a96e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
                                  SUPPLEMENTS TO TAKE:
                                </div>
                                {suppGroup.map(s => {
                                  const done = today.supps?.[s.id];
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSupp(s.id);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 10px',
                                        borderRadius: 2,
                                        background: done ? 'rgba(255,78,27,.08)' : '#1a1840',
                                        border: `1px solid ${done ? 'rgba(255,78,27,.35)' : '#2e2b5e'}`,
                                        marginBottom: 6,
                                        cursor: 'pointer',
                                        width: '100%',
                                        textAlign: 'left',
                                        fontFamily: 'inherit',
                                        color: 'inherit',
                                      }}
                                    >
                                      <span
                                        aria-hidden="true"
                                        style={{
                                          width: 18,
                                          height: 18,
                                          border: `2px solid ${done ? '#ff4e1b' : '#3a3778'}`,
                                          borderRadius: 2,
                                          flexShrink: 0,
                                          background: done ? '#ff4e1b' : 'transparent',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 12,
                                          color: '#fff',
                                          fontWeight: 900,
                                        }}
                                      >
                                        {done ? '✓' : ''}
                                      </span>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: done ? '#6864a0' : '#ede9e0', textDecoration: done ? 'line-through' : 'none' }}>
                                        {s.name} · {s.dose}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      </>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {currentSection === 'train' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>WORKOUTS</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              PHASE 1 · 3× / WEEK · TRX + KETTLEBELLS + DUMBBELLS
            </div>

            <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #ff4e1b', borderRadius: 4, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#a09ccc', lineHeight: 1.6 }}>
              <strong style={{ color: '#ff4e1b' }}>{PROGRAM_PHASES[0].phase}: {PROGRAM_PHASES[0].title}.</strong> {PROGRAM_PHASES[0].status}. Upper body goes hard; lower stays pain-free and unloaded until cleared. See the{' '}
              <button onClick={() => setCurrentSection('plan')} style={{ background: 'none', border: 'none', color: '#ff4e1b', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 13 }}>full recomp plan →</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {(['A', 'B', 'C'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setCurrentWorkout(w)}
                  style={{
                    background: currentWorkout === w ? '#ff4e1b' : '#262358',
                    border: `1px solid ${currentWorkout === w ? '#ff4e1b' : '#3a3778'}`,
                    color: '#ede9e0',
                    padding: '10px 20px',
                    borderRadius: 2,
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all .15s'
                  }}
                  onMouseOver={(e) => {
                    if (currentWorkout !== w) {
                      e.currentTarget.style.borderColor = '#ff4e1b';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentWorkout !== w) {
                      e.currentTarget.style.borderColor = '#3a3778';
                    }
                  }}
                >
                  Workout {w}
                </button>
              ))}
            </div>

            {(() => {
              const workout = WORKOUTS[currentWorkout];
              const workoutKey = `workout-${currentWorkout}-${todayKey()}`;
              const savedWorkout = state.workouts?.[workoutKey] || {};

              return (
                <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 26 }}>
                  <h2 style={{ fontSize: 26, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 8 }}>{workout.name}</h2>
                  <div style={{ fontSize: 12, color: '#a09ccc', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    {workout.day} · {workout.duration} · {workout.equipment}
                  </div>

                  {workout.exercises.map((ex, i) => {
                    const exData = savedWorkout[ex.name] || { sets: '', weight: '', reps: '' };
                    
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 90px 1fr', gap: 10, padding: 14, background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, marginBottom: 6, alignItems: 'center' }}>
                        <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 14, color: '#ede9e0' }}>
                          {ex.name}
                          <div style={{ fontSize: 11, color: '#a09ccc', fontWeight: 400, marginTop: 2 }}>{ex.note}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Sets</label>
                          <input 
                            type="text" 
                            value={exData.sets}
                            onChange={(e) => {
                              updateState((prev: any) => {
                                const workouts = { ...prev.workouts };
                                if (!workouts[workoutKey]) workouts[workoutKey] = {};
                                workouts[workoutKey][ex.name] = { ...exData, sets: e.target.value };
                                return { ...prev, workouts };
                              });
                            }}
                            placeholder={ex.sets.toString()} 
                            style={{ padding: '7px 9px', fontSize: 13, background: '#13112e', border: '1px solid #2e2b5e', color: '#ede9e0', borderRadius: 2, width: '100%' }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Weight</label>
                          <input 
                            type="text" 
                            value={exData.weight}
                            onChange={(e) => {
                              updateState((prev: any) => {
                                const workouts = { ...prev.workouts };
                                if (!workouts[workoutKey]) workouts[workoutKey] = {};
                                workouts[workoutKey][ex.name] = { ...exData, weight: e.target.value };
                                return { ...prev, workouts };
                              });
                            }}
                            placeholder="lbs" 
                            style={{ padding: '7px 9px', fontSize: 13, background: '#13112e', border: '1px solid #2e2b5e', color: '#ede9e0', borderRadius: 2, width: '100%' }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Reps</label>
                          <input 
                            type="text" 
                            value={exData.reps}
                            onChange={(e) => {
                              updateState((prev: any) => {
                                const workouts = { ...prev.workouts };
                                if (!workouts[workoutKey]) workouts[workoutKey] = {};
                                workouts[workoutKey][ex.name] = { ...exData, reps: e.target.value };
                                return { ...prev, workouts };
                              });
                            }}
                            placeholder={ex.reps} 
                            style={{ padding: '7px 9px', fontSize: 13, background: '#13112e', border: '1px solid #2e2b5e', color: '#ede9e0', borderRadius: 2, width: '100%' }} 
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: 20, padding: 14, background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2 }}>
                    <div style={{ fontSize: 13, color: '#5fc878', fontWeight: 700, marginBottom: 6 }}>
                      ✓ Workout data auto-saves
                    </div>
                    <div style={{ fontSize: 12, color: '#a09ccc' }}>
                      Your progress is tracked automatically. View charts and improvements coming soon!
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Program Library */}
            <button type="button" className="collapsible-header" style={{ marginTop: 24 }} onClick={() => setLibraryOpen(!libraryOpen)}>
              <h2>Program Library <span style={{ fontSize: 14, color: '#6864a0' }}>(recomp reference)</span></h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{libraryOpen ? '−' : '+'}</span>
            </button>
            {libraryOpen && (
              <div style={{ marginTop: 12 }}>
                {/* Daily Reps */}
                <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 6 }}>Daily Reps · 20 Min/Day</h3>
                  <div style={{ fontSize: 13, color: '#a09ccc', lineHeight: 1.6, marginBottom: 12 }}>{DAILY_REPS.intro}</div>
                  {DAILY_REPS.rules.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#a09ccc', lineHeight: 1.55, marginBottom: 6 }}>
                      <span style={{ color: '#ff4e1b', fontWeight: 900 }}>{i + 1}</span><span>{r}</span>
                    </div>
                  ))}
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #ff3b2d', borderRadius: 4, padding: 12, margin: '12px 0', fontSize: 12, color: '#a09ccc', lineHeight: 1.5 }}>
                    <strong style={{ color: '#ff3b2d' }}>Foot rule: </strong>{DAILY_REPS.footRule}
                  </div>
                  {DAILY_REPS.rotation.map((d) => (
                    <div key={d.day} style={{ display: 'grid', gridTemplateColumns: '32px 110px 1fr', gap: 10, alignItems: 'baseline', padding: '10px 12px', background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, marginBottom: 6 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: '#ff4e1b' }}>{d.day}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#ede9e0' }}>{d.focus}</div>
                      <div style={{ fontSize: 12, color: '#a09ccc', lineHeight: 1.5 }}>{d.moves}</div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: '#6864a0', marginTop: 10, lineHeight: 1.6, fontStyle: 'italic' }}>{DAILY_REPS.graduation}</div>
                </div>

                {/* Home Program A/B/C */}
                <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 6 }}>Phase 1 Home Program</h3>
                  <div style={{ fontSize: 13, color: '#a09ccc', lineHeight: 1.6, marginBottom: 6 }}>{HOME_PROGRAM_TIPS.goal}</div>
                  <div style={{ fontSize: 12, color: '#6864a0', marginBottom: 14 }}><strong style={{ color: '#c9a96e' }}>Gear:</strong> {HOME_PROGRAM_TIPS.gear} · {HOME_PROGRAM_TIPS.rotation}</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {HOME_PROGRAM.map((w) => (
                      <button key={w.id} onClick={() => setCurrentHome(w.id as 'A' | 'B' | 'C')} style={{ background: currentHome === w.id ? '#ff4e1b' : '#262358', border: `1px solid ${currentHome === w.id ? '#ff4e1b' : '#3a3778'}`, color: '#ede9e0', padding: '8px 16px', borderRadius: 2, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>Day {w.id}</button>
                    ))}
                  </div>
                  {(() => {
                    const w = HOME_PROGRAM.find((x) => x.id === currentHome)!;
                    return (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', color: '#ede9e0', marginBottom: 10 }}>{w.title}</div>
                        {w.exercises.map((ex, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: '#ede9e0' }}>{ex.name}</span>
                            <span style={{ fontSize: 13, color: '#ff4e1b', fontWeight: 800, flexShrink: 0 }}>{ex.scheme}</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                  <div style={{ fontSize: 12, color: '#6864a0', marginTop: 12, lineHeight: 1.6 }}><strong style={{ color: '#a09ccc' }}>Lower body in Phase 1: </strong>{HOME_LOWER_NOTE}</div>
                </div>

                {/* Gym split Phase 2/3 */}
                <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 6 }}>Phase 2 / 3 Gym Split</h3>
                  <div style={{ fontSize: 13, color: '#a09ccc', lineHeight: 1.6, marginBottom: 12 }}>{GYM_SPLIT.intro}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6, marginBottom: 14 }}>
                    {GYM_SPLIT.schedule.map((s) => (
                      <div key={s.day} style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, padding: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#ff4e1b', textTransform: 'uppercase' }}>{s.day}</div>
                        <div style={{ fontSize: 11, color: '#a09ccc', marginTop: 4, lineHeight: 1.3 }}>{s.focus}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#6864a0', marginBottom: 14, lineHeight: 1.6 }}>{GYM_SPLIT.repGuide}</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {GYM_SPLIT.workouts.map((w) => (
                      <button key={w.id} onClick={() => setCurrentGym(w.id as 'UA' | 'LA' | 'UB' | 'LB')} style={{ background: currentGym === w.id ? '#ff4e1b' : '#262358', border: `1px solid ${currentGym === w.id ? '#ff4e1b' : '#3a3778'}`, color: '#ede9e0', padding: '8px 14px', borderRadius: 2, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>{w.id}</button>
                    ))}
                  </div>
                  {(() => {
                    const w = GYM_SPLIT.workouts.find((x) => x.id === currentGym)!;
                    return (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', color: '#ede9e0', marginBottom: 10 }}>{w.title}</div>
                        {w.exercises.map((ex, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: '#ede9e0' }}>{ex.name}</span>
                            <span style={{ fontSize: 13, color: '#ff4e1b', fontWeight: 800, flexShrink: 0 }}>{ex.scheme}</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                  <div style={{ fontSize: 12, color: '#6864a0', marginTop: 12, lineHeight: 1.6 }}>{GYM_SPLIT.phase1Lower}</div>
                  <div style={{ fontSize: 12, color: '#6864a0', marginTop: 6, lineHeight: 1.6 }}><strong style={{ color: '#a09ccc' }}>Scaling: </strong>{GYM_SPLIT.scaling}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentSection === 'fuel' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>FUEL</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              DAILY TARGETS · {TARGETS.cals} CAL · {TARGETS.protein}G P · {TARGETS.carbs}G C · {TARGETS.fat}G F · {TARGETS.fiber}G FIBER
            </div>

            <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #ff4e1b', padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#a09ccc', lineHeight: 1.6 }}>
              <strong style={{ color: '#ff4e1b' }}>Recomp meals:</strong> Tap a preset to log macros. Home meals, restaurant builds, and quick proteins from your meal spreadsheet. Say the keyword under each button when voice-memo logging.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, flex: 1, minWidth: 280 }}>
              {[
                { key: 'calories' as const, label: 'Calories', current: todayCalories, target: TARGETS.cals, hint: 'Removes last log entry' },
                { key: 'protein' as const, label: 'Protein', current: today.protein || 0, target: TARGETS.protein, hint: 'Clears fuel protein' },
                { key: 'carbs' as const, label: 'Carbs', current: today.carbs || 0, target: TARGETS.carbs, hint: 'Clears fuel carbs' },
                { key: 'fat' as const, label: 'Fat', current: today.fat || 0, target: TARGETS.fat, hint: 'Clears fuel fat' },
              ].map((m) => (
                <div key={m.label} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: '#ede9e0' }}>
                    {m.current}<span style={{ fontSize: 12, color: '#a09ccc' }}> / {m.target}</span>
                  </div>
                  <ProgressBar current={m.current} target={m.target} label={m.label} />
                  <button type="button" onClick={() => resetMacro(m.key)} style={macroResetStyle} title={m.hint}>
                    Reset
                  </button>
                </div>
              ))}
              </div>
              <button
                type="button"
                onClick={resetFuel}
                style={{
                  background: '#ff3b2d',
                  border: '1px solid #ff3b2d',
                  color: '#ede9e0',
                  padding: '12px 18px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Reset Day
              </button>
            </div>

            {FOOD_CATEGORIES.map((cat) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', marginBottom: 10 }}>{cat}</h2>
                <div className="preset-grid">
                  {FOOD_PRESETS.filter((p) => p.category === cat).map((preset) => (
                    <button key={preset.id} type="button" className="preset-btn" onClick={() => addFoodPreset(preset)}>
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>{preset.label}</div>
                      <div style={{ color: '#ff4e1b', fontSize: 10, marginBottom: 4 }}>{macroCalories(preset.p, preset.c, preset.f)} cal · {preset.p}p · {preset.c}c · {preset.f}f</div>
                      {preset.notes ? <div style={{ color: '#a09ccc', fontSize: 9, marginBottom: 4, lineHeight: 1.4 }}>{preset.notes}</div> : null}
                      <div style={{ color: '#6864a0', fontSize: 9, fontStyle: 'italic' }}>&quot;{preset.say}&quot;</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <h2 style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12 }}>Today&apos;s Log</h2>
            {foodLog.length === 0 ? (
              <div style={{ color: '#6864a0', fontSize: 14, marginBottom: 24 }}>No food logged yet — tap a preset above.</div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                {foodLog.map((entry: any) => (
                  <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{entry.label}</div>
                      <div style={{ fontSize: 12, color: '#a09ccc' }}>{entry.at} · {macroCalories(entry.p, entry.c, entry.f)} cal · {entry.p}p · {entry.c}c · {entry.f}f</div>
                    </div>
                    <button type="button" onClick={() => removeFoodLogEntry(entry.id)} style={{ background: '#262358', border: '1px solid #3a3778', color: '#ff3b2d', padding: '6px 10px', borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>UNDO</button>
                  </div>
                ))}
              </div>
            )}

            <button type="button" className="collapsible-header" onClick={() => setMealPlanOpen(!mealPlanOpen)}>
              <h2>Sample Day <span style={{ fontSize: 14, color: '#6864a0' }}>(~2,020 cal · 185g P)</span></h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{mealPlanOpen ? '−' : '+'}</span>
            </button>
            {mealPlanOpen && MEALS_PLAN.map((meal, i) => {
              const mealDone = today.meals?.[meal.name] || false;
              return (
                <div 
                  key={i} 
                  style={{ 
                    background: mealDone ? 'rgba(255,78,27,.08)' : '#1e1c47', 
                    border: `1px solid ${mealDone ? 'rgba(255,78,27,.35)' : '#2e2b5e'}`,
                    borderLeft: `3px solid ${mealDone ? '#ff4e1b' : 'transparent'}`,
                    borderRadius: 4, 
                    padding: 26, 
                    marginBottom: 18,
                    cursor: 'pointer',
                    transition: 'all .15s'
                  }}
                  onClick={() => toggleMeal(meal.name)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={mealDone}
                        readOnly
                        style={{
                          width: 22,
                          height: 22,
                          border: '2px solid #3a3778',
                          borderRadius: 2,
                          flexShrink: 0,
                          cursor: 'pointer',
                          accentColor: '#ff4e1b'
                        }}
                      />
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 4, color: mealDone ? '#6864a0' : '#ede9e0', textDecoration: mealDone ? 'line-through' : 'none' }}>{meal.name}</h3>
                        <div style={{ fontSize: 11, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>{meal.time}</div>
                      </div>
                    </div>
                    <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, padding: '8px 14px' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#ff4e1b', fontStyle: 'italic' }}>{meal.cals} CAL</div>
                      <div style={{ fontSize: 11, color: '#a09ccc', marginTop: 2 }}>
                        {meal.p}g P · {meal.c}g C · {meal.f}g F
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, paddingLeft: 0 }}>
                    {meal.items.map((item, j) => {
                      const itemKey = `${meal.name}-item-${j}`;
                      const itemDone = today.meals?.[itemKey] || false;
                      
                      return (
                        <div
                          key={j}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateState((prev: any) => {
                              const key = todayKey();
                              const days = { ...(prev.days || {}) };
                              const d = getDayFrom(days, key);
                              d.meals = { ...(d.meals || {}), [itemKey]: !d.meals?.[itemKey] };
                              days[key] = d;
                              return { ...prev, days };
                            });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '6px 10px',
                            borderRadius: 2,
                            background: itemDone ? 'rgba(255,78,27,.08)' : 'transparent',
                            border: `1px solid ${itemDone ? 'rgba(255,78,27,.35)' : 'transparent'}`,
                            marginBottom: 6,
                            cursor: 'pointer',
                            transition: 'all .15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={itemDone}
                            readOnly
                            style={{
                              width: 18,
                              height: 18,
                              border: '2px solid #3a3778',
                              borderRadius: 2,
                              flexShrink: 0,
                              cursor: 'pointer',
                              accentColor: '#ff4e1b'
                            }}
                          />
                          <div style={{ fontSize: 14, color: itemDone ? '#6864a0' : '#ede9e0', lineHeight: 1.5, textDecoration: itemDone ? 'line-through' : 'none' }}>
                            {item}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 26, marginTop: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>NON-NEGOTIABLES</h3>
              {NON_NEGOTIABLES.map((rule, i) => (
                <div key={i} style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #ff4e1b', padding: '12px 16px', marginBottom: 8, fontSize: 14, color: '#ede9e0' }}>
                  {rule}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentSection === 'plan' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>PLAN</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              RECOMP · 195 → 178 · ATHLETIC LEAN
            </div>

            {/* Goal */}
            <div style={{ background: 'radial-gradient(circle at 85% 15%,rgba(255,78,27,.28) 0%,transparent 55%),linear-gradient(135deg,#1c1945 0%,#252352 70%)', border: '1px solid #2e2b5e', borderLeft: '4px solid #ff4e1b', borderRadius: 4, padding: 26, marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#ede9e0', fontStyle: 'italic', marginBottom: 14 }}>{RECOMP_GOAL.framing}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 800, marginBottom: 6 }}>Start</div>
                  <div style={{ fontSize: 14, color: '#ede9e0', fontWeight: 700 }}>{RECOMP_GOAL.start}</div>
                </div>
                <div style={{ background: 'radial-gradient(circle at 50% 120%,rgba(95,200,120,.18) 0%,transparent 60%),#1a1840', border: '1px solid #5fc878', borderRadius: 4, padding: 14 }}>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 800, marginBottom: 6 }}>Target</div>
                  <div style={{ fontSize: 14, color: '#5fc878', fontWeight: 700 }}>{RECOMP_GOAL.target}</div>
                </div>
              </div>
              {RECOMP_GOAL.coreIdea.map((idea, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#a09ccc', lineHeight: 1.6, marginBottom: 6 }}>
                  <span style={{ color: '#ff4e1b', fontWeight: 900 }}>›</span>
                  <span>{idea}</span>
                </div>
              ))}
            </div>

            {/* Phases */}
            <button type="button" className="collapsible-header" onClick={() => togglePlan('phases')}>
              <h2>Foot Recovery Phases <span style={{ fontSize: 14, color: '#6864a0' }}>({PROGRAM_PHASES.length})</span></h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{planSectionOpen('phases', true) ? '−' : '+'}</span>
            </button>
            {planSectionOpen('phases', true) && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                <div style={{ color: '#a09ccc', fontSize: 13, marginBottom: 12 }}>Do not skip phases to chase the date — this is the part that protects you.</div>
                {PROGRAM_PHASES.map((p) => (
                  <div key={p.phase} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderLeft: `3px solid ${phaseColor(p.cls)}`, borderRadius: 4, padding: 18, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', color: phaseColor(p.cls) }}>{p.phase}: {p.title}</div>
                      <div style={{ fontSize: 11, color: '#a09ccc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{p.status}</div>
                    </div>
                    {p.points.map((pt, j) => (
                      <div key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#a09ccc', lineHeight: 1.55, marginTop: 6 }}>
                        <span style={{ color: phaseColor(p.cls) }}>›</span>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Nutrition framework */}
            <button type="button" className="collapsible-header" onClick={() => togglePlan('nutrition')}>
              <h2>Nutrition Framework</h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{planSectionOpen('nutrition') ? '−' : '+'}</span>
            </button>
            {planSectionOpen('nutrition') && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                {[
                  { label: 'Protein', val: NUTRITION_FRAMEWORK.protein },
                  { label: 'Calories', val: NUTRITION_FRAMEWORK.calories },
                  { label: 'Fats', val: NUTRITION_FRAMEWORK.fats },
                  { label: 'Carbs', val: NUTRITION_FRAMEWORK.carbs },
                  { label: 'Fiber', val: NUTRITION_FRAMEWORK.fiber },
                ].map((row) => (
                  <div key={row.label} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: '12px 16px', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 8 }}>{row.label}</span>
                    <span style={{ fontSize: 13, color: '#ede9e0' }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #5fc878', borderRadius: 4, padding: 16, marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: '#5fc878', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>The Adjustment Rule (matters more than the starting number)</div>
                  {NUTRITION_FRAMEWORK.adjustmentRules.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#a09ccc', lineHeight: 1.55, marginBottom: 6 }}>
                      <span style={{ color: '#5fc878' }}>›</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fast start */}
            <button type="button" className="collapsible-header" onClick={() => togglePlan('faststart')}>
              <h2>Fast Start <span style={{ fontSize: 14, color: '#6864a0' }}>({FAST_START.window})</span></h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{planSectionOpen('faststart') ? '−' : '+'}</span>
            </button>
            {planSectionOpen('faststart') && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                <div style={{ color: '#a09ccc', fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>{FAST_START.why}</div>
                {FAST_START.rules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14, marginBottom: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: '#ff4e1b', lineHeight: 1, minWidth: 22 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#ede9e0', marginBottom: 3 }}>{r.title}</div>
                      <div style={{ fontSize: 13, color: '#a09ccc', lineHeight: 1.5 }}>{r.detail}</div>
                    </div>
                  </div>
                ))}
                <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #c9a96e', borderRadius: 4, padding: 16, marginTop: 4, fontSize: 13, color: '#a09ccc', lineHeight: 1.6 }}>
                  <strong style={{ color: '#c9a96e' }}>What to expect: </strong>{FAST_START.expect}
                </div>
              </div>
            )}

            {/* Conditioning & steps */}
            <button type="button" className="collapsible-header" onClick={() => togglePlan('conditioning')}>
              <h2>Conditioning &amp; Steps</h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{planSectionOpen('conditioning') ? '−' : '+'}</span>
            </button>
            {planSectionOpen('conditioning') && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                {CONDITIONING_PHASES.map((c) => (
                  <div key={c.phase} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: '12px 16px', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 8 }}>{c.phase}</span>
                    <span style={{ fontSize: 13, color: '#ede9e0' }}>{c.detail}</span>
                  </div>
                ))}
                <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #5fc878', borderRadius: 4, padding: 16, marginTop: 4, fontSize: 13, color: '#a09ccc', lineHeight: 1.6 }}>
                  <strong style={{ color: '#5fc878' }}>Steps: </strong>{STEP_TARGET}
                </div>
              </div>
            )}

            {/* Progression */}
            <button type="button" className="collapsible-header" onClick={() => togglePlan('progression')}>
              <h2>{PROGRESSION.title}</h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{planSectionOpen('progression') ? '−' : '+'}</span>
            </button>
            {planSectionOpen('progression') && (
              <div style={{ marginTop: 8, marginBottom: 16, background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 18 }}>
                {PROGRESSION.points.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#a09ccc', lineHeight: 1.6, marginBottom: 8 }}>
                    <span style={{ color: '#ff4e1b', fontWeight: 900 }}>›</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Weekly review */}
            <button type="button" className="collapsible-header" onClick={() => togglePlan('review')}>
              <h2>Weekly Review <span style={{ fontSize: 14, color: '#6864a0' }}>(your steering wheel)</span></h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{planSectionOpen('review') ? '−' : '+'}</span>
            </button>
            {planSectionOpen('review') && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 10 }}>
                  {[
                    { label: 'Track Daily', items: WEEKLY_REVIEW.daily },
                    { label: 'Per Workout', items: WEEKLY_REVIEW.perWorkout },
                    { label: 'Review Weekly', items: WEEKLY_REVIEW.weekly },
                  ].map((col) => (
                    <div key={col.label} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                      <div style={{ fontSize: 11, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{col.label}</div>
                      {col.items.map((it, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#a09ccc', lineHeight: 1.5, marginBottom: 4 }}>• {it}</div>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #5fc878', borderRadius: 4, padding: 16, fontSize: 13, color: '#a09ccc', lineHeight: 1.6 }}>{WEEKLY_REVIEW.steering}</div>
              </div>
            )}

            {/* Checkpoints */}
            <button type="button" className="collapsible-header" onClick={() => togglePlan('checkpoints')}>
              <h2>Realistic Checkpoints</h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{planSectionOpen('checkpoints') ? '−' : '+'}</span>
            </button>
            {planSectionOpen('checkpoints') && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                {CHECKPOINTS.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', minWidth: 130 }}>{c.date}</div>
                    <div style={{ fontSize: 13, color: '#ede9e0', lineHeight: 1.5 }}>{c.expected}</div>
                  </div>
                ))}
                <div style={{ color: '#6864a0', fontSize: 12, marginTop: 8, lineHeight: 1.6, fontStyle: 'italic' }}>Chasing the exact number by the exact date is how people lose muscle and rebound. Hit the birthday looking strong, then finish the job clean over the following weeks.</div>
              </div>
            )}
          </div>
        )}

        {currentSection === 'labs' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>LABS</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              2023 BASELINE vs {LABS_MAY_2026_DRAWN.toUpperCase()} PANEL
            </div>

            <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderLeft: '3px solid #5fc878', padding: '14px 18px', marginBottom: 24, fontSize: 14, color: '#ede9e0', lineHeight: 1.6 }}>
              <strong style={{ color: '#5fc878' }}>Hormone headline:</strong> Total testosterone moved from <strong>468 → 512 ng/dL</strong> (+44). Still mid-range for age 41 — TSH, cortisol, and PSA look clean. Free T, SHBG, and estradiol were not in the May panel; order on follow-up.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: labFilter ? 12 : 20 }}>
              {([
                { key: 'optimal' as const, count: labSummary.optimal, label: 'Optimal / Good', color: '#5fc878' },
                { key: 'watch' as const, count: labSummary.watch, label: 'Watch', color: '#ff4e1b' },
                { key: 'follow' as const, count: labSummary.follow, label: 'Follow-up', color: '#ff3b2d' },
              ]).map(({ key, count, label, color }) => {
                const active = labFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleLabFilter(key)}
                    style={{
                      background: active ? `${color}18` : '#1e1c47',
                      border: `2px solid ${color}`,
                      borderRadius: 4,
                      padding: 14,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all .15s',
                      boxShadow: active ? `0 0 0 1px ${color}40` : 'none',
                    }}
                  >
                    <div style={{ fontSize: 28, fontWeight: 900, color }}>{count}</div>
                    <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', fontWeight: 800 }}>{label}</div>
                  </button>
                );
              })}
            </div>

            {labFilter && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '10px 14px', background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4 }}>
                <span style={{ fontSize: 13, color: '#ede9e0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Showing {filteredLabCount} {labFilter === 'optimal' ? 'optimal / good' : labFilter} result{filteredLabCount === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => setLabFilter(null)}
                  style={{ background: 'transparent', border: 'none', color: '#a09ccc', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '1px' }}
                >
                  Clear filter
                </button>
              </div>
            )}

            {labCategories.map((category) => {
              const isOpen = collapsedLabs[category] ?? category === 'Hormones';
              const categoryLabs = LAB_COMPARISONS.filter(
                (lab) => lab.category === category && matchesLabFilter(lab, labFilter)
              );
              if (labFilter && categoryLabs.length === 0) return null;
              return (
              <div key={category} style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="collapsible-header"
                  onClick={() => setCollapsedLabs((prev) => ({ ...prev, [category]: !isOpen }))}
                >
                  <h2>{category} <span style={{ fontSize: 14, color: '#6864a0' }}>({categoryLabs.length})</span></h2>
                  <span style={{ color: '#ff4e1b', fontSize: 20 }}>{isOpen ? '−' : '+'}</span>
                </button>

                {isOpen && (
                  <div style={{ marginTop: 8 }}>
                {categoryLabs.map((lab, i) => {
                  const hasCompare = !!lab.baseline2023;
                  return (
                  <div key={i} className="lab-card">
                    <div className="lab-card-header">
                      <div className="lab-marker">{lab.marker}</div>
                      <div className="lab-range">{lab.range}</div>
                      {lab.note ? <div className="lab-note">{lab.note}</div> : null}
                    </div>

                    {hasCompare ? (
                      <div className="lab-compare">
                        <div className="lab-panel">
                          <div className="lab-panel-label">2023 Baseline</div>
                          <div className="lab-panel-value" style={{ color: labColor(lab.cls2023) }}>{lab.baseline2023}</div>
                          {lab.verdict2023 ? (
                            <div className="lab-panel-verdict" style={{ color: labColor(lab.cls2023) }}>{lab.verdict2023}</div>
                          ) : null}
                        </div>
                        <div className="lab-compare-arrow" aria-hidden="true">→</div>
                        <div className="lab-panel lab-panel-current">
                          <div className="lab-panel-label">{LABS_MAY_2026_DRAWN}</div>
                          <div className="lab-panel-value" style={{ color: labColor(lab.cls2026) }}>{lab.current2026}</div>
                          <div className="lab-panel-verdict" style={{ color: labColor(lab.cls2026) }}>{lab.verdict2026}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="lab-single">
                        <div className="lab-single-value" style={{ color: labColor(lab.cls2026) }}>{lab.current2026}</div>
                        <div className="lab-single-verdict" style={{ color: labColor(lab.cls2026) }}>{lab.verdict2026}</div>
                      </div>
                    )}
                  </div>
                );})}
                  </div>
                )}
              </div>
            );})}

            <button type="button" className="collapsible-header" style={{ marginTop: 8 }} onClick={() => setRetestOpen(!retestOpen)}>
              <h2>Still To Retest <span style={{ fontSize: 14, color: '#6864a0' }}>({RETEST_PANEL.length} tests)</span></h2>
              <span style={{ color: '#ff4e1b', fontSize: 20 }}>{retestOpen ? '−' : '+'}</span>
            </button>
            {retestOpen && (
              <>
            <div style={{ color: '#a09ccc', fontSize: 13, marginBottom: 16, marginTop: 8 }}>Recommended follow-up from May 2026 panel — target Oct/Nov retest</div>
            {RETEST_PANEL.map((test, i) => (
              <div key={i} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 18, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#ede9e0', textTransform: 'uppercase' }}>{test.test}</div>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, padding: '4px 10px', fontSize: 12, color: '#ff4e1b', fontWeight: 700 }}>{test.target}</div>
                </div>
                <div style={{ fontSize: 13, color: '#a09ccc' }}>{test.why}</div>
              </div>
            ))}
              </>
            )}
          </div>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {NAV_SECTIONS.map((s) => renderNavButton(s.id, s.label, true))}
      </nav>
    </>
  );
}
