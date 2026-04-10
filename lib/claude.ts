import Anthropic from "@anthropic-ai/sdk";

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

const SYSTEM_PROMPT = `You are an attention architect. Your job is NOT to summarize. You reason carefully about what matters most, what connects ideas together, and what a reader genuinely needs to retain. You think step by step before producing any output section. Be specific and concrete — never vague or generic.`;

const USER_PROMPT_TEMPLATE = (article: string) => `ARTICLE:
${article}

Work through the following steps in order, outputting each section using the exact XML tags shown. Do not skip any section.

<reasoning>
Step 1 — Core claim: What is the single most important assertion in this article? State it in one sentence.
Step 2 — Connective tissue: What prior knowledge does the reader need? What larger story does this connect to?
Step 3 — Retention priority: What must the reader remember vs. what is just background detail?
Step 4 — Sequence: What order would teach this most effectively to someone encountering it fresh?
</reasoning>

<micro_lesson>
Write 3–5 numbered steps that teach the core idea progressively. Each step must build on the previous. Use plain, direct language. No filler.
</micro_lesson>

<socratic_questions>
Write exactly 3 questions that test genuine comprehension — not recall. Each question must require the reader to apply, connect, or evaluate an idea. Number them 1, 2, 3.
</socratic_questions>

<sixty_second_brief>
Write a brief that a person could read aloud in exactly 60 seconds (approximately 130 words). This is NOT a summary. It is the essential insight and why it matters — written for someone who will act on this information.
</sixty_second_brief>`;

export async function* streamTransform(
  article: string
): AsyncGenerator<StreamChunk> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: USER_PROMPT_TEMPLATE(article) }],
  });

  let buffer = "";
  let currentTag: ChunkType | null = null;

  const TAG_OPEN: Record<string, ChunkType> = {
    "<reasoning>": "reasoning",
    "<micro_lesson>": "micro_lesson",
    "<socratic_questions>": "socratic_questions",
    "<sixty_second_brief>": "sixty_second_brief",
  };

  const TAG_CLOSE: Record<ChunkType, string> = {
    reasoning: "</reasoning>",
    micro_lesson: "</micro_lesson>",
    socratic_questions: "</socratic_questions>",
    sixty_second_brief: "</sixty_second_brief>",
    done: "",
    error: "",
  };

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      buffer += event.delta.text;

      // Try to detect tag transitions in buffer
      while (true) {
        if (currentTag === null) {
          // Look for an opening tag
          let found = false;
          for (const [tag, type] of Object.entries(TAG_OPEN)) {
            const idx = buffer.indexOf(tag);
            if (idx !== -1) {
              buffer = buffer.slice(idx + tag.length);
              currentTag = type;
              found = true;
              break;
            }
          }
          if (!found) {
            // Keep last ~30 chars in buffer in case a tag is split across chunks
            if (buffer.length > 30) buffer = buffer.slice(-30);
            break;
          }
        } else {
          // Look for closing tag
          const closeTag = TAG_CLOSE[currentTag];
          const idx = buffer.indexOf(closeTag);
          if (idx !== -1) {
            // Emit everything up to the closing tag
            const content = buffer.slice(0, idx).trim();
            if (content) yield { type: currentTag, chunk: content };
            buffer = buffer.slice(idx + closeTag.length);
            currentTag = null;
          } else {
            // Emit safe portion (keep possible partial closing tag at end)
            const safeLen = Math.max(0, buffer.length - closeTag.length);
            if (safeLen > 0) {
              yield { type: currentTag, chunk: buffer.slice(0, safeLen) };
              buffer = buffer.slice(safeLen);
            }
            break;
          }
        }
      }
    }
  }

  // Flush any remaining buffer content
  if (currentTag && buffer.trim()) {
    yield { type: currentTag, chunk: buffer.trim() };
  }

  yield { type: "done", chunk: "" };
}
