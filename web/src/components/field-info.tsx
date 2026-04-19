import { useFieldContext } from "./form-context";

export default function FieldInfo() {
  const field = useFieldContext<unknown>();
  const messages = field.state.meta.errors
    .map((error) => {
      if (typeof error === "string") {
        return error;
      }

      if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
      }

      return null;
    })
    .filter((message): message is string => Boolean(message));

  if (!field.state.meta.isTouched || messages.length === 0) {
    return null;
  }

  return <p className="field-error">{messages.join(", ")}</p>;
}
