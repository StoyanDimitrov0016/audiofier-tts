import { z } from "zod";

import { useAppForm } from "./app-form";
import MarkdownPreview from "./markdown-preview";

export interface LessonEditorValues {
  title: string;
  order: number;
  markdown: string;
}

interface Props {
  initialValues: LessonEditorValues;
  submitLabel: string;
  pendingLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: LessonEditorValues) => Promise<void>;
}

const LessonEditorSchema = z.object({
  title: z.string().trim().min(1, "Lesson title is required."),
  order: z.number().int().min(1, "Order must be at least 1."),
  markdown: z.string(),
});

export default function LessonEditor(props: Props) {
  const form = useAppForm({
    defaultValues: props.initialValues,
    validators: {
      onChange: LessonEditorSchema,
    },
    onSubmit: async ({ value }) => {
      await props.onSubmit({
        title: value.title,
        order: value.order,
        markdown: value.markdown,
      });
    },
  });

  return (
    <form
      className="lesson-editor"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="chapter-fields">
        <form.AppField name="title" children={(field) => <field.TextField label="Lesson title" />} />
        <form.AppField name="order" children={(field) => <field.NumberField label="Order" min={1} step={1} />} />
      </div>

      <form.AppField
        name="markdown"
        children={(field) => (
          <div className="markdown-editor-grid">
            <field.TextareaField label="Markdown" />
            <section aria-label="Markdown preview">
              <p className="panel-label">Preview</p>
              <MarkdownPreview markdown={field.state.value} />
            </section>
          </div>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={(state: readonly [boolean, boolean]) => {
          const [canSubmit] = state;

          return (
            <button className="primary-action" type="submit" disabled={!canSubmit || props.isSubmitting}>
              {props.isSubmitting ? props.pendingLabel : props.submitLabel}
            </button>
          );
        }}
      />
    </form>
  );
}
