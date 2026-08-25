# Writing Markdown for speech

Write spoken prose first and rendered Markdown second. The audio service removes common Markdown,
preserves paragraph and sentence boundaries, then applies the selected model's chunk policy.

Prefer complete sentences, natural paragraphs, pronounceable headings, and bullets that sound sensible
when read aloud. Rewrite tables, raw URLs, citations, and large code blocks as explanatory prose.

For copied PDF, documentation, or book text, use the
[lesson-format prompt](prompts/lesson-format-prompt.md) before synthesis.

The practical default is English. Kokoro uses `af_heart`; Qwen uses `Ryan`. Qwen 1.7B accepts an optional
voice instruction, while Qwen 0.6B does not.
