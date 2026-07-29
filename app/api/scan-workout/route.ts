import { NextResponse } from "next/server";
import { APICallError, generateText, Output } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// Vision-capable and fast: scanning is interactive (user waits at the gym),
// so Flash-class latency matters more than flagship reasoning here.
const MODEL = "google/gemini-3.6-flash";

const scanSchema = z.object({
  isWorkoutScreen: z
    .boolean()
    .describe("True only if the photo shows a workout/class results screen, fitness display, or watch summary."),
  activity: z.string().describe("Short activity name, e.g. 'Alpha class', 'Yoga', 'Treadmill run'."),
  durationMinutes: z.number().nullable().describe("Workout duration in minutes if shown."),
  calories: z.number().nullable().describe("Calories burned as shown on screen; null if not visible."),
  avgHeartRate: z.number().nullable().describe("Average heart rate in bpm if shown."),
  maxHeartRate: z.number().nullable().describe("Max heart rate in bpm if shown."),
  exercises: z
    .array(
      z.object({
        name: z.string().describe("Exercise name, e.g. 'Goblet squat'."),
        weightLbs: z.number().nullable().describe("Working weight in pounds if visible."),
        sets: z
          .number()
          .nullable()
          .describe(
            "Sets shown on screen — or rounds completed for AMRAP/rounds-for-time formats. Null if not visible."
          ),
        reps: z.number().nullable().describe("Reps per set (or per round). Null if not visible."),
      })
    )
    .describe("Strength exercises with weights/sets/reps if the screen lists them; otherwise empty."),
  summary: z.string().describe("One-sentence plain-language recap of the workout."),
  recommendations: z
    .array(z.string())
    .describe(
      "Up to 3 short, specific suggestions for next session (e.g. weight progressions based on history). Empty if nothing useful."
    ),
});

interface ScanRequest {
  image?: string;
  weightLb?: number;
  plannedActivity?: string;
  history?: { date: string; name: string; weightLbs?: number; sets?: number; reps?: number }[];
}

export async function POST(request: Request) {
  let body: ScanRequest;
  try {
    body = (await request.json()) as ScanRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const dataUrl = body.image;
  const match = dataUrl?.match(/^data:(image\/[a-z+.-]+);base64,([\s\S]+)$/);
  if (!match) {
    return NextResponse.json({ error: "Send an image as a base64 data URL." }, { status: 400 });
  }
  const [, mediaType, base64] = match;

  const historyLines = (body.history ?? [])
    .slice(0, 40)
    .map(
      (item) =>
        `- ${item.date}: ${item.name}${item.weightLbs ? ` @ ${item.weightLbs} lb` : ""}${
          item.sets ? ` × ${item.sets} sets` : ""
        }${item.reps ? ` × ${item.reps} reps` : ""}`
    )
    .join("\n");

  const context = [
    `User body weight: ${body.weightLb ?? 193} lb.`,
    body.plannedActivity ? `Today's planned activity: ${body.plannedActivity}.` : "",
    historyLines
      ? `Recent strength history (for progression recommendations):\n${historyLines}`
      : "No strength history logged yet.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: scanSchema }),
      instructions:
        "You read photos of fitness class screens (like Life Time Alpha leaderboards), cardio machine displays, and smartwatch workout summaries. " +
        "Extract only what is actually visible — never invent numbers. If calories are not shown, leave calories null; the app will estimate them. " +
        "If the screen lists strength exercises with weights, extract each one. " +
        "Watch for the class format: if it's an AMRAP or rounds-for-time workout, sets means rounds completed — use the round count if shown, otherwise leave sets null. Never assume a default like 3×10, and mention the format in the summary. " +
        "For recommendations: suggest conservative progressive overload (add 2.5–5 lb or 1–2 reps) only for exercises where the history shows the same weight handled across 2+ sessions. Keep each suggestion under 15 words.",
      messages: [
        {
          role: "user",
          content: [
            { type: "file", mediaType, data: base64 },
            { type: "text", text: `Read this workout screen.\n\n${context}` },
          ],
        },
      ],
      providerOptions: {
        gateway: { tags: ["feature:scan-workout"] },
      },
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error("scan-workout failed", error);
    if (APICallError.isInstance(error)) {
      const status = error.statusCode ?? 502;
      const message =
        status === 401 || status === 403
          ? "AI Gateway auth failed. Re-pull env vars or enable AI Gateway for this Vercel project."
          : status === 402
            ? "AI Gateway budget reached. Add credits in the Vercel dashboard."
            : "The vision model could not process this image. Try a clearer photo.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Could not read the photo. Try again with a clearer shot." },
      { status: 502 }
    );
  }
}
