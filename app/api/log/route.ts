import { NextRequest, NextResponse } from 'next/server';
import { readCloudState, writeCloudState } from '@/lib/health/server-repository';
import { emptyDailyLog } from '@/lib/health/storage';
import { ptDateKey } from '@/lib/health/date';
import { BODYFI_PLAN } from '@/lib/health/config';
import { AUTH_COOKIE, isValidAuthToken, isValidBearerToken } from '@/lib/auth';

async function isAuthorized(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (isValidBearerToken(bearer, process.env.LOG_API_TOKEN)) return true;
  return isValidAuthToken(request.cookies.get(AUTH_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { action, value, supplementId, supplementName } = body;
    const state = await readCloudState();
    const today = ptDateKey();
    const log = state.days[today] ?? emptyDailyLog(today);
    state.days[today] = log;

    switch (action) {
      case 'water': {
        log.waterOz = Math.max(0, log.waterOz + Number(value));
        await writeCloudState(state);
        return NextResponse.json({
          success: true,
          waterOz: log.waterOz,
          target: BODYFI_PLAN.targets.waterOz,
          message: `Logged ${value} oz water. Total: ${log.waterOz} oz.`
        });
      }

      case 'protein': {
        log.protein = Math.max(0, log.protein + Number(value));
        await writeCloudState(state);
        return NextResponse.json({
          success: true,
          protein: log.protein,
          target: BODYFI_PLAN.targets.protein,
          message: `Logged ${value}g protein. Total: ${log.protein}g.`
        });
      }

      case 'supplement': {
        const taken = !log.supplements[supplementId];
        log.supplements[supplementId] = taken;
        await writeCloudState(state);
        const count = Object.values(log.supplements).filter(Boolean).length;
        return NextResponse.json({
          success: true,
          taken,
          supplementName,
          count,
          message: taken
            ? `${supplementName} logged.`
            : `${supplementName} unmarked.`
        });
      }

      case 'status': {
        const supplements = Object.values(log.supplements).filter(Boolean).length;
        return NextResponse.json({
          success: true,
          data: {
            waterOz: log.waterOz,
            waterTarget: BODYFI_PLAN.targets.waterOz,
            protein: log.protein,
            proteinTarget: BODYFI_PLAN.targets.protein,
            supplements,
            weight: log.weight,
            sleep: log.sleepHours,
            energy: log.energy,
          },
          message: `Today: ${log.waterOz} oz water | ${log.protein}g protein | ${supplements} supplements`
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
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const state = await readCloudState();
    const today = ptDateKey();
    const log = state.days[today] ?? emptyDailyLog(today);
    const supplements = Object.values(log.supplements).filter(Boolean).length;

    return NextResponse.json({
      success: true,
      data: {
        waterOz: log.waterOz,
        waterTarget: BODYFI_PLAN.targets.waterOz,
        protein: log.protein,
        proteinTarget: BODYFI_PLAN.targets.protein,
        supplements,
        weight: log.weight,
        sleep: log.sleepHours,
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
