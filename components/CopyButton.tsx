"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-slate-700"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
