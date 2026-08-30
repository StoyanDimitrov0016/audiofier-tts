import { Link } from "@tanstack/react-router";

import type { Collection } from "../features/collections/collections.schemas";
import type { LessonSummary } from "../features/lessons/lessons.schemas";
import { buttonVariants } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface Props {
  collection: Collection;
  lessons: LessonSummary[];
}

export default function AppSidePanel({ collection, lessons }: Props) {
  return (
    <aside
      className="sticky top-4 overflow-hidden rounded-xl border border-sidebar-border bg-sidebar max-lg:static"
      aria-label={`${collection.title} lessons`}
    >
      <div className="border-b border-sidebar-border p-4">
        <Link
          className="mb-4 inline-flex text-xs font-medium text-muted-foreground no-underline transition-colors hover:text-foreground"
          to="/"
        >
          ← Catalog
        </Link>
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary">
          Collection
        </p>
        <Link
          className="mt-1 block truncate font-heading text-lg font-semibold text-foreground no-underline"
          to="/groups/$groupId"
          params={{ groupId: collection.id }}
          activeOptions={{ exact: true }}
        >
          {collection.title}
        </Link>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[0.68rem] text-muted-foreground">
            {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
          </span>
          <Link
            className={buttonVariants({ size: "sm" })}
            to="/groups/$groupId/lessons/new"
            params={{ groupId: collection.id }}
          >
            Add lesson
          </Link>
        </div>
      </div>

      <ScrollArea className="max-h-[calc(100vh-15rem)] max-lg:max-h-80">
        <nav className="grid gap-1 p-3" aria-label="Lessons in this collection">
          {lessons.length === 0 ? (
            <p className="rounded-lg bg-white/3 p-3 text-center text-xs text-muted-foreground">
              No lessons in this collection yet.
            </p>
          ) : (
            lessons.map((lesson) => (
              <Link
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2.5 text-xs text-muted-foreground no-underline transition-colors hover:bg-accent/60 hover:text-foreground"
                key={lesson.id}
                to="/groups/$groupId/lessons/$chapterId"
                params={{ groupId: collection.id, chapterId: lesson.id }}
                activeProps={{
                  className:
                    "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-accent px-2 py-2.5 text-xs font-semibold text-foreground no-underline",
                }}
              >
                <span className="font-mono text-center text-[0.65rem] text-primary">
                  {String(lesson.order).padStart(2, "0")}
                </span>
                <span className="truncate">{lesson.title}</span>
                {lesson.generatedAudio ? (
                  <span className="size-1.5 rounded-full bg-primary" title="Audio generated" />
                ) : null}
              </Link>
            ))
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
