import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/groups/$groupId/lessons/$chapterId")({
  component: LessonLayout,
});

function LessonLayout() {
  return <Outlet />;
}
