import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import RouteError from "../components/route-error";
import RoutePending from "../components/route-pending";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { catalogQueryOptions } from "../features/collections/web/queries/collections.queries";
import { PERCENTAGE_MAX } from "../features/shared/numeric.constants";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions()),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: CatalogPage,
});

function CatalogPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 pt-2">
      <header className="grid gap-5 border-b border-border pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Your audio workspace
          </p>
          <h1 className="max-w-3xl font-heading text-4xl font-bold tracking-tight md:text-6xl">
            Collections
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Organize a book, course, or long-form project into lessons, then generate each lesson at
            your own pace.
          </p>
        </div>
        <Link className={buttonVariants({ size: "lg" })} to="/groups/new">
          New collection
        </Link>
      </header>

      {catalog.collections.length === 0 ? (
        <Card className="border-dashed bg-card/60 py-10 text-center">
          <CardContent className="grid justify-items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-primary/10 font-heading text-xl font-bold text-primary">
              A/
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold">Start your first collection</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A collection holds all lessons for one book, course, or audio project.
              </p>
            </div>
            <Link className={buttonVariants()} to="/groups/new">
              Create collection
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {catalog.collections.map((collection, index) => {
            const lessons = catalog.lessonsByCollection[collection.id] ?? [];
            const generatedCount = lessons.filter((lesson) => lesson.generatedAudio).length;
            const progress =
              lessons.length === 0
                ? 0
                : Math.round((generatedCount / lessons.length) * PERCENTAGE_MAX);

            return (
              <Link
                className="group no-underline"
                key={collection.id}
                to="/groups/$groupId"
                params={{ groupId: collection.id }}
              >
                <Card className="relative h-full min-h-64 overflow-hidden border-border bg-card transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                  <div
                    className="absolute inset-x-0 top-0 h-1 bg-primary"
                    style={{ opacity: 0.45 + (index % 2) * 0.3 }}
                  />
                  <CardHeader className="gap-5 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary">
                        Collection {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[0.65rem] text-muted-foreground">
                        {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <CardTitle className="max-w-xl font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                      {collection.title}
                    </CardTitle>
                    <p className="line-clamp-3 min-h-12 text-sm leading-relaxed text-muted-foreground">
                      {collection.description ||
                        "A collection ready for lessons and generated audio."}
                    </p>
                  </CardHeader>
                  <CardContent className="mt-auto grid gap-3 px-6 pb-6">
                    <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted-foreground">
                      <span>{generatedCount} generated</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="mt-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      Open collection →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
