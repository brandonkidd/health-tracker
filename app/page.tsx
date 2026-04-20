'use client';
import { useState, useEffect } from 'react';
import './globals.css';
import { WORKOUTS, SUPPLEMENTS_DAILY, DATES, BASELINE, TARGETS, NON_NEGOTIABLES, daysUntil, MEALS_PLAN, LABS_2023, RETEST_PANEL, PELOTON_DAY, LIFTING_DAY } from '@/lib/health-data';

const STORE_KEY = "brandon_gameplan_v1";

export default function Home() {
  const [state, setState] = useState<any>({});
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [mounted, setMounted] = useState(false);

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

  const ensureDay = (key: string) => {
    const days = state.days || {};
    if (!days[key]) {
      days[key] = { supps: {}, water: 0, protein: 0, meals: {}, workout: {}, notes: "", weight: null };
    }
    return days[key];
  };

  const todayKey = () => new Date().toISOString().slice(0, 10);

  const updateState = (updater: (prev: any) => any) => {
    setState((prev: any) => ({ ...updater(prev) }));
  };

  const toggleWater = (index: number) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...prev.days };
      const d = ensureDay(key);
      const filled = Math.round((d.water || 0) * 4);
      const target = index < filled ? index : index + 1;
      d.water = target / 4;
      days[key] = d;
      return { ...prev, days };
    });
  };

  const addProtein = (amount: number) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...prev.days };
      const d = ensureDay(key);
      if (amount === -999) d.protein = 0;
      else d.protein = Math.max(0, (d.protein || 0) + amount);
      days[key] = d;
      return { ...prev, days };
    });
  };

  const toggleSupp = (id: string) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...prev.days };
      const d = ensureDay(key);
      d.supps[id] = !d.supps[id];
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

  const today = ensureDay(todayKey());
  const waterDots = 16;
  const targetWater = 4;
  const targetProtein = 190;
  const suppsDone = Object.values(today.supps || {}).filter(Boolean).length;
  const suppsTotal = SUPPLEMENTS_DAILY.filter(s => s.tier === 1).length;

  const sections = ['dashboard', 'today', 'workouts', 'nutrition', 'bloodwork', 'schedule'];

  return (
    <>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(19,17,46,.88)', backdropFilter: 'blur(18px)', borderBottom: '1px solid #2e2b5e' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: 12 }}>
          <div style={{ fontFamily: '"Archivo Black","Inter Black",-apple-system,sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: '.5px', textTransform: 'uppercase', fontStyle: 'italic', transform: 'skewX(-6deg)' }}>
            BRANDON<span style={{ color: '#ff4e1b' }}>.FIT</span>
          </div>
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {sections.map(s => (
              <button
                key={s}
                onClick={() => setCurrentSection(s)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: currentSection === s ? '#ff4e1b' : '#a09ccc',
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  cursor: 'pointer',
                  borderBottom: currentSection === s ? '2px solid #ff4e1b' : '2px solid transparent'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ height: 2, background: 'linear-gradient(90deg,#ff4e1b 0%,#ff4e1b 45%,#5d58c7 100%)' }} />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px 80px' }}>
        {currentSection === 'dashboard' && (
          <div>
            <div style={{ background: 'radial-gradient(circle at 80% 20%,rgba(255,78,27,.32) 0%,transparent 50%),radial-gradient(circle at 15% 85%,rgba(93,88,199,.4) 0%,transparent 55%),linear-gradient(135deg,#1c1945 0%,#252352 60%,#2e2466 100%)', border: '1px solid #2e2b5e', borderRadius: 4, padding: '48px 36px', marginBottom: 22, borderLeft: '4px solid #ff4e1b' }}>
              <h4 style={{ color: '#ff4e1b', marginBottom: 16, fontSize: 12, letterSpacing: 3, fontWeight: 800 }}>— THE BRANDON PROJECT · 2026</h4>
              <h1 style={{ fontSize: 72, lineHeight: 0.9, letterSpacing: -3, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic' }}>
                NO DAYS<br />OFF<span style={{ color: '#ff4e1b' }}>.</span>
              </h1>
              <div style={{ color: '#ede9e0', opacity: 0.85, marginTop: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
                HEALTH · FITNESS · FUEL · HORMONES — APR 2026 TO BIRTHDAY SEPT 2026
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 28 }}>
                <div style={{ background: 'rgba(26,24,64,.55)', backdropFilter: 'blur(6px)', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, fontWeight: 800 }}>TODAY</div>
                  <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, fontStyle: 'italic', letterSpacing: -2, color: '#ede9e0', marginTop: 8 }}>{todayKey()}</div>
                </div>
                <div style={{ background: 'radial-gradient(circle at 50% 120%,rgba(255,78,27,.22) 0%,transparent 60%),rgba(26,24,64,.55)', border: '1px solid #ff4e1b', borderRadius: 4, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, fontStyle: 'italic', letterSpacing: -2, color: '#ff4e1b' }}>{daysUntil(DATES.phase1End) >= 0 ? daysUntil(DATES.phase1End) : '✓'}</div>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, fontWeight: 800 }}>Days to Checkpoint</div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                    <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, fontWeight: 800 }}>Water</div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: '#ede9e0' }}>
                      {(today.water || 0).toFixed(1)}<span style={{ fontSize: 14, color: '#a09ccc' }}> / {targetWater}L</span>
                    </div>
                  </div>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                    <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, fontWeight: 800 }}>Protein</div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: '#ede9e0' }}>
                      {today.protein || 0}<span style={{ fontSize: 14, color: '#a09ccc' }}> / {targetProtein}g</span>
                    </div>
                  </div>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 4, padding: 14 }}>
                    <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, fontWeight: 800 }}>Supps</div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: '#ede9e0' }}>
                      {suppsDone}<span style={{ fontSize: 14, color: '#a09ccc' }}> / {suppsTotal}</span>
                    </div>
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
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 26 }}>
                <h3 style={{ fontSize: 17, marginBottom: 8, fontWeight: 900, textTransform: 'uppercase' }}>
                  HYDRATION · {(today.water || 0).toFixed(2)} / {targetWater}L
                </h3>
                <div style={{ fontSize: 12, color: '#a09ccc', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>
                  250ML PER DROP · ATTACK IT
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {Array.from({ length: waterDots }, (_, i) => (
                    <div
                      key={i}
                      onClick={() => toggleWater(i)}
                      style={{
                        width: 30,
                        height: 38,
                        borderRadius: '0 0 50% 50% / 0 0 40% 40%',
                        border: '2px solid #3a3778',
                        background: i < (today.water || 0) * 4 ? '#ede9e0' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all .15s'
                      }}
                    />
                  ))}
                </div>
                <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', height: 10, overflow: 'hidden', marginTop: 14 }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#ff4e1b 0%,#ff8a7a 100%)', width: `${Math.min(100, (today.water || 0) / targetWater * 100)}%`, transition: 'width .4s' }} />
                </div>
              </div>

              <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 26 }}>
                <h3 style={{ fontSize: 17, marginBottom: 8, fontWeight: 900, textTransform: 'uppercase' }}>
                  PROTEIN · {today.protein || 0} / {targetProtein}G
                </h3>
                <div style={{ fontSize: 12, color: '#a09ccc', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>
                  40–50G PER MEAL · NON-NEGOTIABLE
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: '+20 EGGS', val: 20 },
                    { label: '+25 SHAKE', val: 25 },
                    { label: '+42 CHICKEN', val: 42 },
                    { label: '+34 SALMON', val: 34 },
                    { label: '+17 YOGURT', val: 17 },
                    { label: '–10', val: -10 },
                    { label: 'RESET', val: -999 }
                  ].map(btn => (
                    <button
                      key={btn.label}
                      onClick={() => addProtein(btn.val)}
                      style={{
                        background: btn.val === -999 ? '#ff3b2d' : btn.val < 0 ? 'transparent' : '#262358',
                        border: `1px solid ${btn.val === -999 ? '#ff3b2d' : '#3a3778'}`,
                        color: '#ede9e0',
                        padding: '7px 12px',
                        borderRadius: 2,
                        fontSize: 11,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '1.2px',
                        cursor: 'pointer',
                        transition: 'all .15s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = btn.val === -999 ? '#e22d20' : '#ff4e1b';
                        e.currentTarget.style.borderColor = btn.val === -999 ? '#e22d20' : '#ff4e1b';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = btn.val === -999 ? '#ff3b2d' : btn.val < 0 ? 'transparent' : '#262358';
                        e.currentTarget.style.borderColor = btn.val === -999 ? '#ff3b2d' : '#3a3778';
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', height: 10, overflow: 'hidden', marginTop: 14 }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#ff4e1b 0%,#ff8a7a 100%)', width: `${Math.min(100, (today.protein || 0) / targetProtein * 100)}%`, transition: 'width .4s' }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 26, marginTop: 18 }}>
              <h3 style={{ fontSize: 17, marginBottom: 14, fontWeight: 900, textTransform: 'uppercase' }}>THE STACK · DAILY</h3>
              {SUPPLEMENTS_DAILY.map(s => {
                const done = today.supps[s.id];
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 2,
                      background: done ? 'rgba(255,78,27,.08)' : '#1a1840',
                      border: `1px solid ${done ? 'rgba(255,78,27,.35)' : '#2e2b5e'}`,
                      borderLeft: `3px solid ${done ? '#ff4e1b' : 'transparent'}`,
                      marginBottom: 6,
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleSupp(s.id)}
                  >
                    <input
                      type="checkbox"
                      checked={done || false}
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
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: done ? '#6864a0' : '#ede9e0', textDecoration: done ? 'line-through' : 'none' }}>
                        {s.name} <span style={{ color: '#6864a0', fontWeight: 400 }}>· {s.dose}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 2 }}>
                        {s.when}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentSection === 'workouts' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>WORKOUTS</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              PHASE 1 · 3× / WEEK · TRX + KETTLEBELLS + DUMBBELLS
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {['A', 'B', 'C'].map(w => (
                <button
                  key={w}
                  style={{
                    background: '#262358',
                    border: '1px solid #3a3778',
                    color: '#ede9e0',
                    padding: '10px 20px',
                    borderRadius: 2,
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  Workout {w}
                </button>
              ))}
            </div>

            {Object.entries(WORKOUTS).map(([key, workout]) => (
              <div key={key} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 26, marginBottom: 18 }}>
                <h2 style={{ fontSize: 26, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 8 }}>{workout.name}</h2>
                <div style={{ fontSize: 12, color: '#a09ccc', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  {workout.day} · {workout.duration} · {workout.equipment}
                </div>

                {workout.exercises.map((ex, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 90px 1fr', gap: 10, padding: 14, background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, marginBottom: 6, alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 14, color: '#ede9e0' }}>
                      {ex.name}
                      <div style={{ fontSize: 11, color: '#a09ccc', fontWeight: 400, marginTop: 2 }}>{ex.note}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Sets</label>
                      <input type="text" placeholder={ex.sets.toString()} style={{ padding: '7px 9px', fontSize: 13, background: '#13112e', border: '1px solid #2e2b5e', color: '#ede9e0', borderRadius: 2, width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Weight</label>
                      <input type="text" placeholder="lbs" style={{ padding: '7px 9px', fontSize: 13, background: '#13112e', border: '1px solid #2e2b5e', color: '#ede9e0', borderRadius: 2, width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Reps</label>
                      <input type="text" placeholder={ex.reps} style={{ padding: '7px 9px', fontSize: 13, background: '#13112e', border: '1px solid #2e2b5e', color: '#ede9e0', borderRadius: 2, width: '100%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {currentSection === 'nutrition' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>NUTRITION</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              DAILY TARGETS: {TARGETS.cals} CAL · {TARGETS.protein}G PROTEIN · {TARGETS.carbs}G CARBS · {TARGETS.fat}G FAT
            </div>

            {MEALS_PLAN.map((meal, i) => (
              <div key={i} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 26, marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 4 }}>{meal.name}</h3>
                    <div style={{ fontSize: 11, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>{meal.time}</div>
                  </div>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, padding: '8px 14px' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#ff4e1b', fontStyle: 'italic' }}>{meal.cals} CAL</div>
                    <div style={{ fontSize: 11, color: '#a09ccc', marginTop: 2 }}>
                      {meal.p}g P · {meal.c}g C · {meal.f}g F
                    </div>
                  </div>
                </div>
                <ul style={{ marginTop: 12, paddingLeft: 20 }}>
                  {meal.items.map((item, j) => (
                    <li key={j} style={{ fontSize: 14, color: '#ede9e0', marginBottom: 6, lineHeight: 1.5 }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

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

        {currentSection === 'bloodwork' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>BLOODWORK</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              BASELINE (2023) + RETEST PANEL
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>2023 Baseline</h2>
            {LABS_2023.map((lab, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr', gap: 12, padding: 14, background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 2, marginBottom: 6, alignItems: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#ede9e0' }}>{lab.marker}</div>
                <div style={{ fontSize: 14, color: lab.cls === 'red' ? '#ff3b2d' : lab.cls === 'orange' ? '#ff4e1b' : '#5fc878', fontWeight: 700 }}>{lab.result}</div>
                <div style={{ fontSize: 12, color: '#a09ccc' }}>{lab.range}</div>
                <div style={{ fontSize: 12, color: '#a09ccc' }}>{lab.pct}</div>
                <div style={{ fontSize: 13, color: lab.cls === 'red' ? '#ff3b2d' : lab.cls === 'orange' ? '#ff4e1b' : '#5fc878', fontWeight: 600 }}>{lab.verdict}</div>
              </div>
            ))}

            <h2 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginTop: 32, marginBottom: 14 }}>Retest Panel</h2>
            <div style={{ color: '#a09ccc', fontSize: 13, marginBottom: 16 }}>Order these labs after 4–6 weeks of training + supplements</div>
            {RETEST_PANEL.map((test, i) => (
              <div key={i} style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 18, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#ede9e0', textTransform: 'uppercase' }}>{test.test}</div>
                  <div style={{ background: '#1a1840', border: '1px solid #2e2b5e', borderRadius: 2, padding: '4px 10px', fontSize: 12, color: '#ff4e1b', fontWeight: 700 }}>{test.target}</div>
                </div>
                <div style={{ fontSize: 13, color: '#a09ccc' }}>{test.why}</div>
              </div>
            ))}
          </div>
        )}

        {currentSection === 'schedule' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>SCHEDULE</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              HOUR-BY-HOUR PROTOCOLS · PELOTON DAYS vs LIFTING DAYS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              <button style={{ background: '#262358', border: '1px solid #3a3778', color: '#ede9e0', padding: '12px 16px', borderRadius: 2, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>
                PELOTON DAY
              </button>
              <button style={{ background: '#1e1c47', border: '1px solid #2e2b5e', color: '#a09ccc', padding: '12px 16px', borderRadius: 2, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>
                LIFTING DAY
              </button>
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>Peloton Day Protocol</h2>
            <div style={{ color: '#a09ccc', fontSize: 13, marginBottom: 16 }}>Tues, Thurs, Sat, Sun — Cardio + Recovery Focus</div>
            {PELOTON_DAY.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px auto', gap: 16, padding: 14, background: '#1e1c47', border: '1px solid #2e2b5e', borderLeft: item.type === 'exercise' ? '3px solid #ff4e1b' : item.type === 'food' ? '3px solid #5fc878' : item.type === 'supp' ? '3px solid #c9a96e' : '3px solid #2e2b5e', borderRadius: 2, marginBottom: 6, alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{item.t}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: '#ede9e0', marginBottom: 4 }}>{item.what}</div>
                  <div style={{ fontSize: 13, color: '#a09ccc' }}>{item.d}</div>
                </div>
              </div>
            ))}

            <h2 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginTop: 32, marginBottom: 14 }}>Lifting Day Protocol</h2>
            <div style={{ color: '#a09ccc', fontSize: 13, marginBottom: 16 }}>Mon, Wed, Fri — Strength Training Focus</div>
            {LIFTING_DAY.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px auto', gap: 16, padding: 14, background: '#1e1c47', border: '1px solid #2e2b5e', borderLeft: item.type === 'exercise' ? '3px solid #ff4e1b' : item.type === 'food' ? '3px solid #5fc878' : item.type === 'supp' ? '3px solid #c9a96e' : '3px solid #2e2b5e', borderRadius: 2, marginBottom: 6, alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{item.t}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: '#ede9e0', marginBottom: 4 }}>{item.what}</div>
                  <div style={{ fontSize: 13, color: '#a09ccc' }}>{item.d}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
