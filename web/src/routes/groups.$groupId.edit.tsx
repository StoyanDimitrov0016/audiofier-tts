import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import GroupForm, { type GroupFormValues } from "../components/group-form";
import { deleteAudioGroup, getAudioGroupDetails, updateAudioGroup } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/edit")({
  loader: async ({ params }) =>
    getAudioGroupDetails({
      data: {
        groupId: params.groupId,
      },
    }),
  component: EditGroupPage,
});

function EditGroupPage() {
  const { group } = Route.useLoaderData();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitGroup(values: GroupFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await updateAudioGroup({
        data: {
          groupId: group.id,
          ...values,
        },
      });
      await navigate({
        to: "/groups/$groupId",
        params: { groupId: updated.group.id },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save group.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeGroup() {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteAudioGroup({ data: { groupId: group.id } });
      await navigate({ to: "/groups" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete group.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace narrow-workspace">
        <Link className="text-link" to="/groups/$groupId" params={{ groupId: group.id }}>
          Back to group
        </Link>
        <header className="page-header">
          <div>
            <p className="eyebrow">Edit group</p>
            <h1>{group.title}</h1>
          </div>
        </header>

        <GroupForm
          initialValues={{ title: group.title, description: group.description }}
          submitLabel="Save group"
          pendingLabel="Saving..."
          isSubmitting={isSubmitting}
          onSubmit={submitGroup}
        />

        <button className="danger-action" type="button" onClick={removeGroup} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete group"}
        </button>

        {error ? <p className="status-banner error-text">{error}</p> : null}
      </section>
    </main>
  );
}
