import { Link, createFileRoute } from "@tanstack/react-router";

import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
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
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--primary)", fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Audio groups
        </p>
        <h1
          className="mt-0 text-3xl md:text-5xl font-bold"
          style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.03em" }}
        >
          Groups
        </h1>
      </header>

      {library.groups.length === 0 ? (
        <Card className="rounded-xl" style={{ background: "var(--card)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <CardContent className="py-8 text-center">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Create a group to start storing lessons.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {library.groups.map((group) => {
            const chapterCount = library.chaptersByGroup[group.id]?.length ?? 0;
            const generatedCount = library.chaptersByGroup[group.id]?.filter((c) => c.generatedAudio).length ?? 0;

            return (
              <Link className="no-underline" key={group.id} to="/groups/$groupId" params={{ groupId: group.id }}>
                <Card
                  className="h-full rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    background: "var(--card)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    cursor: "pointer",
                  }}
                >
                  <CardHeader>
                    <CardTitle
                      className="text-base"
                      style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.02em" }}
                    >
                      {group.title}
                    </CardTitle>
                    <CardDescription className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {chapterCount} lesson{chapterCount !== 1 ? "s" : ""}
                      {chapterCount > 0 && (
                        <span style={{ color: generatedCount === chapterCount ? "var(--primary)" : "inherit" }}>
                          {" "}
                          · {generatedCount}/{chapterCount} generated
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  {group.description && (
                    <CardContent>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                        {group.description}
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
