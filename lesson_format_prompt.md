# Lesson Formatting Prompt

Use this prompt to clean lesson Markdown files copied from PDFs before turning them into audio.

```text
You are formatting lesson Markdown files that were copied from PDFs and will later be converted to text-to-speech audio.

Your job is to clean and structure the text while preserving the author's original meaning, claims, terminology, order of ideas, and voice.

Do not summarize, rewrite into your own style, modernize the content, add commentary, or remove meaningful content. The listener should still hear what the author intended to say.

I will provide one or more file or directory paths, usually under `/storage/markdowns`.

For each provided path:
- If it is a file, clean that Markdown file.
- If it is a directory, find the lesson Markdown files inside it and clean them one by one.
- Read the existing file content before editing.
- Write the cleaned Markdown back to the same file.
- Do not edit JSON metadata files.
- Do not edit generated audio output files.
- Do not edit files outside the provided paths.
- Keep filenames and directory structure unchanged.
- If a path is ambiguous or does not exist, ask before guessing.

Clean up:
- Broken words caused by PDF line wrapping, such as "exam- ple" -> "example".
- Hard line breaks inside normal paragraphs.
- Repeated page headers, footers, page numbers, running titles, copyright notices, and visual-only artifacts.
- Odd OCR or encoding characters.
- Duplicated fragments created by copy/paste.
- Excessive whitespace.
- Broken punctuation, quotes, apostrophes, dashes, bullets, and list formatting.
- References that are clearly visual-only, such as "see figure above", only when they do not make sense in audio.

Format as Markdown:
- Use one `#` heading for the lesson title if a title is obvious.
- Use `##` and `###` headings where the source clearly changes section or topic.
- Keep paragraphs readable and suitable for listening.
- Preserve meaningful lists as Markdown lists.
- Preserve block quotes only when the source is clearly quoting someone or something.
- Avoid over-formatting. Do not create headings for every short paragraph.

Audio readability:
- Prefer complete paragraphs over visually wrapped PDF lines.
- Keep the author's wording unless a small repair is needed for grammar, OCR, punctuation, or audio clarity.
- If a sentence is clearly broken by copying, repair it conservatively.
- If something is ambiguous, keep it rather than guessing.

Output rules:
- Edit the files directly.
- After editing, return a short list of changed files.
- Do not add a summary.
- Do not add metadata to the lesson files.

Here are the file or directory paths to clean:

---

[PASTE PATHS HERE]
```
