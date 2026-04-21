'use client';
import { useState, useEffect } from 'react';
import './globals.css';
import { WORKOUTS, SUPPLEMENTS_DAILY, DATES, BASELINE, TARGETS, NON_NEGOTIABLES, daysUntil, MEALS_PLAN, LABS_2023, RETEST_PANEL, PELOTON_DAY, LIFTING_DAY } from '@/lib/health-data';

const STORE_KEY = "brandon_gameplan_v1";

export default function Home() {
  const [state, setState] = useState<any>({});
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [currentWorkout, setCurrentWorkout] = useState<'A' | 'B' | 'C'>('A');
  const [currentSchedule, setCurrentSchedule] = useState<'peloton' | 'lifting'>('peloton');
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
      const filled = d.water || 0; // water is stored as number of drops (each 8oz)
      const target = index < filled ? index : index + 1;
      d.water = target;
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

  const toggleMeal = (mealName: string) => {
    const key = todayKey();
    updateState((prev: any) => {
      const days = { ...prev.days };
      const d = ensureDay(key);
      if (!d.meals) d.meals = {};
      d.meals[mealName] = !d.meals[mealName];
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
                <div style={{ background: 'radial-gradient(circle at 50% 120%,rgba(95,200,120,.22) 0%,transparent 60%),rgba(26,24,64,.55)', border: '1px solid #5fc878', borderRadius: 4, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, fontStyle: 'italic', letterSpacing: -2, color: '#5fc878' }}>
                    {streak}
                    <span style={{ fontSize: 16, marginLeft: 4 }}>🔥</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#a09ccc', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, fontWeight: 800 }}>Day Streak</div>
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
                      {Math.round((today.water || 0) * 8)}<span style={{ fontSize: 14, color: '#a09ccc' }}> / {targetWater} OZ</span>
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
            {(() => {
              const dayOfWeek = new Date().getDay();
              const isLiftDay = [1, 3, 5].includes(dayOfWeek);
              const dayType = isLiftDay ? 'LIFTING DAY' : 'PELOTON DAY';
              const schedule = isLiftDay ? LIFTING_DAY : PELOTON_DAY;

              return (
                <>
                  <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} · {dayType}
                  </div>

                  {/* Quick Tracking Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {/* Water */}
                    <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20 }}>
                      <h3 style={{ fontSize: 15, marginBottom: 8, fontWeight: 900, textTransform: 'uppercase' }}>
                        WATER · {Math.round((today.water || 0) * 8)} / 96 OZ
                      </h3>
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
                      <h3 style={{ fontSize: 15, marginBottom: 8, fontWeight: 900, textTransform: 'uppercase' }}>
                        PROTEIN · {today.protein || 0} / 190G
                      </h3>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {[
                          { label: '+20 EGGS', val: 20 },
                          { label: '+25 SHAKE', val: 25 },
                          { label: '+25 COTTAGE', val: 25 },
                          { label: '+42 CHICKEN', val: 42 },
                          { label: '+45 STEAK', val: 45 },
                          { label: '+34 SALMON', val: 34 },
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
                      </div>
                    </div>

                    {/* Supplements */}
                    <div style={{ background: '#1e1c47', border: '1px solid #2e2b5e', borderRadius: 4, padding: 20 }}>
                      <h3 style={{ fontSize: 15, marginBottom: 8, fontWeight: 900, textTransform: 'uppercase' }}>
                        SUPPLEMENTS · {suppsDone} / {suppsTotal}
                      </h3>
                      <div style={{ fontSize: 12, color: '#a09ccc', marginTop: 4 }}>
                        Check off as you take them below
                      </div>
                    </div>
                  </div>

                  {/* Timeline Cards */}
                  <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 16 }}>TODAY'S SCHEDULE</h2>
                  
                  {schedule.map((item, i) => {
                    const taskKey = `task-${todayKey()}-${i}`;
                    const taskDone = state.tasks?.[taskKey] || false;
                    
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
                                  const done = today.supps[s.id];
                                  return (
                                    <div
                                      key={s.id}
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
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={done || false}
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
                                      <div style={{ fontSize: 12, fontWeight: 700, color: done ? '#6864a0' : '#ede9e0', textDecoration: done ? 'line-through' : 'none' }}>
                                        {s.name} · {s.dose}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {currentSection === 'workouts' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>WORKOUTS</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              PHASE 1 · 3× / WEEK · TRX + KETTLEBELLS + DUMBBELLS
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
          </div>
        )}

        {currentSection === 'nutrition' && (
          <div>
            <h1 style={{ fontSize: 52, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 14 }}>NUTRITION</h1>
            <div style={{ color: '#a09ccc', fontSize: 14, marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              DAILY TARGETS: {TARGETS.cals} CAL · {TARGETS.protein}G PROTEIN · {TARGETS.carbs}G CARBS · {TARGETS.fat}G FAT
            </div>

            {MEALS_PLAN.map((meal, i) => {
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
                              const days = { ...prev.days };
                              const d = ensureDay(todayKey());
                              if (!d.meals) d.meals = {};
                              d.meals[itemKey] = !d.meals[itemKey];
                              days[todayKey()] = d;
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

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {(['peloton', 'lifting'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setCurrentSchedule(s)}
                  style={{
                    background: currentSchedule === s ? '#ff4e1b' : '#262358',
                    border: `1px solid ${currentSchedule === s ? '#ff4e1b' : '#3a3778'}`,
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
                    if (currentSchedule !== s) {
                      e.currentTarget.style.borderColor = '#ff4e1b';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentSchedule !== s) {
                      e.currentTarget.style.borderColor = '#3a3778';
                    }
                  }}
                >
                  {s === 'peloton' ? 'PELOTON DAY' : 'LIFTING DAY'}
                </button>
              ))}
            </div>

            {(() => {
              const schedule = currentSchedule === 'peloton' ? PELOTON_DAY : LIFTING_DAY;
              const scheduleTitle = currentSchedule === 'peloton' ? 'Peloton Day Protocol' : 'Lifting Day Protocol';
              const scheduleDesc = currentSchedule === 'peloton' ? 'Tues, Thurs, Sat, Sun — Cardio + Recovery Focus' : 'Mon, Wed, Fri — Strength Training Focus';

              return (
                <div>
                  <h2 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 8 }}>{scheduleTitle}</h2>
                  <div style={{ color: '#a09ccc', fontSize: 13, marginBottom: 16 }}>{scheduleDesc}</div>
                  
                  {schedule.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px auto', gap: 16, padding: 14, background: '#1e1c47', border: '1px solid #2e2b5e', borderLeft: item.type === 'exercise' ? '3px solid #ff4e1b' : item.type === 'food' ? '3px solid #5fc878' : item.type === 'supp' ? '3px solid #c9a96e' : '3px solid #2e2b5e', borderRadius: 2, marginBottom: 6, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: '#ff4e1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{item.t}</div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 14, color: '#ede9e0', marginBottom: 4 }}>{item.what}</div>
                        <div style={{ fontSize: 13, color: '#a09ccc' }}>{item.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </>
  );
}
