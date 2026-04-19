import type { ErrorComponentProps } from "@tanstack/react-router";

export default function RouteError(props: ErrorComponentProps) {
  return (
    <section className="workspace narrow-workspace">
      <p className="eyebrow">Error</p>
      <h1>Could Not Load</h1>
      <p className="status-banner error-text">{props.error.message || "Something went wrong."}</p>
      <button className="secondary-action" type="button" onClick={props.reset}>
        Try again
      </button>
    </section>
  );
}
