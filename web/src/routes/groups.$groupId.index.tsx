import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { getAudioGroupDetails } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/")({
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
  component: GroupIndexPage,
});

function GroupIndexPage() {
  const { group, chapters } = Route.useLoaderData();

  return (
    <section className="workspace">
      <Link className="text-link" to="/groups">
        Back to groups
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">Audio group</p>
          <h1>{group.title}</h1>
          {group.description ? <p className="service-note">{group.description}</p> : null}
        </div>
        <div className="header-actions">
          <Link className="secondary-link" to="/groups/$groupId/edit" params={{ groupId: group.id }}>
            Edit group
          </Link>
          <Link className="primary-link" to="/groups/$groupId/lessons/new" params={{ groupId: group.id }}>
            New lesson
          </Link>
        </div>
      </header>

      {chapters.length === 0 ? (
        <p className="empty-note">Add lessons to audiofy this group in smaller files.</p>
      ) : (
        <div className="lesson-list">
          {chapters.map((chapter) => (
            <Link
              className="lesson-row"
              key={chapter.id}
              to="/groups/$groupId/lessons/$chapterId"
              params={{ groupId: group.id, chapterId: chapter.id }}
            >
              <span>{chapter.order}</span>
              <strong>{chapter.title}</strong>
              <em>{chapter.generatedAudio ? "Generated" : "Not generated"}</em>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
