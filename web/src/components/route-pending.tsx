import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export default function RoutePending() {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 pt-2">
      <Card className="rounded-lg">
        <CardHeader>
          <CardDescription>Loading</CardDescription>
          <CardTitle>Preparing Page</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">Loading the latest lesson data.</CardContent>
      </Card>
    </section>
  );
}
