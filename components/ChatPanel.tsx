"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/lib/claude";

interface ChatPanelProps {
  article: string;
}

export default function ChatPanel({ article }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const newHistory: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article, history: messages, message: text }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const { type, chunk } = JSON.parse(line.slice(6));
            if (type === "done") break;
            if (type === "reasoning") {
              accumulated += chunk;
              setStreamingText(accumulated);
            }
          } catch { /* ignore malformed */ }
        }
      }

      setMessages([...newHistory, { role: "assistant", content: accumulated }]);
      setStreamingText("");
    } catch {
      setMessages([...newHistory, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 flex flex-col" style={{ maxHeight: "480px" }}>
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <span className="text-base">💬</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Ask About This Article</h2>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: "320px" }}>
        {messages.length === 0 && !streaming && (
          <p className="text-xs text-slate-600 text-center py-6">
            Ask anything about the article — clarifications, deeper dives, related ideas…
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-xl px-3 py-2 text-sm max-w-[85%] leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {streaming && streamingText && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 text-sm max-w-[85%] leading-relaxed bg-slate-800 text-slate-200">
              {streamingText}
              <span className="animate-pulse text-slate-500">▋</span>
            </div>
          </div>
        )}
        {streaming && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 bg-slate-800">
              <span className="animate-pulse text-slate-500 text-sm">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={streaming}
          placeholder="Ask a question… (Enter to send)"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
