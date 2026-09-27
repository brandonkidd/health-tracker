import { NextResponse } from "next/server";
import { APICallError, generateText, Output } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// Quality-first: frontier model for the daily coaching analysis (one cached
// call per day, so flagship pricing is still pennies). Falls back to OpenAI's
// flagship if Anthropic is unavailable.
const MODEL = "anthropic/claude-opus-5";
const FALLBACK_MODEL = "openai/gpt-5.6-sol";

const insightSchema = z.object({
  headline: z
    .string()
    .describe("One punchy sentence capturing the single most important thing right now."),
  summary: z
    .string()
    .describe("2-3 sentence plain-language read of the current trajectory: weight trend, energy balance, and adherence, woven together."),
  wins: z
    .array(z.string())
    .describe("Up to 3 short, specific things going well, grounded in the numbers. Empty if none."),
  risks: z
    .array(z.string())
    .describe("Up to 3 short, specific things threatening progress, grounded in the numbers. Empty if none."),
  recommendations: z
    .array(
      z.object({
        title: z.string().describe("Imperative, under 8 words, e.g. 'Hold calories at 2025'."),
        detail: z
          .string()
          .describe("1-2 sentences: the specific numeric adjustment and why the data supports it."),
      })
    )
    .describe("2-3 concrete adjustments for the coming days, most impactful first."),
  outlook: z
    .string()
    .describe("1-2 sentences on where the coming 2-4 weeks lands if current behavior holds, referencing the forecast ETA when available."),
});

export async function POST(request: Request) {
  let body: { digest?: unknown };
  try {
    body = (await request.json()) as { digest?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.digest || typeof body.digest !== "object") {
    return NextResponse.json({ error: "Send the engine digest." }, { status: 400 });
  }

  const generateWith = async (model: string) => {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: insightSchema }),
      instructions:
        "You are the analytical coach inside a personal recomposition app. The user is on a structured cut " +
        "(plan anchors, adaptive TDEE, and deterministic correlations are all precomputed and included in the digest — trust those numbers, do not recompute them). " +
        "Digest fields: `days` is the last 28 days of logs. Each day already includes `activityCalories` (tracked workouts/classes/walks), " +
        "`calorieBudget` (= engine.targets.calories rest-day budget + that day's activityCalories), `vsBudget` (calories − calorieBudget; negative means under the NET budget), " +
        "and `netBalance` (base burn + activity − food; positive means deficit). " +
        "`engine.tdee` is the adaptive BASE daily burn (body only, no exercise) with confidence 0-1; it is anchored to `engine.tdee.scanBmr` (latest InBody BMR) when present so incomplete food logs cannot invent a different metabolism. Total burn for a day = tdee + that day's activityCalories. " +
        "`engine.targets.calories` is a REST-DAY intake budget — exercise earns calories back. Never call a day 'over calories' when vsBudget <= 0, " +
        "and never compare intake only to targets.calories on a trained day; use calorieBudget / vsBudget / netBalance. " +
        "`intakeQuality` flags incomplete or outlier food days (`likelyIncomplete`, `inProgress`, `outlierHigh`, `outlierLow`); " +
        "`logging` summarizes how many such days were excluded from the robust average. Do NOT treat likelyIncomplete / inProgress low totals as intentional deficits — ask for fuller logging or ignore them in the trend read. " +
        "`engine.composition` is the PRIMARY goal — shirt fit: bigger chest/back/arms, smaller stomach (`lookGoal`). " +
        "Steer by waist, body fat %, lean/skeletal muscle, and shirtFitImproving / upperBodyUp / midsectionDown. ETA is to ~15% BF and/or ~35.5\" waist, not a scale weight. " +
        "The user does NOT care what they weigh. Never congratulate or scold based on scale weight alone. " +
        "If composition.isRecompPattern or shirtFitImproving is true, celebrate shape change even when weight is flat. " +
        "`engine.forecast` weight path is secondary noise; prefer composition.etaDate / lookGoal in outlook when available. " +
        "`engine.correlations` are statistically-gated patterns found in the data. " +
        "Write like a sharp, supportive coach: specific numbers over platitudes, never invent data, never give medical advice. " +
        "When TDEE confidence is below 0.5, say estimates are still calibrating and lean on logging consistency as a recommendation. " +
        "Project outcomes from waist/body-fat/lean progress and net energy balance — never from raw calorie totals or scale weight alone. " +
        "Mention sleep, water, steps, or alcohol only when the data actually shows something.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here is today's data digest. Produce the daily insight.\n\n${JSON.stringify(body.digest)}`,
            },
          ],
        },
      ],
      providerOptions: {
        gateway: { tags: ["feature:daily-insight"] },
      },
    });
    return output;
  };

  try {
    let output;
    try {
      output = await generateWith(MODEL);
    } catch (primaryError) {
      console.error(`insights: ${MODEL} failed, trying ${FALLBACK_MODEL}`, primaryError);
      output = await generateWith(FALLBACK_MODEL);
    }
    return NextResponse.json(output);
  } catch (error) {
    console.error("insights failed", error);
    if (APICallError.isInstance(error)) {
      const status = error.statusCode ?? 502;
      const message =
        status === 401 || status === 403
          ? "AI Gateway auth failed. Re-pull env vars or enable AI Gateway for this Vercel project."
          : status === 402
            ? "AI Gateway budget reached. Add credits in the Vercel dashboard."
            : "The model could not analyze today's data. Try again shortly.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Could not generate today's insight." },
      { status: 502 }
    );
  }
}
