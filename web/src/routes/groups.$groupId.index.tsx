import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { Badge } from "../components/ui/badge";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { getAudioGroupDetails } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/")({
  loader: async ({ params }) => {
    const details = await getAudioGroupDetails({
      data: {
        groupId: params.groupId,
      },
    });

    if (!details) {
      throw notFound({
        data: {
          message: "That audio group does not exist.",
        },
      });
    }

    return details;
  },
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: GroupIndexPage,
});

function GroupIndexPage() {
  const { group, chapters } = Route.useLoaderData();

  return (
    <section className="grid gap-6 pt-2">
      <Link className={buttonVariants({ variant: "link", className: "w-fit px-0" })} to="/groups">
        Back to groups
      </Link>
      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-primary">Audio group</p>
          <h1 className="mt-1 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{group.title}</h1>
          {group.description ? <p className="mt-4 max-w-3xl text-muted-foreground">{group.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Link
            className={buttonVariants({ variant: "outline" })}
            to="/groups/$groupId/edit"
            params={{ groupId: group.id }}
          >
            Edit group
          </Link>
          <Link className={buttonVariants()} to="/groups/$groupId/lessons/new" params={{ groupId: group.id }}>
            New lesson
          </Link>
        </div>
      </header>

      {chapters.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="text-muted-foreground">
            Add lessons to audiofy this group in smaller files.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {chapters.map((chapter) => (
            <Link
              className="no-underline"
              key={chapter.id}
              to="/groups/$groupId/lessons/$chapterId"
              params={{ groupId: group.id, chapterId: chapter.id }}
            >
              <Card className="rounded-lg transition-colors hover:bg-muted/40">
                <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] items-center">
                  <Badge variant="outline">{chapter.order}</Badge>
                  <CardTitle>{chapter.title}</CardTitle>
                  <CardDescription>{chapter.generatedAudio ? "Generated" : "Not generated"}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
