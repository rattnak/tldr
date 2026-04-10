"use client";

interface ArticleInputProps {
  onSubmit: (article: string) => void;
  isLoading: boolean;
}

export default function ArticleInput({ onSubmit, isLoading }: ArticleInputProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const textarea = form.elements.namedItem("article") as HTMLTextAreaElement;
    const value = textarea.value.trim();
    if (value.length >= 50) onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="article" className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Paste any article, report, or reading
      </label>
      <textarea
        id="article"
        name="article"
        rows={10}
        disabled={isLoading}
        placeholder="Paste the full text of any article here — news story, academic abstract, report, blog post..."
        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none text-sm leading-relaxed disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Transforming…" : "Transform →"}
      </button>
    </form>
  );
}
