import { createFormHookContexts } from "@tanstack/react-form";

// TanStack Form's custom field components must share the same contexts passed to createFormHook.
// Keep this file separate from app-form.ts to avoid a cycle with the field component imports.
export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();
