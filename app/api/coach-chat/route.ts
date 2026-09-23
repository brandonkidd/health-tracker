import { NextResponse } from "next/server";
import { APICallError, generateText } from "ai";

export const maxDuration = 60;

// Interactive talk-back: prefer a fast Flash-class model; fall back to OpenAI
// if the primary gateway path is unavailable.
const MODEL = "google/gemini-3.6-flash";
const FALLBACK_MODEL = "openai/gpt-5.6-sol";

interface CoachChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface CoachChatRequest {
  digest?: unknown;
  insight?: {
    headline?: string;
    summary?: string;
    wins?: string[];
    risks?: string[];
    recommendations?: { title: string; detail: string }[];
    outlook?: string;
  };
  messages?: CoachChatTurn[];
  message?: string;
}

function trimHistory(messages: CoachChatTurn[]): CoachChatTurn[] {
  // Keep the thread short so interactive replies stay cheap and focused.
  return messages.slice(-12).map((turn) => ({
    role: turn.role === "assistant" ? "assistant" : "user",
    content: String(turn.content ?? "").slice(0, 2000),
  }));
}

export async function POST(request: Request) {
  let body: CoachChatRequest;
  try {
    body = (await request.json()) as CoachChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Say something to the coach first." }, { status: 400 });
  }
  if (!body.digest || typeof body.digest !== "object") {
    return NextResponse.json({ error: "Send today's engine digest." }, { status: 400 });
  }
  if (!body.insight || typeof body.insight !== "object") {
    return NextResponse.json({ error: "Send today's insight." }, { status: 400 });
  }

  const history = trimHistory(Array.isArray(body.messages) ? body.messages : []);
  const insightBrief = {
    headline: body.insight.headline ?? "",
    summary: body.insight.summary ?? "",
    wins: body.insight.wins ?? [],
    risks: body.insight.risks ?? [],
    recommendations: body.insight.recommendations ?? [],
    outlook: body.insight.outlook ?? "",
  };

  const system =
    "You are the analytical coach inside a personal recomposition app. The user already received " +
    "today's structured insight and is talking back — clarifying context you may have missed, " +
    "pushing back on a recommendation, or asking why the numbers say what they say. " +
    "Trust the precomputed digest numbers (do not recompute TDEE, targets, or forecast). " +
    "`engine.tdee` is BASE burn without exercise; total burn for a day = tdee + that day's exercise. " +
    "Stay specific and numeric. If the user corrects a fact or adds context (sleep, travel, illness, " +
    "missed weigh-in, alcohol, etc.), acknowledge it and revise your advice accordingly. " +
    "Never invent data. Never give medical advice. Keep replies concise: usually 2-5 short sentences, " +
    "or a tight bullet list when comparing options. Plain text only — no markdown headings.";

  const contextBlock =
    `Today's insight (what the user is reacting to):\n${JSON.stringify(insightBrief)}\n\n` +
    `Engine digest:\n${JSON.stringify(body.digest)}`;

  const generateWith = async (model: string) => {
    const { text } = await generateText({
      model,
      instructions: system,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: contextBlock }],
        },
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text:
                "Got it — I have today's insight and the underlying numbers. " +
                "Push back, clarify, or ask anything about the read.",
            },
          ],
        },
        ...history.map((turn) => ({
          role: turn.role,
          content: [{ type: "text" as const, text: turn.content }],
        })),
        {
          role: "user",
          content: [{ type: "text", text: message.slice(0, 2000) }],
        },
      ],
      providerOptions: {
        gateway: { tags: ["feature:coach-chat"] },
      },
    });
    return text.trim();
  };

  try {
    let reply: string;
    try {
      reply = await generateWith(MODEL);
    } catch (primaryError) {
      console.error(`coach-chat: ${MODEL} failed, trying ${FALLBACK_MODEL}`, primaryError);
      reply = await generateWith(FALLBACK_MODEL);
    }
    if (!reply) {
      return NextResponse.json(
        { error: "The coach returned an empty reply. Try again." },
        { status: 502 }
      );
    }
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("coach-chat failed", error);
    if (APICallError.isInstance(error)) {
      const status = error.statusCode ?? 502;
      const messageText =
        status === 401 || status === 403
          ? "AI Gateway auth failed. Re-pull env vars or enable AI Gateway for this Vercel project."
          : status === 402
            ? "AI Gateway budget reached. Add credits in the Vercel dashboard."
            : "The coach could not reply right now. Try again shortly.";
      return NextResponse.json({ error: messageText }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not reach the coach." }, { status: 502 });
  }
}
