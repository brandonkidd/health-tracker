import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface DailyLog {
  id?: string;
  date: string;
  water: number;
  protein: number;
  weight?: number;
  sleep?: number;
  energy?: number;
  mood?: number;
  steps?: number;
  caffeine_ok?: string;
  day_type?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplementLog {
  id?: string;
  date: string;
  supplement_id: string;
  supplement_name: string;
  taken: boolean;
  taken_at?: string;
  created_at?: string;
}

export interface WorkoutLog {
  id?: string;
  date: string;
  workout_type: string;
  exercise: string;
  sets: number;
  reps: string;
  weight: number;
  notes?: string;
  created_at?: string;
}

// Helper to get or create today's daily log
export async function getTodayLog(): Promise<DailyLog> {
  const today = new Date().toISOString().slice(0, 10);
  
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('date', today)
    .single();

  if (error && error.code === 'PGRST116') {
    // Row doesn't exist, create it
    const newLog: DailyLog = {
      date: today,
      water: 0,
      protein: 0,
    };

    const { data: created, error: createError } = await supabase
      .from('daily_logs')
      .insert([newLog])
      .select()
      .single();

    if (createError) throw createError;
    return created;
  }

  if (error) throw error;
  return data;
}

// Update daily log fields
export async function updateDailyLog(updates: Partial<DailyLog>): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  
  const { error } = await supabase
    .from('daily_logs')
    .upsert({
      date: today,
      ...updates,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

// Add water (in liters)
export async function addWater(amount: number): Promise<DailyLog> {
  const log = await getTodayLog();
  const newWater = Math.max(0, (log.water || 0) + amount);
  
  await updateDailyLog({ water: newWater });
  
  return { ...log, water: newWater };
}

// Add protein (in grams)
export async function addProtein(amount: number): Promise<DailyLog> {
  const log = await getTodayLog();
  const newProtein = Math.max(0, (log.protein || 0) + amount);
  
  await updateDailyLog({ protein: newProtein });
  
  return { ...log, protein: newProtein };
}

// Toggle supplement
export async function toggleSupplement(supplementId: string, supplementName: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  
  const { data: existing } = await supabase
    .from('supplement_logs')
    .select('*')
    .eq('date', today)
    .eq('supplement_id', supplementId)
    .single();

  if (existing) {
    // Toggle off
    await supabase
      .from('supplement_logs')
      .delete()
      .eq('date', today)
      .eq('supplement_id', supplementId);
    return false;
  } else {
    // Toggle on
    await supabase
      .from('supplement_logs')
      .insert([{
        date: today,
        supplement_id: supplementId,
        supplement_name: supplementName,
        taken: true,
        taken_at: new Date().toISOString(),
      }]);
    return true;
  }
}

// Get today's supplements
export async function getTodaySupplements(): Promise<SupplementLog[]> {
  const today = new Date().toISOString().slice(0, 10);
  
  const { data, error } = await supabase
    .from('supplement_logs')
    .select('*')
    .eq('date', today);

  if (error) throw error;
  return data || [];
}

// Get recent daily logs (for trends)
export async function getRecentLogs(days: number = 14): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(days);

  if (error) throw error;
  return data || [];
}
