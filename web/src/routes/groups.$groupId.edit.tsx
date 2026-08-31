import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import CollectionForm from "../features/collections/web/components/collection-form";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { CollectionFormValues } from "../features/collections/collections.schemas";
import {
  collectionDetailsQueryOptions,
  deleteCollectionMutationOptions,
  updateCollectionMutationOptions,
} from "../features/collections/web/queries/collections.queries";

export const Route = createFileRoute("/groups/$groupId/edit")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: EditGroupPage,
});

function EditGroupPage() {
  const { groupId } = Route.useParams();
  const { data: details } = useSuspenseQuery(collectionDetailsQueryOptions(groupId));
  if (!details) {
    throw notFound({ data: { message: "That collection does not exist." } });
  }
  const { collection, lessons } = details;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateCollection = useMutation(updateCollectionMutationOptions(queryClient));
  const deleteCollection = useMutation(deleteCollectionMutationOptions(queryClient));
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  async function submitGroup(values: CollectionFormValues) {
    try {
      const updated = await updateCollection.mutateAsync({ collectionId: collection.id, values });
      await navigate({
        to: "/groups/$groupId",
        params: { groupId: updated.collection.id },
      });
    } catch {
      // The mutation exposes its error below.
    }
  }

  async function removeGroup() {
    try {
      await deleteCollection.mutateAsync(collection.id);
      await navigate({ to: "/" });
    } catch {
      setIsDeleteDialogOpen(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-5 pt-2">
      <Link
        className={buttonVariants({ variant: "link", className: "w-fit px-0" })}
        to="/groups/$groupId"
        params={{ groupId: collection.id }}
      >
        Back to collection
      </Link>
      <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-primary">Edit collection</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight md:text-6xl">
            {collection.title}
          </h1>
        </div>
        <Button
          className="w-fit"
          variant="destructive"
          type="button"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={deleteCollection.isPending}
        >
          Delete collection
        </Button>
      </header>

      <Card className="rounded-lg">
        <CardContent>
          <CollectionForm
            initialValues={{ title: collection.title, description: collection.description }}
            submitLabel="Save collection"
            pendingLabel="Saving..."
            isSubmitting={updateCollection.isPending}
            onSubmit={submitGroup}
          />
        </CardContent>
      </Card>

      {updateCollection.error || deleteCollection.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {(updateCollection.error ?? deleteCollection.error)?.message}
          </AlertDescription>
        </Alert>
      ) : null}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              “{collection.title}” and its {lessons.length}{" "}
              {lessons.length === 1 ? "lesson" : "lessons"}
              will be permanently deleted. Generated files on disk are not removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCollection.isPending}>
              Keep collection
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteCollection.isPending}
              onClick={() => void removeGroup()}
            >
              {deleteCollection.isPending ? "Deleting..." : "Delete collection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
