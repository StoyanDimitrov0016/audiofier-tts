import { marked } from "marked";

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
    link(token) {
      const href = sanitizeUrl(token.href);
      const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
      const text = typeof token.text === "string" ? token.text : "";

      if (!href) {
        return text;
      }

      return `<a href="${escapeHtml(href)}" rel="noreferrer"${title}>${text}</a>`;
    },
    image(token) {
      const src = sanitizeUrl(token.href);
      const alt = escapeHtml(token.text || "");
      const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";

      if (!src) {
        return alt;
      }

      return `<img src="${escapeHtml(src)}" alt="${alt}"${title}>`;
    },
  },
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("#")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed, "https://audiofier.local");

    if (["http:", "https:", "mailto:"].includes(url.protocol)) {
      return trimmed;
    }
  } catch {
    return null;
  }

  return null;
}

interface Props {
  markdown: string;
}

export default function MarkdownPreview(props: Props) {
  const html = marked.parse(props.markdown || "_No markdown yet._", {
    async: false,
  }) as string;

  return (
    <article
      className="min-h-72 rounded-lg border bg-card p-4 leading-relaxed text-card-foreground [overflow-wrap:anywhere] [&_:first-child]:mt-0 [&_:last-child]:mb-0 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
