import { useState } from "react";

import { useAppForm } from "./app-form";
import MarkdownPreview from "./markdown-preview";
import { Button } from "./ui/button";
import { getEstimatedAudioDetails } from "../lib/audio-estimate";
import { LessonEditorSchema, type LessonEditorValues } from "../lib/lesson-schemas";

interface Props {
  initialValues: LessonEditorValues;
  submitLabel: string;
  pendingLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: LessonEditorValues) => Promise<void>;
}

export default function LessonEditor(props: Props) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
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
          <div className="grid gap-3">
            <field.TextareaField label="Markdown" className="min-h-[520px] resize-y leading-relaxed" />
          </div>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.values.markdown] as const}
        children={(state: readonly [boolean, string]) => {
          const [canSubmit, markdown] = state;
          const estimatedAudio = getEstimatedAudioDetails(markdown);

          return (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Estimated duration: {estimatedAudio.duration}</p>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Button
                    className="w-fit"
                    type="button"
                    variant="outline"
                    onClick={() => setIsPreviewVisible((current) => !current)}
                  >
                    {isPreviewVisible ? "Hide preview" : "Preview"}
                  </Button>
                  <Button className="w-fit" type="submit" disabled={!canSubmit || props.isSubmitting}>
                    {props.isSubmitting ? props.pendingLabel : props.submitLabel}
                  </Button>
                </div>
              </div>

              {isPreviewVisible ? (
                <div className="grid gap-3" aria-label="Markdown preview">
                  <h2 className="text-lg font-semibold">Preview</h2>
                  <div className="max-h-[70vh] overflow-auto rounded-md border p-4">
                    <MarkdownPreview markdown={markdown} />
                  </div>
                </div>
              ) : null}
            </>
          );
        }}
      />
    </form>
  );
}
