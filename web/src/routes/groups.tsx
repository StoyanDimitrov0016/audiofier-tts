import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/groups")({
  component: GroupsLayout,
});

function GroupsLayout() {
  return <Outlet />;
}
