import { NextRequest } from "next/server";
import { parse } from "node-html-parser";

export const runtime = "nodejs";
export const maxDuration = 30;

// Domains known to block scraping — return helpful error instead of garbled HTML
const BLOCKED_DOMAINS = ["twitter.com", "x.com", "facebook.com", "instagram.com", "linkedin.com"];

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return Response.json({ error: "URL required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (BLOCKED_DOMAINS.some((d) => parsed.hostname.includes(d))) {
    return Response.json(
      { error: `${parsed.hostname} blocks automated access. Paste the article text directly.` },
      { status: 422 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        // Appear as a real browser to avoid bot blocks
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return Response.json({ error: `Failed to fetch: ${res.status} ${res.statusText}` }, { status: 422 });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return Response.json({ error: "URL does not point to an HTML page" }, { status: 422 });
    }

    const html = await res.text();
    const root = parse(html);

    // Remove noise elements
    ["script", "style", "nav", "header", "footer", "aside", "iframe", "noscript", "[class*='ad']", "[class*='cookie']", "[class*='banner']", "[class*='popup']", "[class*='modal']", "[class*='sidebar']"].forEach((sel) => {
      root.querySelectorAll(sel).forEach((el) => el.remove());
    });

    // Try to find the main content in order of specificity
    const contentSelectors = [
      "article",
      "[role='main']",
      "main",
      ".post-content",
      ".article-body",
      ".entry-content",
      ".content",
      "#content",
      "#main",
    ];

    let text = "";
    for (const sel of contentSelectors) {
      const el = root.querySelector(sel);
      if (el) {
        text = el.innerText;
        break;
      }
    }

    // Fallback to body
    if (!text) {
      text = root.querySelector("body")?.innerText ?? root.innerText;
    }

    // Clean up whitespace
    text = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 40) // drop short lines (nav items, labels)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length < 200) {
      return Response.json(
        { error: "Could not extract enough text from this page. Try pasting the article directly." },
        { status: 422 }
      );
    }

    // Cap at ~12k chars to stay within token budget
    const title = root.querySelector("title")?.innerText?.trim() ?? "";
    const truncated = text.slice(0, 12000);

    return Response.json({ text: truncated, title, truncated: text.length > 12000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("timeout") || msg.includes("abort")) {
      return Response.json({ error: "Request timed out. The site may be slow or blocking access." }, { status: 422 });
    }
    return Response.json({ error: `Failed to fetch URL: ${msg}` }, { status: 500 });
  }
}
