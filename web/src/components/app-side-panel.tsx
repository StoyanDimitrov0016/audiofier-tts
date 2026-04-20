import { Link } from "@tanstack/react-router";

import type { LessonLibrary } from "../lib/lesson-types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { buttonVariants } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";

interface Props {
  library: LessonLibrary;
}

export default function AppSidePanel({ library }: Props) {
  return (
    <Card
      className="sticky top-4 max-h-[calc(100vh-2rem)] rounded-lg max-lg:static max-lg:max-h-none"
      role="complementary"
      aria-label="Lesson library"
    >
      <CardHeader className="grid-cols-[1fr_auto] items-center">
        <CardTitle>Library</CardTitle>
        <Link className={buttonVariants({ size: "sm" })} to="/groups/new">
          New group
        </Link>
      </CardHeader>
      <CardContent>
        {library.groups.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">No groups yet.</p>
        ) : (
          <ScrollArea className="h-full max-h-[calc(100vh-9rem)] pr-3 max-lg:max-h-none">
            <nav aria-label="Audio groups and lessons">
              <Accordion className="gap-1" multiple defaultValue={library.groups.map((group) => group.id)}>
                {library.groups.map((group) => {
                  const chapters = library.chaptersByGroup[group.id] ?? [];

                  return (
                    <AccordionItem className="border-0" key={group.id} value={group.id}>
                      <AccordionTrigger className="py-1.5 font-semibold hover:no-underline">
                        <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 pr-2">
                          <span className="truncate">{group.title}</span>
                          <span className="text-xs font-medium text-muted-foreground">{chapters.length}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="ml-1 grid gap-1 border-l pl-3 [&_a]:!no-underline">
                        <Link
                          className="py-1 text-sm font-medium text-muted-foreground no-underline hover:text-foreground"
                          to="/groups/$groupId"
                          params={{ groupId: group.id }}
                          activeProps={{
                            className: "py-1 text-sm font-semibold text-foreground no-underline",
                          }}
                          activeOptions={{ exact: true }}
                        >
                          {group.title}
                        </Link>

                        {chapters.length === 0 ? (
                          <p className="py-1 text-sm text-muted-foreground">No lessons yet.</p>
                        ) : (
                          chapters.map((chapter) => (
                            <Link
                              className="flex items-center gap-2 py-1 text-sm text-muted-foreground no-underline hover:text-foreground"
                              key={chapter.id}
                              to="/groups/$groupId/lessons/$chapterId"
                              params={{ groupId: group.id, chapterId: chapter.id }}
                              activeProps={{
                                className:
                                  "flex items-center gap-2 py-1 text-sm font-semibold text-foreground no-underline",
                              }}
                            >
                              <span className="w-5 shrink-0 text-xs">{chapter.order}</span>
                              <span className="min-w-0 truncate">{chapter.title}</span>
                            </Link>
                          ))
                        )}

                        <Link
                          className="py-1 text-sm font-semibold text-primary no-underline hover:text-primary/80"
                          to="/groups/$groupId/lessons/new"
                          params={{ groupId: group.id }}
                        >
                          Add lesson
                        </Link>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </nav>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
