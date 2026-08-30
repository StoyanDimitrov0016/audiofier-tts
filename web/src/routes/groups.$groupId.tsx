import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import AppSidePanel from "../components/app-side-panel";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { collectionDetailsQueryOptions } from "../features/collections/web/queries/collections.queries";

export const Route = createFileRoute("/groups/$groupId")({
  loader: async ({ context, params }) => {
    const details = await context.queryClient.ensureQueryData(
      collectionDetailsQueryOptions(params.groupId)
    );
    if (!details) {
      throw notFound({ data: { message: "That collection does not exist." } });
    }
    return details;
  },
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: GroupLayout,
});

function GroupLayout() {
  const { groupId } = Route.useParams();
  const { data: details } = useSuspenseQuery(collectionDetailsQueryOptions(groupId));
  if (!details) {
    throw notFound({ data: { message: "That collection does not exist." } });
  }
  const { collection, lessons } = details;

  return (
    <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-7 max-lg:grid-cols-1">
      <AppSidePanel collection={collection} lessons={lessons} />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
