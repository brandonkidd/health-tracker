import { NextRequest, NextResponse } from 'next/server';
import { addWater, addProtein, toggleSupplement, getTodayLog, getTodaySupplements } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, value, supplementId, supplementName } = body;

    switch (action) {
      case 'water': {
        const log = await addWater(value);
        return NextResponse.json({
          success: true,
          water: log.water,
          target: 4,
          message: `✅ Logged ${value}L water. Total today: ${log.water?.toFixed(2)}L / 4L`
        });
      }

      case 'protein': {
        const log = await addProtein(value);
        return NextResponse.json({
          success: true,
          protein: log.protein,
          target: 190,
          message: `✅ Logged ${value}g protein. Total today: ${log.protein}g / 190g`
        });
      }

      case 'supplement': {
        const taken = await toggleSupplement(supplementId, supplementName);
        const supplements = await getTodaySupplements();
        return NextResponse.json({
          success: true,
          taken,
          count: supplements.length,
          target: 8,
          message: taken
            ? `✅ ${supplementName} logged. ${supplements.length}/8 supplements today`
            : `❌ ${supplementName} unmarked`
        });
      }

      case 'status': {
        const log = await getTodayLog();
        const supplements = await getTodaySupplements();
        return NextResponse.json({
          success: true,
          data: {
            water: log.water,
            waterTarget: 4,
            protein: log.protein,
            proteinTarget: 190,
            supplements: supplements.length,
            supplementsTarget: 8,
            weight: log.weight,
            sleep: log.sleep,
            energy: log.energy,
          },
          message: `📊 Today: ${log.water?.toFixed(1)}L water | ${log.protein}g protein | ${supplements.length}/8 supps`
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Log API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const log = await getTodayLog();
    const supplements = await getTodaySupplements();

    return NextResponse.json({
      success: true,
      data: {
        water: log.water,
        waterTarget: 4,
        protein: log.protein,
        proteinTarget: 190,
        supplements: supplements.length,
        supplementsTarget: 8,
        weight: log.weight,
        sleep: log.sleep,
        energy: log.energy,
        mood: log.mood,
      }
    });
  } catch (error: any) {
    console.error('Log API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
