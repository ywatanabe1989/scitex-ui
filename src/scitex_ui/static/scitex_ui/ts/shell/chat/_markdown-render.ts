/**
 * Markdown Renderer for AI Chat Messages.
 *
 * Uses marked.js (CDN-loaded) + DOMPurify for safe HTML rendering.
 * Ported from scitex-cloud's markdown-render.ts.
 *
 * Dependencies (loaded via CDN or bundled by consumer):
 *  - marked.js (window.marked)
 *  - DOMPurify (window.DOMPurify)
 *  - highlight.js (window.hljs) — optional, for code highlighting
 */

declare const marked: {
  parse: (src: string) => string;
  use: (opts: Record<string, unknown>) => void;
};
declare const DOMPurify: { sanitize: (html: string, cfg?: object) => string };

let _markedConfigured = false;

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "img",
    "hr",
    "span",
    "del",
    "sup",
    "sub",
  ],
  ALLOWED_ATTR: [
    "href",
    "target",
    "rel",
    "src",
    "alt",
    "title",
    "class",
    "colspan",
    "rowspan",
  ],
};

function isAvailable(): boolean {
  return (
    typeof marked !== "undefined" &&
    typeof marked.parse === "function" &&
    typeof DOMPurify !== "undefined" &&
    typeof DOMPurify.sanitize === "function"
  );
}

function linkifyUrls(html: string): string {
  const URL_RE = /(?<![=">])\b(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+)/gi;

  return html.replace(
    /(<[^>]+>)|([^<]+)/g,
    (_match: string, tag: string, text: string) => {
      if (tag) return tag;
      return text.replace(URL_RE, (url: string) => {
        const href = url.startsWith("www.") ? `https://${url}` : url;
        return `<a href="${href}">${url}</a>`;
      });
    },
  );
}

/** Render markdown text to sanitized HTML string. */
export function renderMarkdown(text: string): string {
  if (!text.trim()) return "";
  if (!isAvailable()) return escapeHtml(text);

  try {
    if (!_markedConfigured) {
      marked.use({ gfm: true, breaks: true });
      _markedConfigured = true;
    }
    const raw = marked.parse(text);
    const linked = linkifyUrls(raw);
    return DOMPurify.sanitize(linked, PURIFY_CONFIG);
  } catch {
    return escapeHtml(text);
  }
}

/** Highlight code blocks after inserting markdown HTML into DOM. */
export function highlightCodeBlocks(container: HTMLElement): void {
  const hljs = (window as any).hljs;
  container.querySelectorAll<HTMLElement>("pre code").forEach((block) => {
    if (hljs) hljs.highlightElement(block);
  });
}

/** Make external links open in new tab. */
export function fixExternalLinks(container: HTMLElement): void {
  container.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    if (a.hostname !== window.location.hostname) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  });
}

function escapeHtml(text: string): string {
  const el = document.createElement("span");
  el.textContent = text;
  return el.innerHTML;
}
