import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";

import LessonEditor, { type LessonEditorValues } from "../components/lesson-editor";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { createChapter, getAudioGroupDetails } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/lessons/new")({
  loader: async ({ params }) => {
    const details = await getAudioGroupDetails({
      data: {
        groupId: params.groupId,
      },
    });

    if (!details) {
      throw notFound({
        data: {
          message: "That audio group does not exist.",
        },
      });
    }

    return details;
  },
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: NewLessonPage,
});

function NewLessonPage() {
  const { group, chapters } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLesson(values: LessonEditorValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createChapter({
        data: {
          groupId: group.id,
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
          chapterId: created.chapter.id,
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create lesson.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="workspace">
      <Link className="text-link" to="/groups/$groupId" params={{ groupId: group.id }}>
        Back to group
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">New lesson</p>
          <h1>{group.title}</h1>
        </div>
      </header>

      <LessonEditor
        initialValues={{
          title: "",
          order: chapters.length + 1,
          markdown: "# New Lesson\n\n",
        }}
        submitLabel="Create lesson"
        pendingLabel="Creating..."
        isSubmitting={isSubmitting}
        onSubmit={submitLesson}
      />

      {error ? <p className="status-banner error-text">{error}</p> : null}
    </section>
  );
}
