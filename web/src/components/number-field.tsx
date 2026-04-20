import FieldInfo from "./field-info";
import { useFieldContext } from "./form-context";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Props {
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberField(props: Props) {
  const field = useFieldContext<number>();

  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Input
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(Number(event.target.value))}
      />
      <FieldInfo />
    </div>
  );
}
