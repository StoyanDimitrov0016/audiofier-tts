import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { buttonVariants } from "../components/ui/button";
import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { collectionDetailsQueryOptions } from "../features/collections/web/queries/collections.queries";

export const Route = createFileRoute("/groups/$groupId/")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: GroupIndexPage,
});

function GroupIndexPage() {
  const { groupId } = Route.useParams();
  const { data: details } = useSuspenseQuery(collectionDetailsQueryOptions(groupId));
  if (!details) {
    throw notFound({ data: { message: "That collection does not exist." } });
  }
  const { collection, lessons } = details;

  return (
    <section className="grid gap-6 pt-2">
      <Link className={buttonVariants({ variant: "link", className: "w-fit px-0" })} to="/">
        ← Back to catalog
      </Link>

      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Collection overview
          </p>
          <h1 className="mt-0 max-w-3xl font-heading text-3xl font-bold tracking-[-0.03em] md:text-5xl">
            {collection.title}
          </h1>
          {collection.description && (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {collection.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Link
            className={buttonVariants({ variant: "outline" })}
            to="/groups/$groupId/edit"
            params={{ groupId: collection.id }}
          >
            Edit collection
          </Link>
          <Link
            className={buttonVariants()}
            to="/groups/$groupId/lessons/new"
            params={{ groupId: collection.id }}
          >
            New lesson
          </Link>
        </div>
      </header>

      {lessons.length === 0 ? (
        <Card className="rounded-xl border-border bg-card">
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Add the first lesson to begin building this collection.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-2">
          {lessons.map((lesson) => (
            <Link
              className="no-underline"
              key={lesson.id}
              to="/groups/$groupId/lessons/$chapterId"
              params={{ groupId: collection.id, chapterId: lesson.id }}
            >
              <Card className="cursor-pointer rounded-xl border-border bg-card transition-all duration-150 hover:translate-x-0.5">
                <CardHeader className="flex-row items-center gap-4 py-4">
                  {/* Order number */}
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary">
                    {lesson.order}
                  </span>

                  <CardTitle className="flex-1 text-sm font-semibold tracking-[-0.01em]">
                    {lesson.title}
                  </CardTitle>

                  {/* Status indicator */}
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[0.68rem] tracking-[0.04em] ${
                      lesson.generatedAudio
                        ? "border-primary/20 bg-primary/12 text-primary"
                        : "border-border bg-white/4 text-muted-foreground"
                    }`}
                  >
                    {lesson.generatedAudio
                      ? `✓ ${lesson.generatedAudio.formattedDuration}`
                      : "not generated"}
                  </span>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
