import { NextRequest, NextResponse } from "next/server";
import {
  isCloudConfigured,
  listCloudSnapshots,
  readCloudSnapshot,
} from "@/lib/health/server-repository";
import { AUTH_COOKIE, isAuthConfigured, isValidAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(request: NextRequest) {
  if (!isAuthConfigured()) return false;
  return isValidAuthToken(request.cookies.get(AUTH_COOKIE)?.value);
}

/** List cloud snapshots, or fetch one full snapshot with ?date=YYYY-MM-DD. */
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

  const date = request.nextUrl.searchParams.get("date");
  try {
    if (date) {
      const state = await readCloudSnapshot(date);
      if (!state) {
        return NextResponse.json({ error: "No snapshot for that date." }, { status: 404 });
      }
      return NextResponse.json({ date, state });
    }
    return NextResponse.json({ snapshots: await listCloudSnapshots() });
  } catch (error) {
    console.error("Cloud snapshot read failed", error);
    return NextResponse.json({ error: "Could not load snapshots." }, { status: 500 });
  }
}
