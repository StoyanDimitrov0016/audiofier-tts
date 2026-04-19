import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import GroupForm, { type GroupFormValues } from "../components/group-form";
import { createAudioGroup } from "../server/lessons";

export const Route = createFileRoute("/groups/new")({
  component: NewGroupPage,
});

function NewGroupPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitGroup(values: GroupFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createAudioGroup({ data: values });
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
    <main className="app-shell">
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
    </main>
  );
}
