"use client";

import { useState } from "react";
import { ComprehensionResult } from "@/lib/claude";

interface SocraticQuestionsProps {
  content: string;
  active: boolean;
  article: string;
}

interface QuestionState {
  answer: string;
  result: ComprehensionResult | null;
  loading: boolean;
  submitted: boolean;
}

export default function SocraticQuestions({ content, active, article }: SocraticQuestionsProps) {
  const [states, setStates] = useState<Record<number, QuestionState>>({});

  if (!content && !active) return null;

  const lines = content.split("\n").filter((l) => l.trim());

  const setQuestion = (i: number, patch: Partial<QuestionState>) => {
    setStates((prev) => ({
      ...prev,
      [i]: { ...{ answer: "", result: null, loading: false, submitted: false }, ...prev[i], ...patch },
    }));
  };

  const submit = async (i: number, question: string) => {
    const s = states[i];
    if (!s?.answer?.trim()) return;
    setQuestion(i, { loading: true });
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article, question, answer: s.answer }),
      });
      const result: ComprehensionResult = await res.json();
      setQuestion(i, { result, loading: false, submitted: true });
    } catch {
      setQuestion(i, { loading: false });
    }
  };

  const scoreColors: Record<string, string> = {
    correct: "text-emerald-400 border-emerald-500/40 bg-emerald-950/30",
    partial: "text-amber-400 border-amber-500/40 bg-amber-950/30",
    incorrect: "text-red-400 border-red-500/40 bg-red-950/30",
  };

  const scoreLabel: Record<string, string> = {
    correct: "✓ Correct",
    partial: "~ Partially correct",
    incorrect: "✗ Not quite",
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">🤔</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400">
          Socratic Questions
        </h2>
        {active && (
          <span className="ml-auto text-xs text-amber-500 animate-pulse">streaming…</span>
        )}
      </div>

      <div className="space-y-5">
        {lines.map((line, i) => {
          const s = states[i] ?? { answer: "", result: null, loading: false, submitted: false };
          return (
            <div key={i} className="space-y-2">
              <p className="text-sm leading-relaxed text-slate-200">{line}</p>

              {/* Answer input — only show when transform is done */}
              {!active && content && (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={s.answer}
                    onChange={(e) => setQuestion(i, { answer: e.target.value, result: null, submitted: false })}
                    disabled={s.loading}
                    placeholder="Type your answer…"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none resize-none disabled:opacity-50"
                  />
                  <button
                    onClick={() => submit(i, line)}
                    disabled={!s.answer?.trim() || s.loading}
                    className="rounded-lg bg-amber-900/50 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {s.loading ? "Evaluating…" : "Check answer"}
                  </button>

                  {/* Feedback */}
                  {s.result && (
                    <div className={`rounded-lg border p-3 text-xs space-y-1.5 ${scoreColors[s.result.score]}`}>
                      <p className="font-bold">{scoreLabel[s.result.score]}</p>
                      <p className="text-slate-300">{s.result.feedback}</p>
                      {s.result.reteach && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                          <p className="font-semibold text-slate-400 mb-1">Re-explanation:</p>
                          <p className="text-slate-300">{s.result.reteach}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {active && !content && (
          <span className="animate-pulse text-amber-400">▋</span>
        )}
      </div>
    </div>
  );
}
