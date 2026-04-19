import { Link, createFileRoute } from "@tanstack/react-router";

import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { getLessonLibrary } from "../server/lessons";

export const Route = createFileRoute("/groups/")({
  loader: async () => getLessonLibrary(),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: GroupsIndexPage,
});

function GroupsIndexPage() {
  const library = Route.useLoaderData();

  return (
    <section className="workspace">
      <header className="page-header">
        <div>
          <p className="eyebrow">Audio groups</p>
          <h1>Groups</h1>
        </div>
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
  );
}
