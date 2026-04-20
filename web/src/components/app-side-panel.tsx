import { Link } from "@tanstack/react-router";

import type { LessonLibrary } from "../lib/lesson-types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { buttonVariants } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface Props {
  library: LessonLibrary;
}

export default function AppSidePanel({ library }: Props) {
  return (
    <aside
      className="sticky top-4 max-h-[calc(100vh-2rem)] rounded-xl max-lg:static max-lg:max-h-none overflow-hidden"
      role="complementary"
      aria-label="Lesson library"
      style={{
        background: "var(--sidebar)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Sidebar header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
        >
          Library
        </span>
        <Link className={buttonVariants({ size: "sm" })} to="/groups/new">
          New group
        </Link>
      </div>

      <ScrollArea className="h-full max-h-[calc(100vh-9rem)] max-lg:max-h-none">
        <div className="p-3">
          {library.groups.length === 0 ? (
            <p
              className="rounded-lg p-3 text-xs text-center"
              style={{ color: "var(--muted-foreground)", background: "rgba(255,255,255,0.03)" }}
            >
              No groups yet.
            </p>
          ) : (
            <nav aria-label="Audio groups and lessons">
              <Accordion className="gap-1" multiple defaultValue={library.groups.map((g) => g.id)}>
                {library.groups.map((group) => {
                  const chapters = library.chaptersByGroup[group.id] ?? [];
                  return (
                    <AccordionItem className="border-0" key={group.id} value={group.id}>
                      <AccordionTrigger
                        className="py-2 px-2 rounded-lg text-sm font-semibold hover:no-underline hover:bg-accent/60 transition-colors"
                        style={{ color: "var(--foreground)" }}
                      >
                        <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 pr-2">
                          <span className="truncate">{group.title}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-md"
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: "0.65rem",
                              background: "rgba(232,150,58,0.1)",
                              color: "var(--primary)",
                            }}
                          >
                            {chapters.length}
                          </span>
                        </span>
                      </AccordionTrigger>

                      <AccordionContent
                        className="ml-2 border-l pl-3 grid gap-0.5 py-1"
                        style={{ borderColor: "rgba(232,150,58,0.15)" }}
                      >
                        <Link
                          className="block px-2 py-1.5 text-xs font-medium rounded-md transition-colors no-underline"
                          style={{ color: "var(--muted-foreground)" }}
                          to="/groups/$groupId"
                          params={{ groupId: group.id }}
                          activeProps={{ style: { color: "var(--foreground)", background: "rgba(255,255,255,0.05)" } }}
                          activeOptions={{ exact: true }}
                        >
                          {group.title}
                        </Link>

                        {chapters.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
                            No lessons yet.
                          </p>
                        ) : (
                          chapters.map((chapter) => (
                            <Link
                              className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors no-underline"
                              style={{ color: "var(--muted-foreground)" }}
                              key={chapter.id}
                              to="/groups/$groupId/lessons/$chapterId"
                              params={{ groupId: group.id, chapterId: chapter.id }}
                              activeProps={{
                                style: {
                                  color: "var(--foreground)",
                                  background: "rgba(255,255,255,0.05)",
                                  fontWeight: 600,
                                },
                              }}
                            >
                              <span
                                className="shrink-0 text-xs w-5 text-center"
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  color: "var(--primary)",
                                  opacity: 0.7,
                                  fontSize: "0.65rem",
                                }}
                              >
                                {chapter.order}
                              </span>
                              <span className="min-w-0 truncate">{chapter.title}</span>
                              {chapter.generatedAudio && (
                                <span
                                  className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full"
                                  style={{ background: "var(--primary)" }}
                                  title="Audio generated"
                                />
                              )}
                            </Link>
                          ))
                        )}

                        <Link
                          className="block px-2 py-1.5 text-xs font-semibold rounded-md transition-colors no-underline mt-0.5"
                          style={{ color: "var(--primary)" }}
                          to="/groups/$groupId/lessons/new"
                          params={{ groupId: group.id }}
                        >
                          + Add lesson
                        </Link>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </nav>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
