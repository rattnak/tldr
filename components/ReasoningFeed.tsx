"use client";

interface ReasoningFeedProps {
  content: string;
  active: boolean;
}

export default function ReasoningFeed({ content, active }: ReasoningFeedProps) {
  if (!content && !active) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Agent Reasoning
        </span>
        {active && (
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
          </span>
        )}
      </div>
      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-400">
        {content}
        {active && <span className="animate-pulse text-indigo-400">▋</span>}
      </pre>
    </div>
  );
}
