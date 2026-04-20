import { z } from "zod";

import { useAppForm } from "./app-form";
import MarkdownPreview from "./markdown-preview";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
        <form.AppField name="title" children={(field) => <field.TextField label="Lesson title" />} />
        <form.AppField name="order" children={(field) => <field.NumberField label="Order" min={1} step={1} />} />
      </div>

      <form.AppField
        name="markdown"
        children={(field) => (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <field.TextareaField label="Markdown" className="min-h-[520px] resize-y leading-relaxed" />
            <Card className="rounded-lg" aria-label="Markdown preview">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownPreview markdown={field.state.value} />
              </CardContent>
            </Card>
          </div>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={(state: readonly [boolean, boolean]) => {
          const [canSubmit] = state;

          return (
            <Button className="w-fit" type="submit" disabled={!canSubmit || props.isSubmitting}>
              {props.isSubmitting ? props.pendingLabel : props.submitLabel}
            </Button>
          );
        }}
      />
    </form>
  );
}
