import FieldInfo from "./field-info";
import { useFieldContext } from "./form-context";

interface Props {
  label: string;
  className?: string;
  placeholder?: string;
}

export default function TextareaField(props: Props) {
  const field = useFieldContext<string>();

  return (
    <label>
      {props.label}
      <textarea
        className={props.className}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={props.placeholder}
      />
      <FieldInfo />
    </label>
  );
}
