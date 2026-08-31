import { useAppForm } from "@/components/app-form";
import { Button } from "@/components/ui/button";
import {
  CollectionFormSchema,
  type CollectionFormValues,
} from "@/features/collections/collections.schemas";

interface Props {
  initialValues: CollectionFormValues;
  submitLabel: string;
  pendingLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: CollectionFormValues) => Promise<void>;
}

export default function CollectionForm(props: Props) {
  const form = useAppForm({
    defaultValues: props.initialValues,
    validators: {
      onChange: CollectionFormSchema,
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
      <form.AppField name="title">
        {(field) => <field.TextField label="Collection title" placeholder="Book or course title" />}
      </form.AppField>

      <form.AppField name="description">
        {(field) => (
          <field.TextareaField
            label="Description"
            className="min-h-24 resize-y"
            placeholder="Optional"
          />
        )}
      </form.AppField>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
        {(state) => {
          const [canSubmit] = state;

          return (
            <div className="flex justify-end">
              <Button className="w-fit" type="submit" disabled={!canSubmit || props.isSubmitting}>
                {props.isSubmitting ? props.pendingLabel : props.submitLabel}
              </Button>
            </div>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
