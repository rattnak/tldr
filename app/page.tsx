"use client";

import { useState, useRef } from "react";
import ArticleInput from "@/components/ArticleInput";
import ReasoningFeed from "@/components/ReasoningFeed";
import MicroLesson from "@/components/MicroLesson";
import SocraticQuestions from "@/components/SocraticQuestions";
import SixtySecondBrief from "@/components/SixtySecondBrief";

type ActiveSection =
  | "reasoning"
  | "micro_lesson"
  | "socratic_questions"
  | "sixty_second_brief"
  | null;

interface OutputState {
  reasoning: string;
  micro_lesson: string;
  socratic_questions: string;
  sixty_second_brief: string;
}

const EMPTY: OutputState = {
  reasoning: "",
  micro_lesson: "",
  socratic_questions: "",
  sixty_second_brief: "",
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<OutputState>(EMPTY);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (article: string) => {
    // Reset state
    setOutput(EMPTY);
    setError(null);
    setActiveSection(null);
    setIsLoading(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Request failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          try {
            const { type, chunk } = JSON.parse(json);

            if (type === "done") {
              setActiveSection(null);
              setIsLoading(false);
              return;
            }

            if (type === "error") {
              setError(chunk);
              setIsLoading(false);
              return;
            }

            setActiveSection(type as ActiveSection);
            setOutput((prev) => ({
              ...prev,
              [type]: prev[type as keyof OutputState] + chunk,
            }));
          } catch {
            // ignore malformed SSE line
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      setActiveSection(null);
    }
  };

  const hasOutput = Object.values(output).some((v) => v.length > 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl flex items-baseline gap-3">
          <h1 className="text-xl font-black tracking-tight text-white">
            TL;DR
          </h1>
          <span className="text-sm text-slate-400">
            Too Long, Didn&apos;t Learn — AI that fixes your attention span
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className={`grid gap-8 ${hasOutput || isLoading ? "lg:grid-cols-2" : "max-w-2xl mx-auto"}`}>
          {/* Left column — input */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">
                Paste any article.
              </h2>
              <p className="text-slate-400 text-sm">
                The agent reasons about what matters, what connects, and what you need to retain — it doesn&apos;t summarize.
              </p>
            </div>

            <ArticleInput onSubmit={handleSubmit} isLoading={isLoading} />

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Legend — only show when output visible */}
            {(hasOutput || isLoading) && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500 space-y-1.5">
                <p className="font-semibold text-slate-400 mb-2">What you&apos;re seeing</p>
                <p><span className="text-indigo-400 font-mono">Agent Reasoning</span> — how the agent thinks before it writes</p>
                <p><span className="text-indigo-300">📚 Micro-Lesson</span> — sequenced steps that teach the core idea</p>
                <p><span className="text-amber-300">🤔 Socratic Questions</span> — comprehension checks, not recall tests</p>
                <p><span className="text-emerald-300">⚡ 60-Second Brief</span> — the essential insight, read-aloud ready</p>
              </div>
            )}
          </div>

          {/* Right column — output */}
          {(hasOutput || isLoading) && (
            <div className="flex flex-col gap-4">
              <ReasoningFeed
                content={output.reasoning}
                active={activeSection === "reasoning"}
              />
              <MicroLesson
                content={output.micro_lesson}
                active={activeSection === "micro_lesson"}
              />
              <SocraticQuestions
                content={output.socratic_questions}
                active={activeSection === "socratic_questions"}
              />
              <SixtySecondBrief
                content={output.sixty_second_brief}
                active={activeSection === "sixty_second_brief"}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
