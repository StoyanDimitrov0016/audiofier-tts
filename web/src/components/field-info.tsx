import { useFieldContext } from "./form-context";

export default function FieldInfo() {
  const field = useFieldContext<unknown>();
  const messages = field.state.meta.errors
    .map((error) => {
      if (typeof error === "string") {
        return error;
      }

      if (error && typeof error === "object" && "message" in error) {
        // TanStack Form's heterogeneous error array currently exposes this entry as any.
        // oxlint-disable-next-line typescript/no-unsafe-member-access
        return String(error.message);
      }

      return null;
    })
    .filter((message): message is string => Boolean(message));

  if (!field.state.meta.isTouched || messages.length === 0) {
    return null;
  }

  return <p className="text-sm font-medium text-destructive">{messages.join(", ")}</p>;
}
