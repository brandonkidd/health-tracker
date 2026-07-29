import { NextRequest, NextResponse } from "next/server";
import {
  isCloudConfigured,
  readCloudState,
  writeCloudSnapshot,
  writeCloudState,
} from "@/lib/health/server-repository";
import { scrubSeededArtifacts } from "@/lib/health/storage";
import type { HealthState } from "@/lib/health/types";
import { AUTH_COOKIE, isAuthConfigured, isValidAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Years of daily logs serialize to well under 1 MB; anything near this size
// is not a legitimate save and would only bloat the Supabase JSONB snapshots.
const MAX_STATE_BYTES = 8 * 1024 * 1024;

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

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_STATE_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  try {
    const raw = await request.text();
    if (raw.length > MAX_STATE_BYTES) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    const state = JSON.parse(raw) as HealthState;
    if (state.version !== 2 || !state.days || typeof state.days !== "object") {
      return NextResponse.json({ error: "Invalid health state." }, { status: 400 });
    }
    // Server-side backstop: devices running stale JS can still push the fake
    // seeded values back up; never let them land in the cloud store again.
    scrubSeededArtifacts(state);
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
