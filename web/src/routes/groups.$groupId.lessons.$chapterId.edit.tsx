import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import LessonEditor, { type LessonEditorValues } from "../components/lesson-editor";
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

    return {
      group: groupDetails.group,
      chapter,
    };
  },
  component: EditLessonPage,
});

function EditLessonPage() {
  const { group, chapter } = Route.useLoaderData();
  const navigate = useNavigate();
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
    <main className="app-shell">
      <section className="workspace">
        <Link
          className="text-link"
          to="/groups/$groupId/lessons/$chapterId"
          params={{ groupId: group.id, chapterId: chapter.id }}
        >
          Back to lesson
        </Link>
        <header className="page-header">
          <div>
            <p className="eyebrow">Edit lesson</p>
            <h1>{chapter.title}</h1>
          </div>
        </header>

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

        <button className="danger-action" type="button" onClick={removeLesson} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete lesson"}
        </button>

        {error ? <p className="status-banner error-text">{error}</p> : null}
      </section>
    </main>
  );
}
