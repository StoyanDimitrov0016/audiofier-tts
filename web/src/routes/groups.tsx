import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { getLessonLibrary } from "../server/lessons";

export const Route = createFileRoute("/groups")({
  loader: async () => getLessonLibrary(),
  component: GroupsPage,
});

function GroupsPage() {
  const library = Route.useLoaderData();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/groups") {
    return <Outlet />;
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="page-header">
          <div>
            <p className="eyebrow">Audio groups</p>
            <h1>Groups</h1>
          </div>
          <Link className="primary-link" to="/groups/new">
            New group
          </Link>
        </header>

        {library.groups.length === 0 ? (
          <p className="empty-note">Create a group to start storing lessons.</p>
        ) : (
          <div className="card-grid">
            {library.groups.map((group) => {
              const chapterCount = library.chaptersByGroup[group.id]?.length ?? 0;

              return (
                <Link className="summary-card" key={group.id} to="/groups/$groupId" params={{ groupId: group.id }}>
                  <strong>{group.title}</strong>
                  <span>{chapterCount} lessons</span>
                  {group.description ? <p>{group.description}</p> : null}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
