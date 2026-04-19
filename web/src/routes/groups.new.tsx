import { useState } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";

import GroupForm, { type GroupFormValues } from "../components/group-form";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { createAudioGroup } from "../server/lessons";

export const Route = createFileRoute("/groups/new")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: NewGroupPage,
});

function NewGroupPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitGroup(values: GroupFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createAudioGroup({ data: values });
      await router.invalidate({ sync: true });
      await navigate({
        to: "/groups/$groupId",
        params: { groupId: created.group.id },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create group.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="workspace narrow-workspace">
      <Link className="text-link" to="/groups">
        Back to groups
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">New group</p>
          <h1>Create Group</h1>
        </div>
      </header>

      <GroupForm
        initialValues={{ title: "", description: "" }}
        submitLabel="Create group"
        pendingLabel="Creating..."
        isSubmitting={isSubmitting}
        onSubmit={submitGroup}
      />

      {error ? <p className="status-banner error-text">{error}</p> : null}
    </section>
  );
}
