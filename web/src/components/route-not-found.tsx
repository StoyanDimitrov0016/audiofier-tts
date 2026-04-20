import type { NotFoundRouteProps } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

function getMessage(data: unknown) {
  if (data && typeof data === "object" && "message" in data) {
    return String(data.message);
  }

  return "That page or lesson does not exist.";
}

export default function RouteNotFound(props: NotFoundRouteProps) {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 pt-2">
      <p className="text-sm font-bold uppercase text-primary">Not found</p>
      <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Missing Page</h1>
      <Alert>
        <AlertTitle>Nothing matched this route.</AlertTitle>
        <AlertDescription>{getMessage(props.data)}</AlertDescription>
      </Alert>
    </section>
  );
}
