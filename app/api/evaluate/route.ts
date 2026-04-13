import { NextRequest } from "next/server";
import { evaluateAnswer } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { article, question, answer } = await req.json();

  if (!article || !question || !answer) {
    return Response.json({ error: "article, question, and answer required" }, { status: 400 });
  }

  try {
    const result = await evaluateAnswer(article, question, answer);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
