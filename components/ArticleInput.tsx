"use client";

import { useState, useEffect } from "react";

interface ArticleInputProps {
  onSubmit: (article: string) => void;
  isLoading: boolean;
  value?: string;
}

export default function ArticleInput({ onSubmit, isLoading, value }: ArticleInputProps) {
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (value !== undefined) setText(value);
  }, [value]);

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setUrlLoading(true);
    setUrlError(null);
    setTruncated(false);
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setUrlError(json.error ?? "Failed to fetch URL");
      } else {
        setText(json.text);
        setTruncated(json.truncated ?? false);
      }
    } catch {
      setUrlError("Network error — check your connection");
    } finally {
      setUrlLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = text.trim();
    if (val.length >= 50) onSubmit(val);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* URL ingestion */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Fetch from URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleFetchUrl())}
            placeholder="https://example.com/article"
            disabled={isLoading || urlLoading}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleFetchUrl}
            disabled={isLoading || urlLoading || !url.trim()}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {urlLoading ? "Fetching…" : "Fetch"}
          </button>
        </div>
        {urlError && (
          <p className="text-xs text-red-400">{urlError}</p>
        )}
        {truncated && (
          <p className="text-xs text-amber-400">Article truncated to 12,000 characters to fit context window.</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600">
        <div className="flex-1 h-px bg-slate-800" />
        or paste directly
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Text input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="article" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Article text
        </label>
        <textarea
          id="article"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          disabled={isLoading}
          placeholder="Paste the full text of any article — news story, research paper, blog post…"
          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none text-sm leading-relaxed disabled:opacity-50"
        />
        {text.length > 0 && (
          <p className="text-xs text-slate-500 text-right">{text.length.toLocaleString()} chars</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || text.trim().length < 50}
        className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Transforming…" : "Transform →"}
      </button>
    </form>
  );
}
