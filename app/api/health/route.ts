import { NextRequest, NextResponse } from "next/server";
import {
  isCloudConfigured,
  readCloudState,
  writeCloudSnapshot,
  writeCloudState,
} from "@/lib/health/server-repository";
import type { HealthState } from "@/lib/health/types";
import { AUTH_COOKIE, isAuthConfigured, isValidAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(request: NextRequest) {
  if (!isAuthConfigured()) return false;
  return isValidAuthToken(request.cookies.get(AUTH_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!isCloudConfigured()) {
    return NextResponse.json(
      { configured: false, error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Cloud sync requires authentication." }, { status: 401 });
  }

  try {
    return NextResponse.json({ configured: true, state: await readCloudState() });
  } catch (error) {
    console.error("Health state read failed", error);
    return NextResponse.json(
      { configured: true, error: "Could not load health data." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isCloudConfigured()) {
    return NextResponse.json(
      { configured: false, error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Cloud sync requires authentication." }, { status: 401 });
  }

  try {
    const state = (await request.json()) as HealthState;
    if (state.version !== 2 || !state.days) {
      return NextResponse.json({ error: "Invalid health state." }, { status: 400 });
    }
    await writeCloudState(state);
    try {
      await writeCloudSnapshot(state);
    } catch (snapshotError) {
      // Snapshots are a safety layer, not the primary store; a failure here
      // (e.g. migration not yet run) must never fail the actual save.
      console.error("Cloud snapshot write failed (non-fatal)", snapshotError);
    }
    return NextResponse.json({ configured: true, saved: true });
  } catch (error) {
    console.error("Health state write failed", error);
    return NextResponse.json(
      { configured: true, error: "Could not save health data." },
      { status: 500 }
    );
  }
}
