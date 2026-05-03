import { createFormHook } from "@tanstack/react-form";

import NumberField from "./number-field";
import { fieldContext, formContext } from "./form-context";
import TextareaField from "./textarea-field";
import TextField from "./text-field";

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    NumberField,
    TextareaField,
    TextField,
  },
  // Required by createFormHook even when the app only customizes fields.
  formComponents: {},
});
