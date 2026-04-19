import type { NotFoundRouteProps } from "@tanstack/react-router";

function getMessage(data: unknown) {
  if (data && typeof data === "object" && "message" in data) {
    return String(data.message);
  }

  return "That page or lesson does not exist.";
}

export default function RouteNotFound(props: NotFoundRouteProps) {
  return (
    <section className="workspace narrow-workspace">
      <p className="eyebrow">Not found</p>
      <h1>Missing Page</h1>
      <p className="service-note">{getMessage(props.data)}</p>
    </section>
  );
}
