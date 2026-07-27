import { NextResponse } from "next/server";
import { APICallError, generateText, Output } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// Same Flash-class model as the other loggers: food entry is interactive.
const MODEL = "google/gemini-3.6-flash";

const mealSchema = z.object({
  isFood: z.boolean().describe("True only if the text describes food or drink the user consumed."),
  label: z
    .string()
    .describe("Short meal name for the log, e.g. 'Chicken burrito bowl' or '2 eggs + toast'."),
  calories: z.number().describe("Total calories for everything described."),
  protein: z.number().describe("Total protein in grams."),
  carbs: z.number().describe("Total carbs in grams."),
  fat: z.number().describe("Total fat in grams."),
  fiber: z.number().nullable().describe("Total fiber in grams; null if negligible or unknown."),
  category: z
    .enum([
      "breakfast",
      "snack",
      "smoothie",
      "lunch",
      "dinner",
      "restaurant",
      "quick",
      "drink",
      "alcohol",
    ])
    .describe("Best-fit category, considering the food and the time of day."),
  notes: z
    .string()
    .nullable()
    .describe("Portion assumptions made, e.g. 'assumed 6 oz chicken, 1 cup rice'. Null if none."),
});

interface LogMealRequest {
  description?: string;
  timeOfDay?: string;
}

export async function POST(request: Request) {
  let body: LogMealRequest;
  try {
    body = (await request.json()) as LogMealRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: "Describe what you ate first." }, { status: 400 });
  }

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: mealSchema }),
      instructions:
        "You turn a user's plain-language description of what they ate or drank into one log entry with estimated macros. " +
        "Trust amounts the user states; when portions are unstated, assume typical restaurant/home portions and record the assumption in notes. " +
        "Estimate macros realistically — do not lowball calories on mixed dishes, oils, dressings, or drinks. " +
        "Combine everything described into a single entry with one total.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `What I had: ${description}${body.timeOfDay ? `\nCurrent time: ${body.timeOfDay}` : ""}`,
            },
          ],
        },
      ],
      providerOptions: {
        gateway: { tags: ["feature:log-meal"] },
      },
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error("log-meal failed", error);
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
      { error: "Couldn't log that meal. Try again in a moment." },
      { status: 502 }
    );
  }
}
