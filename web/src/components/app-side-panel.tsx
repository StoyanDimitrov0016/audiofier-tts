import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import type { LessonLibrary } from "../lib/lesson-types";
import { Badge } from "./ui/badge";
import { buttonVariants } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

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
            <nav className="grid gap-3" aria-label="Audio groups and lessons">
              {library.groups.map((group) => {
                const chapters = library.chaptersByGroup[group.id] ?? [];

                return (
                  <Collapsible className="rounded-lg border bg-muted/30" key={group.id} defaultOpen>
                    <CollapsibleTrigger className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2 text-left">
                      <span className="truncate font-semibold">{group.title}</span>
                      <Badge variant="secondary">{chapters.length}</Badge>
                      <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="grid gap-1 px-2 pb-2">
                      <Separator className="mb-1" />
                      <Link
                        className="rounded-lg px-2 py-2 text-sm font-medium text-foreground no-underline hover:bg-muted"
                        to="/groups/$groupId"
                        params={{ groupId: group.id }}
                        activeProps={{ className: "rounded-lg bg-muted px-2 py-2 text-sm font-medium text-foreground" }}
                        activeOptions={{ exact: true }}
                      >
                        Group overview
                      </Link>

                      {chapters.length === 0 ? (
                        <p className="rounded-lg px-2 py-2 text-sm text-muted-foreground">No lessons yet.</p>
                      ) : (
                        chapters.map((chapter) => (
                          <Link
                            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-foreground no-underline hover:bg-muted"
                            key={chapter.id}
                            to="/groups/$groupId/lessons/$chapterId"
                            params={{ groupId: group.id, chapterId: chapter.id }}
                            activeProps={{
                              className:
                                "flex items-center gap-2 rounded-lg bg-muted px-2 py-2 text-sm font-medium text-foreground",
                            }}
                          >
                            <Badge variant="outline">{chapter.order}</Badge>
                            <span className="min-w-0 truncate">{chapter.title}</span>
                          </Link>
                        ))
                      )}

                      <Link
                        className="rounded-lg px-2 py-2 text-sm font-semibold text-primary no-underline hover:bg-muted"
                        to="/groups/$groupId/lessons/new"
                        params={{ groupId: group.id }}
                      >
                        Add lesson
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </nav>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
