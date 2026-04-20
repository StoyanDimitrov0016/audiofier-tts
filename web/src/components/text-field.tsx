import FieldInfo from "./field-info";
import { useFieldContext } from "./form-context";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Props {
  label: string;
  placeholder?: string;
}

export default function TextField(props: Props) {
  const field = useFieldContext<string>();

  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Input
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={props.placeholder}
      />
      <FieldInfo />
    </div>
  );
}
