"use client";

interface SocraticQuestionsProps {
  content: string;
  active: boolean;
}

export default function SocraticQuestions({ content, active }: SocraticQuestionsProps) {
  if (!content && !active) return null;

  const lines = content.split("\n").filter((l) => l.trim());

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
      <div className="space-y-3">
        {lines.map((line, i) => (
          <p key={i} className="text-sm leading-relaxed text-slate-200">
            {line}
          </p>
        ))}
        {active && !content && (
          <span className="animate-pulse text-amber-400">▋</span>
        )}
      </div>
    </div>
  );
}
