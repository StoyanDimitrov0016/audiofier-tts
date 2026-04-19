import FieldInfo from "./field-info";
import { useFieldContext } from "./form-context";

interface Props {
  label: string;
  placeholder?: string;
}

export default function TextField(props: Props) {
  const field = useFieldContext<string>();

  return (
    <label>
      {props.label}
      <input
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={props.placeholder}
      />
      <FieldInfo />
    </label>
  );
}
