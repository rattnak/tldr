import { NextRequest } from "next/server";
import { streamTransform } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { article } = await req.json();

  if (!article || typeof article !== "string" || article.trim().length < 50) {
    return new Response(
      JSON.stringify({ error: "Please provide an article with at least 50 characters." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamTransform(article.trim())) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err);
        console.error("Transform error:", errMsg);
        const data = `data: ${JSON.stringify({ type: "error", chunk: errMsg })}\n\n`;
        controller.enqueue(encoder.encode(data));
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
