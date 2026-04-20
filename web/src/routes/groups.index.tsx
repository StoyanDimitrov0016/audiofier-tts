import { Link, createFileRoute } from "@tanstack/react-router";

import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { getLessonLibrary } from "../server/lessons";

export const Route = createFileRoute("/groups/")({
  loader: async () => getLessonLibrary(),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: GroupsIndexPage,
});

function GroupsIndexPage() {
  const library = Route.useLoaderData();

  return (
    <section className="grid gap-6 pt-2">
      <header>
        <p className="text-sm font-bold uppercase text-primary">Audio groups</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight md:text-6xl">Groups</h1>
      </header>

      {library.groups.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="text-muted-foreground">Create a group to start storing lessons.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {library.groups.map((group) => {
            const chapterCount = library.chaptersByGroup[group.id]?.length ?? 0;

            return (
              <Link className="no-underline" key={group.id} to="/groups/$groupId" params={{ groupId: group.id }}>
                <Card className="h-full rounded-lg transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle>{group.title}</CardTitle>
                    <CardDescription>{chapterCount} lessons</CardDescription>
                  </CardHeader>
                  {group.description ? (
                    <CardContent className="text-muted-foreground">{group.description}</CardContent>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
