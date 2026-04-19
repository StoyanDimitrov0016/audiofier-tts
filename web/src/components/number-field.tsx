import FieldInfo from "./field-info";
import { useFieldContext } from "./form-context";

interface Props {
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberField(props: Props) {
  const field = useFieldContext<number>();

  return (
    <label>
      {props.label}
      <input
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(Number(event.target.value))}
      />
      <FieldInfo />
    </label>
  );
}
