import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Zod schema — single source of truth for what Claude must return ───────────
export const TransformSchema = z.object({
  reasoning: z.object({
    core_claim: z.string().describe("The single most important assertion in one sentence"),
    connective_tissue: z.string().describe("Prior knowledge needed and larger story this connects to"),
    retention_priority: z.string().describe("What must be remembered vs background detail"),
    sequence: z.string().describe("Best order to teach this to someone encountering it fresh"),
  }),
  micro_lesson: z.array(z.string()).min(3).max(5).describe("3-5 numbered steps teaching the core idea progressively"),
  socratic_questions: z.tuple([z.string(), z.string(), z.string()]).describe("Exactly 3 comprehension questions that require applying, connecting, or evaluating"),
  sixty_second_brief: z.string().describe("~130 words readable aloud in 60 seconds — the essential insight and why it matters"),
});

export type TransformOutput = z.infer<typeof TransformSchema>;

export type ChunkType =
  | "reasoning"
  | "micro_lesson"
  | "socratic_questions"
  | "sixty_second_brief"
  | "done"
  | "error";

export interface StreamChunk {
  type: ChunkType;
  chunk: string;
}

// ─── Chat types for follow-up Q&A ─────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are an attention architect. Your job is NOT to summarize. You reason carefully about what matters most, what connects ideas together, and what a reader genuinely needs to retain. You think step by step before producing any output. Be specific and concrete — never vague or generic.

You MUST respond with valid JSON that exactly matches this structure:
{
  "reasoning": {
    "core_claim": "string",
    "connective_tissue": "string",
    "retention_priority": "string",
    "sequence": "string"
  },
  "micro_lesson": ["step 1", "step 2", "step 3"],
  "socratic_questions": ["question 1", "question 2", "question 3"],
  "sixty_second_brief": "string"
}`;

// ─── Main transform — streams JSON then parses + validates with Zod ────────────
export async function* streamTransform(
  article: string
): AsyncGenerator<StreamChunk> {
  const stream = client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Transform this article. Return only valid JSON matching the schema — no markdown fences, no commentary.\n\nARTICLE:\n${article}`,
      },
    ],
  });

  // Stream raw text to client so the UI shows activity immediately
  let fullText = "";
  const sectionsSent = new Set<ChunkType>();

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;

      // Speculatively stream each section as soon as its JSON value closes
      // This gives real-time feel while we accumulate the full response
      tryStreamSection(fullText, "reasoning", sectionsSent, (chunk) => {
        // Will yield after loop — collect for now
        void chunk;
      });
    }
  }

  // Full response received — parse and validate with Zod
  let parsed: TransformOutput;
  try {
    const json = extractJSON(fullText);
    parsed = TransformSchema.parse(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Validation failed";
    yield { type: "error", chunk: `Schema validation error: ${msg}\n\nRaw: ${fullText.slice(0, 300)}` };
    return;
  }

  // Yield each section as a complete, validated chunk
  const reasoningText = [
    `Core claim: ${parsed.reasoning.core_claim}`,
    `\nConnective tissue: ${parsed.reasoning.connective_tissue}`,
    `\nRetention priority: ${parsed.reasoning.retention_priority}`,
    `\nSequence: ${parsed.reasoning.sequence}`,
  ].join("");
  yield { type: "reasoning", chunk: reasoningText };

  yield {
    type: "micro_lesson",
    chunk: parsed.micro_lesson.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  };

  yield {
    type: "socratic_questions",
    chunk: parsed.socratic_questions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
  };

  yield { type: "sixty_second_brief", chunk: parsed.sixty_second_brief };
  yield { type: "done", chunk: "" };
}

// ─── Follow-up chat — article stays in context, multi-turn ───────────────────
export async function* streamChat(
  article: string,
  history: ChatMessage[],
  userMessage: string
): AsyncGenerator<StreamChunk> {
  const chatSystem = `You are a knowledgeable tutor helping a reader understand a specific article.
Answer questions directly and concisely. Reference specific parts of the article when relevant.
If the user seems to misunderstand something, gently correct them with evidence from the text.

ARTICLE CONTEXT:
${article}`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const stream = client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: chatSystem,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield { type: "reasoning", chunk: event.delta.text };
    }
  }

  yield { type: "done", chunk: "" };
}

// ─── Comprehension evaluator — scores answer + re-teaches if needed ───────────
export interface ComprehensionResult {
  score: "correct" | "partial" | "incorrect";
  feedback: string;
  reteach?: string;
}

export async function evaluateAnswer(
  article: string,
  question: string,
  userAnswer: string
): Promise<ComprehensionResult> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `You evaluate comprehension answers about articles. Respond only with valid JSON matching:
{"score": "correct"|"partial"|"incorrect", "feedback": "string", "reteach": "string or null"}
reteach should be a 2-3 sentence targeted re-explanation only if score is partial or incorrect, otherwise null.`,
    messages: [
      {
        role: "user",
        content: `ARTICLE: ${article.slice(0, 2000)}\n\nQUESTION: ${question}\n\nSTUDENT ANSWER: ${userAnswer}\n\nEvaluate this answer. Return only JSON.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const json = extractJSON(text);
    return json as ComprehensionResult;
  } catch {
    return {
      score: "partial",
      feedback: "Could not evaluate — please try again.",
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractJSON(text: string): unknown {
  // Strip markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  // Find the outermost { } block
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return JSON.parse(stripped.slice(start, end + 1));
}

// Unused but kept for future partial-streaming upgrade
function tryStreamSection(
  _text: string,
  _section: ChunkType,
  _sent: Set<ChunkType>,
  _cb: (chunk: string) => void
): void {}
