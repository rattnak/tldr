"use client";

interface MicroLessonProps {
  content: string;
  active: boolean;
}

export default function MicroLesson({ content, active }: MicroLessonProps) {
  if (!content && !active) return null;

  const lines = content.split("\n").filter((l) => l.trim());

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📚</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400">
          Micro-Lesson
        </h2>
        {active && (
          <span className="ml-auto text-xs text-indigo-500 animate-pulse">streaming…</span>
        )}
      </div>
      <div className="space-y-3">
        {lines.map((line, i) => (
          <p key={i} className="text-sm leading-relaxed text-slate-200">
            {line}
          </p>
        ))}
        {active && !content && (
          <span className="animate-pulse text-indigo-400">▋</span>
        )}
      </div>
    </div>
  );
}
