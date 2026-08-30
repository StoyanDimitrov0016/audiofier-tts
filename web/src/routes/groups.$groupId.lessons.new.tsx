import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import LessonEditor from "../features/lessons/web/components/lesson-editor";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { Alert, AlertDescription } from "../components/ui/alert";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { collectionDetailsQueryOptions } from "../features/collections/web/queries/collections.queries";
import { createLessonMutationOptions } from "../features/lessons/web/queries/lessons.queries";
import { DEFAULT_LESSON_MARKDOWN } from "../features/lessons/lessons.constants";
import type { LessonEditorValues } from "../features/lessons/lessons.schemas";

export const Route = createFileRoute("/groups/$groupId/lessons/new")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: NewLessonPage,
});

function NewLessonPage() {
  const { groupId } = Route.useParams();
  const { data: details } = useSuspenseQuery(collectionDetailsQueryOptions(groupId));
  if (!details) {
    throw notFound({ data: { message: "That collection does not exist." } });
  }
  const { collection, lessons } = details;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createLesson = useMutation(createLessonMutationOptions(queryClient));

  async function submitLesson(values: LessonEditorValues) {
    try {
      const created = await createLesson.mutateAsync({ collectionId: collection.id, values });
      await navigate({
        to: "/groups/$groupId/lessons/$chapterId",
        params: {
          groupId: collection.id,
          chapterId: created.lesson.id,
        },
      });
    } catch {
      // The mutation exposes its error below while preserving the draft.
    }
  }

  return (
    <section className="grid gap-5 pt-2">
      <Link
        className={buttonVariants({ variant: "link", className: "w-fit px-0" })}
        to="/groups/$groupId"
        params={{ groupId: collection.id }}
      >
        Back to collection
      </Link>
      <header>
        <p className="text-sm font-bold uppercase text-primary">New lesson</p>
        <h1 className="mt-1 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
          {collection.title}
        </h1>
      </header>

      <Card className="rounded-lg">
        <CardContent>
          <LessonEditor
            initialValues={{
              title: "",
              order: lessons.length + 1,
              markdown: DEFAULT_LESSON_MARKDOWN,
            }}
            submitLabel="Create lesson"
            pendingLabel="Creating..."
            isSubmitting={createLesson.isPending}
            maxOrder={lessons.length + 1}
            onSubmit={submitLesson}
          />
        </CardContent>
      </Card>

      {createLesson.error ? (
        <Alert variant="destructive">
          <AlertDescription>{createLesson.error.message}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
