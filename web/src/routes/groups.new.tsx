import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import CollectionForm from "../features/collections/web/components/collection-form";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { Alert, AlertDescription } from "../components/ui/alert";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { CollectionFormValues } from "../features/collections/collections.schemas";
import { createCollectionMutationOptions } from "../features/collections/web/queries/collections.queries";

export const Route = createFileRoute("/groups/new")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: NewGroupPage,
});

function NewGroupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createCollection = useMutation(createCollectionMutationOptions(queryClient));

  async function submitGroup(values: CollectionFormValues) {
    try {
      const created = await createCollection.mutateAsync(values);
      await navigate({
        to: "/groups/$groupId",
        params: { groupId: created.collection.id },
      });
    } catch {
      // The mutation exposes its error below while preserving the submitted values.
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-5 pt-2">
      <Link className={buttonVariants({ variant: "link", className: "w-fit px-0" })} to="/">
        Back to catalog
      </Link>
      <header>
        <p className="text-sm font-bold uppercase text-primary">New collection</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight md:text-6xl">
          Create Collection
        </h1>
      </header>

      <Card className="rounded-lg">
        <CardContent>
          <CollectionForm
            initialValues={{ title: "", description: "" }}
            submitLabel="Create collection"
            pendingLabel="Creating..."
            isSubmitting={createCollection.isPending}
            onSubmit={submitGroup}
          />
        </CardContent>
      </Card>

      {createCollection.error ? (
        <Alert variant="destructive">
          <AlertDescription>{createCollection.error.message}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
