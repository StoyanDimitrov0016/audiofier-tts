import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { getAudioGroupDetails } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId")({
  loader: async ({ params }) =>
    getAudioGroupDetails({
      data: {
        groupId: params.groupId,
      },
    }),
  component: GroupPage,
});

function GroupPage() {
  const { group, chapters } = Route.useLoaderData();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== `/groups/${group.id}`) {
    return <Outlet />;
  }

  return (
    <main className="app-shell">
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
    </main>
  );
}
