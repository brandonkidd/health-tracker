import { NextResponse } from "next/server";
import { APICallError, generateText, Output } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// Same Flash-class model as the screen scanner: logging is interactive.
const MODEL = "google/gemini-3.6-flash";

const workoutSchema = z.object({
  isWorkout: z
    .boolean()
    .describe("True only if the text describes physical exercise the user performed."),
  activity: z.string().describe("Short activity name, e.g. 'Spin class', 'Leg day', 'Trail run'."),
  durationMinutes: z
    .number()
    .nullable()
    .describe(
      "Duration in minutes. Use the stated duration; if none is given, infer a typical one for the activity and mention the assumption in the summary."
    ),
  calories: z
    .number()
    .nullable()
    .describe(
      "Calories burned. Use the stated number if given; otherwise estimate conservatively from MET value × body weight × duration."
    ),
  avgHeartRate: z.number().nullable().describe("Average heart rate in bpm, only if stated."),
  maxHeartRate: z.number().nullable().describe("Max heart rate in bpm, only if stated."),
  exercises: z
    .array(
      z.object({
        name: z.string().describe("Exercise name, e.g. 'Goblet squat'."),
        weightLbs: z.number().nullable().describe("Working weight in pounds if stated."),
        sets: z
          .number()
          .nullable()
          .describe(
            "Sets performed — or rounds completed for AMRAP/rounds-for-time formats. Null if not stated."
          ),
        reps: z.number().nullable().describe("Reps per set (or per round). Null if not stated."),
      })
    )
    .describe("Strength exercises with weights/sets/reps if the description lists them; otherwise empty."),
  summary: z
    .string()
    .describe("One-sentence recap, including any assumptions made (e.g. assumed duration)."),
  recommendations: z
    .array(z.string())
    .describe(
      "Up to 3 short, specific suggestions for next session (e.g. weight progressions based on history). Empty if nothing useful."
    ),
});

interface LogWorkoutRequest {
  description?: string;
  weightLb?: number;
  plannedActivity?: string;
  history?: { date: string; name: string; weightLbs?: number; sets?: number; reps?: number }[];
}

export async function POST(request: Request) {
  let body: LogWorkoutRequest;
  try {
    body = (await request.json()) as LogWorkoutRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: "Describe the workout first." }, { status: 400 });
  }

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
      output: Output.object({ schema: workoutSchema }),
      instructions:
        "You turn a user's plain-language workout description into a structured log entry. " +
        "Trust numbers the user states (duration, calories, heart rate, weights) over your own estimates. " +
        "When calories are not stated, estimate them conservatively using MET values for the activity, the user's body weight, and the duration. " +
        "If no duration is given, assume a typical one for that activity and say so in the summary. " +
        "If the workout is an AMRAP or rounds-for-time format, sets means rounds completed — use the round count the user states, otherwise leave sets null. Never invent sets or reps the user didn't state. " +
        "For recommendations: suggest conservative progressive overload (add 2.5–5 lb or 1–2 reps) only for exercises where the history shows the same weight handled across 2+ sessions. Keep each suggestion under 15 words.",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `Workout description: ${description}\n\n${context}` }],
        },
      ],
      providerOptions: {
        gateway: { tags: ["feature:log-workout"] },
      },
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error("log-workout failed", error);
    if (APICallError.isInstance(error)) {
      const status = error.statusCode ?? 502;
      const message =
        status === 401 || status === 403
          ? "AI Gateway auth failed. Re-pull env vars or enable AI Gateway for this Vercel project."
          : status === 402
            ? "AI Gateway budget reached. Add credits in the Vercel dashboard."
            : "The AI couldn't process that description. Try rephrasing it.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Couldn't log that workout. Try again in a moment." },
      { status: 502 }
    );
  }
}
