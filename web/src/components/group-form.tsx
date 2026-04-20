import { z } from "zod";

import { useAppForm } from "./app-form";
import { Button } from "./ui/button";

export interface GroupFormValues {
  title: string;
  description: string;
}

interface Props {
  initialValues: GroupFormValues;
  submitLabel: string;
  pendingLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: GroupFormValues) => Promise<void>;
}

const GroupFormSchema = z.object({
  title: z.string().trim().min(1, "Group title is required."),
  description: z.string(),
});

export default function GroupForm(props: Props) {
  const form = useAppForm({
    defaultValues: props.initialValues,
    validators: {
      onChange: GroupFormSchema,
    },
    onSubmit: async ({ value }) => {
      await props.onSubmit({
        title: value.title,
        description: value.description,
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
      <form.AppField
        name="title"
        children={(field) => <field.TextField label="Group title" placeholder="Book or course title" />}
      />

      <form.AppField
        name="description"
        children={(field) => (
          <field.TextareaField label="Description" className="min-h-24 resize-y" placeholder="Optional" />
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
