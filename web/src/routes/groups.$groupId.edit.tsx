import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";

import GroupForm, { type GroupFormValues } from "../components/group-form";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { deleteAudioGroup, getAudioGroupDetails, updateAudioGroup } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/edit")({
  loader: async ({ params }) => {
    const details = await getAudioGroupDetails({
      data: {
        groupId: params.groupId,
      },
    });

    if (!details) {
      throw notFound({
        data: {
          message: "That audio group does not exist.",
        },
      });
    }

    return details;
  },
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: EditGroupPage,
});

function EditGroupPage() {
  const { group } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
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
      await router.invalidate({ sync: true });
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
      await router.invalidate({ sync: true });
      await navigate({ to: "/groups" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete group.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-5 pt-2">
      <Link
        className={buttonVariants({ variant: "link", className: "w-fit px-0" })}
        to="/groups/$groupId"
        params={{ groupId: group.id }}
      >
        Back to group
      </Link>
      <header>
        <p className="text-sm font-bold uppercase text-primary">Edit group</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight md:text-6xl">{group.title}</h1>
      </header>

      <Card className="rounded-lg">
        <CardContent>
          <GroupForm
            initialValues={{ title: group.title, description: group.description }}
            submitLabel="Save group"
            pendingLabel="Saving..."
            isSubmitting={isSubmitting}
            onSubmit={submitGroup}
          />
        </CardContent>
      </Card>

      <Button className="w-fit" variant="destructive" type="button" onClick={removeGroup} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : "Delete group"}
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
