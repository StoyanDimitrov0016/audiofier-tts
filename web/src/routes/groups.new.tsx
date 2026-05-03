import { useState } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";

import GroupForm from "../components/group-form";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { Alert, AlertDescription } from "../components/ui/alert";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { createAudioGroup } from "../server/lessons";
import type { GroupFormValues } from "../lib/lesson-schemas";

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
    <section className="mx-auto grid w-full max-w-3xl gap-5 pt-2">
      <Link className={buttonVariants({ variant: "link", className: "w-fit px-0" })} to="/groups">
        Back to groups
      </Link>
      <header>
        <p className="text-sm font-bold uppercase text-primary">New group</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight md:text-6xl">Create Group</h1>
      </header>

      <Card className="rounded-lg">
        <CardContent>
          <GroupForm
            initialValues={{ title: "", description: "" }}
            submitLabel="Create group"
            pendingLabel="Creating..."
            isSubmitting={isSubmitting}
            onSubmit={submitGroup}
          />
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
