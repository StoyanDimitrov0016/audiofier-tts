import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <section className="mx-auto w-full max-w-3xl pt-2">
      <Card className="rounded-lg">
        <CardHeader>
          <CardDescription>Audiofier</CardDescription>
          <CardTitle className="text-4xl md:text-6xl">Lesson Library</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Create audio groups, split long material into lessons, edit markdown, and generate audio one lesson at a time.
        </CardContent>
      </Card>
    </section>
  );
}
