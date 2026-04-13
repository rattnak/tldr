"use client";

import CopyButton from "./CopyButton";

interface SixtySecondBriefProps {
  content: string;
  active: boolean;
}

export default function SixtySecondBrief({ content, active }: SixtySecondBriefProps) {
  if (!content && !active) return null;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-400">60-Second Brief</h2>
        {active && <span className="ml-auto text-xs text-emerald-500 animate-pulse">streaming…</span>}
        {!active && content && (
          <>
            <span className="text-xs font-mono text-emerald-700 border border-emerald-800 rounded px-1.5 py-0.5">
              {wordCount}w
            </span>
            <CopyButton text={content} />
          </>
        )}
      </div>
      <p className="text-sm leading-relaxed text-slate-200">
        {content}
        {active && !content && <span className="animate-pulse text-emerald-400">▋</span>}
      </p>
    </div>
  );
}
