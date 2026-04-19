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

  return <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}
