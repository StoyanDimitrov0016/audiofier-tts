import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { buttonVariants } from "../components/ui/button";
import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { getAudioGroupDetails } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/")({
  loader: async ({ params }) => {
    const details = await getAudioGroupDetails({ data: { groupId: params.groupId } });
    if (!details) {
      throw notFound({ data: { message: "That audio group does not exist." } });
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
        ← Back to groups
      </Link>

      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--primary)", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Audio group
          </p>
          <h1
            className="mt-0 max-w-3xl text-3xl md:text-5xl font-bold"
            style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.03em" }}
          >
            {group.title}
          </h1>
          {group.description && (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              {group.description}
            </p>
          )}
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
        <Card className="rounded-xl" style={{ background: "var(--card)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Add lessons to audiofy this group in smaller files.
            </p>
          </div>
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
              <Card
                className="rounded-xl transition-all duration-150 hover:translate-x-0.5"
                style={{
                  background: "var(--card)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
              >
                <CardHeader className="flex-row items-center gap-4 py-4">
                  {/* Order number */}
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold shrink-0"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      background: "rgba(232,150,58,0.1)",
                      color: "var(--primary)",
                      border: "1px solid rgba(232,150,58,0.2)",
                    }}
                  >
                    {chapter.order}
                  </span>

                  <CardTitle
                    className="flex-1 text-sm font-semibold"
                    style={{ fontFamily: "inherit", letterSpacing: "-0.01em" }}
                  >
                    {chapter.title}
                  </CardTitle>

                  {/* Status indicator */}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.68rem",
                      letterSpacing: "0.04em",
                      ...(chapter.generatedAudio
                        ? {
                            background: "rgba(232,150,58,0.12)",
                            color: "var(--primary)",
                            border: "1px solid rgba(232,150,58,0.2)",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--muted-foreground)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }),
                    }}
                  >
                    {chapter.generatedAudio ? `✓ ${chapter.generatedAudio.formattedDuration}` : "not generated"}
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
