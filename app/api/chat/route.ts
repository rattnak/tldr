import { NextRequest } from "next/server";
import { streamChat, ChatMessage } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { article, history, message } = await req.json();

  if (!article || !message) {
    return Response.json({ error: "article and message required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat(
          article,
          (history as ChatMessage[]) ?? [],
          message
        )) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", chunk: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
