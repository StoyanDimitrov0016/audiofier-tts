import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import LessonEditor from "../features/lessons/web/components/lesson-editor";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { LessonEditorValues } from "../features/lessons/lessons.schemas";
import { collectionDetailsQueryOptions } from "../features/collections/web/queries/collections.queries";
import {
  deleteLessonMutationOptions,
  lessonDetailsQueryOptions,
  updateLessonMutationOptions,
} from "../features/lessons/web/queries/lessons.queries";

export const Route = createFileRoute("/groups/$groupId/lessons/$chapterId/edit")({
  loader: async ({ context, params }) => {
    const lesson = await context.queryClient.ensureQueryData(
      lessonDetailsQueryOptions(params.groupId, params.chapterId)
    );
    if (!lesson) {
      throw notFound({
        data: {
          message: "That lesson does not exist.",
        },
      });
    }
  },
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: EditLessonPage,
});

function EditLessonPage() {
  const { groupId, chapterId } = Route.useParams();
  const { data: collectionDetails } = useSuspenseQuery(collectionDetailsQueryOptions(groupId));
  const { data: lesson } = useSuspenseQuery(lessonDetailsQueryOptions(groupId, chapterId));
  if (!collectionDetails || !lesson) {
    throw notFound({ data: { message: "That lesson does not exist." } });
  }
  const currentLesson = lesson;
  const { collection, lessons } = collectionDetails;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateLesson = useMutation(updateLessonMutationOptions(queryClient));
  const deleteLesson = useMutation(deleteLessonMutationOptions(queryClient));
  const [pendingValues, setPendingValues] = useState<LessonEditorValues | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  async function saveLesson(values: LessonEditorValues) {
    try {
      const updated = await updateLesson.mutateAsync({
        collectionId: collection.id,
        lessonId: currentLesson.id,
        values,
      });
      await navigate({
        to: "/groups/$groupId/lessons/$chapterId",
        params: {
          groupId: collection.id,
          chapterId: updated.lesson.id,
        },
      });
    } catch {
      setPendingValues(null);
    }
  }

  async function submitLesson(values: LessonEditorValues) {
    if (values.order === currentLesson.order) {
      await saveLesson(values);
      return;
    }
    setPendingValues(values);
  }

  async function removeLesson() {
    try {
      await deleteLesson.mutateAsync({
        collectionId: collection.id,
        lessonId: currentLesson.id,
      });
      await navigate({
        to: "/groups/$groupId",
        params: { groupId: collection.id },
      });
    } catch {
      setIsDeleteDialogOpen(false);
    }
  }

  const affectedLessonCount = pendingValues ? Math.abs(pendingValues.order - lesson.order) : 0;
  const affectedLessonLabel = affectedLessonCount === 1 ? "lesson" : "lessons";
  const shiftDirection = pendingValues && pendingValues.order < lesson.order ? "later" : "earlier";

  return (
    <section className="grid gap-5 pt-2">
      <Link
        className={buttonVariants({ variant: "link", className: "w-fit px-0" })}
        to="/groups/$groupId/lessons/$chapterId"
        params={{ groupId: collection.id, chapterId: lesson.id }}
      >
        Back to lesson
      </Link>
      <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-primary">Edit lesson</p>
          <h1 className="mt-1 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            {lesson.title}
          </h1>
        </div>
        <Button
          className="w-fit"
          variant="destructive"
          type="button"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={deleteLesson.isPending}
        >
          Delete lesson
        </Button>
      </header>

      <Card className="rounded-lg">
        <CardContent>
          <LessonEditor
            key={lesson.updatedAt}
            initialValues={{
              title: lesson.title,
              order: lesson.order,
              markdown: lesson.markdown,
            }}
            submitLabel="Save lesson"
            pendingLabel="Saving..."
            isSubmitting={updateLesson.isPending}
            maxOrder={lessons.length}
            onSubmit={submitLesson}
          />
        </CardContent>
      </Card>

      {updateLesson.error || deleteLesson.error ? (
        <Alert variant="destructive">
          <AlertDescription>{(updateLesson.error ?? deleteLesson.error)?.message}</AlertDescription>
        </Alert>
      ) : null}

      <AlertDialog
        open={pendingValues !== null}
        onOpenChange={(open) => {
          if (!open && !updateLesson.isPending) {
            setPendingValues(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reorder this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingValues
                ? `Moving “${lesson.title}” from position ${lesson.order} to ${pendingValues.order} will shift ${affectedLessonCount} ${affectedLessonLabel} one position ${shiftDirection}. Continue?`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateLesson.isPending}>
              Keep current order
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={updateLesson.isPending || !pendingValues}
              onClick={() => {
                if (pendingValues) {
                  void saveLesson(pendingValues);
                }
              }}
            >
              {updateLesson.isPending ? "Reordering..." : "Reorder lesson"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              “{lesson.title}” will be permanently deleted. The {lessons.length - lesson.order}{" "}
              {lessons.length - lesson.order === 1 ? "lesson" : "lessons"} after it will move
              forward one position. Generated files on disk are not removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLesson.isPending}>Keep lesson</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteLesson.isPending}
              onClick={() => void removeLesson()}
            >
              {deleteLesson.isPending ? "Deleting..." : "Delete lesson"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
