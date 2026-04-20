import type { ErrorComponentProps } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export default function RouteError(props: ErrorComponentProps) {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 pt-2">
      <p className="text-sm font-bold uppercase text-primary">Error</p>
      <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Could Not Load</h1>
      <Alert variant="destructive">
        <AlertTitle>Something went wrong.</AlertTitle>
        <AlertDescription>{props.error.message || "Refresh the page and try again."}</AlertDescription>
      </Alert>
      <Button className="w-fit" variant="outline" type="button" onClick={props.reset}>
        Try again
      </Button>
    </section>
  );
}
