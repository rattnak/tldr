"use client";

interface SixtySecondBriefProps {
  content: string;
  active: boolean;
}

export default function SixtySecondBrief({ content, active }: SixtySecondBriefProps) {
  if (!content && !active) return null;

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-400">
          60-Second Brief
        </h2>
        <span className="ml-auto rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-400">
          ~130 words
        </span>
        {active && (
          <span className="text-xs text-emerald-500 animate-pulse">streaming…</span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-slate-100">
        {content}
        {active && <span className="animate-pulse text-emerald-400">▋</span>}
      </p>
    </div>
  );
}
