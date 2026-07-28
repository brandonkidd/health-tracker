import { NextResponse } from "next/server";
import { APICallError, generateText, Output } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// Same vision model as scan-workout: the user is standing at the machine
// waiting, so Flash-class latency beats flagship reasoning.
const MODEL = "google/gemini-3.6-flash";

const scanSchema = z.object({
  isBodyScan: z
    .boolean()
    .describe(
      "True only if the photo shows a body composition result sheet or screen (InBody, DEXA, Tanita, or similar)."
    ),
  date: z
    .string()
    .nullable()
    .describe("Test date printed on the sheet as YYYY-MM-DD; null if not visible."),
  weightLb: z.number().nullable().describe("Body weight in pounds; null if not shown."),
  bodyFatPercent: z
    .number()
    .nullable()
    .describe("Percent body fat (PBF), e.g. 21.5; null if not shown."),
  leanMassLb: z
    .number()
    .nullable()
    .describe("Lean body mass / fat-free mass in pounds; null if not shown."),
  muscleMassLb: z
    .number()
    .nullable()
    .describe("Dry lean mass or total muscle mass in pounds; null if not shown."),
  skeletalMuscleLb: z
    .number()
    .nullable()
    .describe("Skeletal muscle mass (SMM) in pounds; null if not shown."),
  visceralFatLevel: z
    .number()
    .nullable()
    .describe("Visceral fat level (unitless InBody level, typically 1-20); null if not shown."),
  bmr: z
    .number()
    .nullable()
    .describe("Basal metabolic rate in kcal; null if not shown."),
  inBodyScore: z.number().nullable().describe("Overall InBody score if shown; null otherwise."),
  summary: z
    .string()
    .describe("One-sentence plain-language recap of the scan results."),
});

interface ScanRequest {
  image?: string;
}

export async function POST(request: Request) {
  let body: ScanRequest;
  try {
    body = (await request.json()) as ScanRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const match = body.image?.match(/^data:(image\/[a-z+.-]+);base64,([\s\S]+)$/);
  if (!match) {
    return NextResponse.json({ error: "Send an image as a base64 data URL." }, { status: 400 });
  }
  const [, mediaType, base64] = match;

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: scanSchema }),
      instructions:
        "You read photos of body composition result sheets and screens — InBody printouts, InBody app screenshots, DEXA reports, and similar. " +
        "Extract only values that are actually printed — never invent or estimate numbers; leave anything not visible null. " +
        "All masses must be reported in pounds: if the sheet shows kilograms, convert with 1 kg = 2.20462 lb and round to one decimal. " +
        "Body fat is the percentage (PBF), not the fat mass. Visceral fat is the unitless level, not an area or mass. " +
        "The test date is usually printed near the top (e.g. '07.27.2026 14:32'); normalize it to YYYY-MM-DD.",
      messages: [
        {
          role: "user",
          content: [
            { type: "file", mediaType, data: base64 },
            { type: "text", text: "Read this body composition scan result." },
          ],
        },
      ],
      providerOptions: {
        gateway: { tags: ["feature:scan-inbody"] },
      },
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error("scan-inbody failed", error);
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
