import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { catalogQueryOptions } from "../features/collections/web/queries/collections.queries";

export const Route = createFileRoute("/groups/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions()),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: GroupsIndexPage,
});

function GroupsIndexPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());

  return (
    <section className="grid gap-6 pt-2">
      <header>
        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
          Audio collections
        </p>
        <h1 className="mt-0 font-heading text-3xl font-bold tracking-[-0.03em] md:text-5xl">
          Collections
        </h1>
      </header>

      {catalog.collections.length === 0 ? (
        <Card className="rounded-xl border-border bg-card">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Create a collection to start storing lessons.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {catalog.collections.map((collection) => {
            const lessonCount = catalog.lessonsByCollection[collection.id]?.length ?? 0;
            const generatedCount =
              catalog.lessonsByCollection[collection.id]?.filter((lesson) => lesson.generatedAudio)
                .length ?? 0;

            return (
              <Link
                className="no-underline"
                key={collection.id}
                to="/groups/$groupId"
                params={{ groupId: collection.id }}
              >
                <Card className="h-full cursor-pointer rounded-xl border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="font-heading text-base tracking-[-0.02em]">
                      {collection.title}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                      {lessonCount > 0 && (
                        <span
                          className={generatedCount === lessonCount ? "text-primary" : undefined}
                        >
                          {" "}
                          · {generatedCount}/{lessonCount} generated
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  {collection.description && (
                    <CardContent>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {collection.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
