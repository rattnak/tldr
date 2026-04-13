"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ArticleInput from "@/components/ArticleInput";
import ReasoningFeed from "@/components/ReasoningFeed";
import MicroLesson from "@/components/MicroLesson";
import SocraticQuestions from "@/components/SocraticQuestions";
import SixtySecondBrief from "@/components/SixtySecondBrief";
import ChatPanel from "@/components/ChatPanel";

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

interface HistoryEntry {
  id: string;
  title: string;
  article: string;
  output: OutputState;
  createdAt: number;
}

const EMPTY: OutputState = {
  reasoning: "",
  micro_lesson: "",
  socratic_questions: "",
  sixty_second_brief: "",
};

const HISTORY_KEY = "tldr_history";

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)));
}

function truncateTitle(text: string, maxLen = 60): string {
  const firstLine = text.trim().split("\n")[0];
  return firstLine.length > maxLen ? firstLine.slice(0, maxLen) + "…" : firstLine;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<OutputState>(EMPTY);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleSubmit = useCallback(async (articleText: string) => {
    setOutput(EMPTY);
    setError(null);
    setActiveSection(null);
    setIsLoading(true);
    setArticle(articleText);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article: articleText }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Request failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const finalOutput: OutputState = { ...EMPTY };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const { type, chunk } = JSON.parse(raw);

            if (type === "done") {
              setActiveSection(null);
              setIsLoading(false);

              // Save to history
              const entry: HistoryEntry = {
                id: Date.now().toString(),
                title: truncateTitle(articleText),
                article: articleText,
                output: finalOutput,
                createdAt: Date.now(),
              };
              const updated = [entry, ...loadHistory()];
              saveHistory(updated);
              setHistory(updated);
              return;
            }

            if (type === "error") {
              setError(chunk);
              setIsLoading(false);
              return;
            }

            setActiveSection(type as ActiveSection);
            setOutput((prev) => {
              const next = { ...prev, [type]: prev[type as keyof OutputState] + chunk };
              finalOutput[type as keyof OutputState] = next[type as keyof OutputState];
              return next;
            });
          } catch { /* ignore malformed SSE */ }
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
  }, []);

  const loadFromHistory = (entry: HistoryEntry) => {
    setArticle(entry.article);
    setOutput(entry.output);
    setActiveSection(null);
    setError(null);
    setSidebarOpen(false);
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
    setHistory(updated);
  };

  const exportAll = () => {
    const md = [
      `# TL;DR Export`,
      ``,
      `## Article`,
      article,
      ``,
      `## Agent Reasoning`,
      output.reasoning,
      ``,
      `## Micro-Lesson`,
      output.micro_lesson,
      ``,
      `## Socratic Questions`,
      output.socratic_questions,
      ``,
      `## 60-Second Brief`,
      output.sixty_second_brief,
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tldr-export.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasOutput = Object.values(output).some((v) => v.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="History"
          >
            ☰
          </button>
          <h1 className="text-xl font-black tracking-tight text-white">TL;DR</h1>
          <span className="text-sm text-slate-400 hidden sm:block">
            Too Long, Didn&apos;t Learn — AI that fixes your attention span
          </span>
          {hasOutput && (
            <button
              onClick={exportAll}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              Export .md
            </button>
          )}
        </div>
      </header>

      <div className="flex">
        {/* History Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950 h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">History</h2>
                {history.length > 0 && (
                  <button
                    onClick={() => { saveHistory([]); setHistory([]); }}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-slate-600">No transforms yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => loadFromHistory(entry)}
                      className="w-full text-left rounded-lg p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors group"
                    >
                      <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed">
                        {entry.title}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-slate-600">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                        <span
                          onClick={(e) => deleteFromHistory(entry.id, e)}
                          className="text-xs text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          ✕
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 mx-auto max-w-6xl px-4 py-8 w-full">
          <div className={`grid gap-8 ${hasOutput || isLoading ? "lg:grid-cols-2" : "max-w-2xl mx-auto"}`}>
            {/* Left — input */}
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-white mb-1">Paste any article.</h2>
                <p className="text-slate-400 text-sm">
                  The agent reasons about what matters, what connects, and what you need to retain.
                </p>
              </div>

              <ArticleInput onSubmit={handleSubmit} isLoading={isLoading} />

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              {(hasOutput || isLoading) && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500 space-y-1.5">
                  <p className="font-semibold text-slate-400 mb-2">What you&apos;re seeing</p>
                  <p><span className="text-indigo-400 font-mono">Agent Reasoning</span> — how the agent thinks before it writes</p>
                  <p><span className="text-indigo-300">📚 Micro-Lesson</span> — sequenced steps that teach the core idea</p>
                  <p><span className="text-amber-300">🤔 Socratic Questions</span> — answer them to test your comprehension</p>
                  <p><span className="text-emerald-300">⚡ 60-Second Brief</span> — the essential insight, read-aloud ready</p>
                  <p><span className="text-slate-300">💬 Chat</span> — ask anything about the article after the transform</p>
                </div>
              )}
            </div>

            {/* Right — output */}
            {(hasOutput || isLoading) && (
              <div className="flex flex-col gap-4">
                <ReasoningFeed content={output.reasoning} active={activeSection === "reasoning"} />
                <MicroLesson content={output.micro_lesson} active={activeSection === "micro_lesson"} />
                <SocraticQuestions
                  content={output.socratic_questions}
                  active={activeSection === "socratic_questions"}
                  article={article}
                />
                <SixtySecondBrief content={output.sixty_second_brief} active={activeSection === "sixty_second_brief"} />
                {hasOutput && !isLoading && <ChatPanel article={article} />}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
