import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";

import LessonEditor, { type LessonEditorValues } from "../components/lesson-editor";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { deleteChapter, getAudioGroupDetails, getChapterDetails, updateChapter } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/lessons/$chapterId/edit")({
  loader: async ({ params }) => {
    const [groupDetails, chapter] = await Promise.all([
      getAudioGroupDetails({
        data: {
          groupId: params.groupId,
        },
      }),
      getChapterDetails({
        data: {
          groupId: params.groupId,
          chapterId: params.chapterId,
        },
      }),
    ]);

    if (!groupDetails || !chapter) {
      throw notFound({
        data: {
          message: "That lesson does not exist.",
        },
      });
    }

    return {
      group: groupDetails.group,
      chapter,
    };
  },
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: EditLessonPage,
});

function EditLessonPage() {
  const { group, chapter } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLesson(values: LessonEditorValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await updateChapter({
        data: {
          groupId: group.id,
          chapterId: chapter.id,
          title: values.title,
          order: values.order,
          markdown: values.markdown,
        },
      });
      await router.invalidate({ sync: true });
      await navigate({
        to: "/groups/$groupId/lessons/$chapterId",
        params: {
          groupId: group.id,
          chapterId: updated.chapter.id,
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save lesson.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeLesson() {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteChapter({
        data: {
          groupId: group.id,
          chapterId: chapter.id,
        },
      });
      await router.invalidate({ sync: true });
      await navigate({
        to: "/groups/$groupId",
        params: { groupId: group.id },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete lesson.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="grid gap-5 pt-2">
      <Link
        className={buttonVariants({ variant: "link", className: "w-fit px-0" })}
        to="/groups/$groupId/lessons/$chapterId"
        params={{ groupId: group.id, chapterId: chapter.id }}
      >
        Back to lesson
      </Link>
      <header>
        <p className="text-sm font-bold uppercase text-primary">Edit lesson</p>
        <h1 className="mt-1 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{chapter.title}</h1>
      </header>

      <Card className="rounded-lg">
        <CardContent>
          <LessonEditor
            initialValues={{
              title: chapter.title,
              order: chapter.order,
              markdown: chapter.markdown,
            }}
            submitLabel="Save lesson"
            pendingLabel="Saving..."
            isSubmitting={isSubmitting}
            onSubmit={submitLesson}
          />
        </CardContent>
      </Card>

      <Button className="w-fit" variant="destructive" type="button" onClick={removeLesson} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : "Delete lesson"}
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
