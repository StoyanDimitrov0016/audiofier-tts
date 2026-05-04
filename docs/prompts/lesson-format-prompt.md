# Lesson Formatting Prompt

Use this prompt when cleaning lesson Markdown copied from PDFs, Wikipedia, documentation pages, books, or notes before generating audio with Audiofier.

The goal is not to summarize. The goal is to make the source text read naturally through Kokoro or another TTS engine while preserving the author's meaning, terminology, order of ideas, and voice.

```text
You are formatting Markdown lesson files for text-to-speech audio.

The cleaned Markdown will be processed by Audiofier and synthesized with Kokoro. Kokoro works best when it receives clean prose with natural sentence punctuation and paragraph boundaries. Keep the content faithful to the source, but remove visual/document artifacts that sound bad when read aloud.

Core task:
- Clean and structure the Markdown for listening.
- Preserve the author's original meaning, claims, terminology, sequence, and tone.
- Do not summarize.
- Do not shorten the lesson.
- Do not rewrite into your own style.
- Do not add commentary, explanations, metadata, or new facts.

I will provide one or more file or directory paths, usually under `storage/markdowns`.

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

Remove source artifacts:
- PDF page headers, footers, running titles, repeated copyright notices, page numbers, and visual-only fragments.
- Broken words caused by PDF line wrapping, such as `exam- ple` -> `example`.
- Hard line breaks inside normal paragraphs.
- Duplicated fragments created by copy/paste or OCR.
- Odd OCR characters, encoding artifacts, and excessive whitespace.
- Raw URLs when the surrounding text already explains the destination.
- Wikipedia-style citation markers, such as `[1]`, `[23]`, `[citation needed]`, or repeated reference markers like `[x_number]`, when they are only references and not meaningful spoken content.
- PDF/book reference markers that interrupt sentences, such as `(Smith, 2019, p. 42)` or `[12]`, unless the citation itself is important to the lesson.
- Visual navigation text, such as `Edit`, `Jump to navigation`, `Retrieved from`, `See also`, or table-of-contents fragments copied from web pages.
- References like `see figure above`, `shown in the table below`, or `as highlighted in red` when they do not make sense in audio.

Preserve meaningful content:
- Keep definitions, explanations, examples, warnings, arguments, and important terminology.
- Keep meaningful section titles.
- Keep important quotations.
- Keep lists when list structure helps comprehension.
- Keep citations only when the listener needs to hear the cited source as part of the lesson.
- Keep code only when the lesson is explicitly about code; otherwise convert code-heavy material into concise prose only if the surrounding source already explains it.

Format as Markdown:
- Use one `#` heading for the lesson title if a title is obvious.
- Use `##` and `###` headings where the source clearly changes section or topic.
- Keep normal paragraphs as paragraphs, not one line per sentence.
- Preserve meaningful lists as Markdown lists.
- Prefer complete sentences in list items.
- Preserve block quotes only when the source is clearly quoting someone or something.
- Avoid over-formatting. Do not create headings for every short paragraph.
- Avoid tables for audio. Convert simple tables into readable prose or lists when the relationship is obvious.

Audio readability:
- Write as spoken prose first and rendered Markdown second.
- Preserve natural sentence punctuation.
- Preserve paragraph boundaries for natural pauses.
- Keep paragraphs reasonably sized.
- Avoid tiny fragment-only bullets such as `auth`, `db`, `cache`; expand only when the source makes the meaning clear.
- Repair broken punctuation, quotes, apostrophes, dashes, bullets, and list formatting.
- If a sentence is clearly broken by copying, repair it conservatively.
- If something is ambiguous, keep it rather than guessing.

Kokoro/TTS guidance:
- Do not manually insert artificial token markers.
- Do not add SSML unless explicitly asked.
- Do not split every sentence onto its own line.
- Do not remove punctuation that helps pronunciation or pauses.
- Prefer clean paragraphs with clear sentence endings.
- Avoid feeding raw Markdown syntax, table syntax, footnotes, URLs, and citation clutter into the spoken lesson.

Output rules:
- Edit the files directly.
- After editing, return only a short list of changed files.
- Do not include a summary of the lesson content.
- Do not add metadata to the lesson files.
- Do not mention unchanged files unless needed.

Here are the file or directory paths to clean:

---

[PASTE PATHS HERE]

Optional source location context:

If I paste a source location from the Audiofier UI, use it only to identify the exact lesson text to clean. Do not copy the source location into the lesson content.

Source location:

[PASTE SOURCE LOCATION HERE]
```
