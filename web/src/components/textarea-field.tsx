import FieldInfo from "./field-info";
import { useFieldContext } from "./form-context";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface Props {
  label: string;
  className?: string;
  placeholder?: string;
}

export default function TextareaField(props: Props) {
  const field = useFieldContext<string>();

  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Textarea
        className={props.className}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={props.placeholder}
      />
      <FieldInfo />
    </div>
  );
}
