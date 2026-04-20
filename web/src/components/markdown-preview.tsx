import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.use({
  gfm: true,
  breaks: false,
});

interface Props {
  markdown: string;
}

export default function MarkdownPreview(props: Props) {
  const dirtyHtml = marked.parse(props.markdown || "_No markdown yet._", {
    async: false,
  }) as string;
  const html = sanitizeHtml(dirtyHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "h3", "h4", "h5", "h6", "img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noreferrer",
      }),
    },
  });

  return (
    <article
      className="min-h-72 rounded-lg border bg-card p-4 leading-relaxed text-card-foreground [overflow-wrap:anywhere] [&_:first-child]:mt-0 [&_:last-child]:mb-0 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
