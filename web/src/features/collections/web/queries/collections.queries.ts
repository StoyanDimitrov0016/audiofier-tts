import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";

import type { CollectionFormValues } from "../../collections.schemas";

import {
  createCollectionFn,
  deleteCollectionFn,
  getCatalogFn,
  getCollectionDetailsFn,
  updateCollectionFn,
} from "../../api/collections.functions.api";
import { COLLECTION_QUERY_STALE_TIME_MS } from "../../collections.constants";

type CollectionDetails = Awaited<ReturnType<typeof getCollectionDetailsFn>>;

export const collectionQueryKeys = {
  all: ["collections"] as const,
  catalog: () => [...collectionQueryKeys.all, "catalog"] as const,
  detail: (collectionId: string) => [...collectionQueryKeys.all, "detail", collectionId] as const,
};

export const catalogQueryOptions = () =>
  queryOptions({
    queryKey: collectionQueryKeys.catalog(),
    queryFn: () => getCatalogFn(),
    staleTime: COLLECTION_QUERY_STALE_TIME_MS,
  });

export const collectionDetailsQueryOptions = (collectionId: string) =>
  queryOptions({
    queryKey: collectionQueryKeys.detail(collectionId),
    queryFn: () => getCollectionDetailsFn({ data: { collectionId } }),
    staleTime: COLLECTION_QUERY_STALE_TIME_MS,
  });

export const createCollectionMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (input: CollectionFormValues) => createCollectionFn({ data: input }),
    onSuccess: async ({ collection }) => {
      queryClient.setQueryData(collectionQueryKeys.detail(collection.id), {
        collection,
        lessons: [],
      });
      await queryClient.invalidateQueries({ queryKey: collectionQueryKeys.catalog() });
    },
  });

export const updateCollectionMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: ({
      collectionId,
      values,
    }: {
      collectionId: string;
      values: CollectionFormValues;
    }) => updateCollectionFn({ data: { collectionId, ...values } }),
    onSuccess: async ({ collection }) => {
      queryClient.setQueryData(
        collectionQueryKeys.detail(collection.id),
        (current: CollectionDetails | undefined) => (current ? { ...current, collection } : current)
      );
      await queryClient.invalidateQueries({ queryKey: collectionQueryKeys.catalog() });
    },
  });

export const deleteCollectionMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (collectionId: string) => deleteCollectionFn({ data: { collectionId } }),
    onSuccess: async (_, collectionId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: collectionQueryKeys.detail(collectionId),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({ queryKey: collectionQueryKeys.catalog() }),
      ]);
    },
  });
