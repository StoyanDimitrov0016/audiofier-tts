import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";

import type * as z from "zod";

import {
  createLessonFn,
  deleteLessonFn,
  getAvailableAudioVoicesFn,
  getLessonDetailsFn,
  saveLessonGenerationResultFn,
  startLessonAudioGenerationFn,
  updateLessonFn,
} from "../../api/lessons.functions.api";
import {
  AUDIO_CATALOG_STALE_TIME_MS,
  AUDIO_GENERATION_POLL_INTERVAL_MS,
  LESSON_QUERY_STALE_TIME_MS,
} from "../../lessons.constants";
import type {
  GenerateLessonInputSchema,
  LessonEditorValues,
  SaveLessonGenerationResultInputSchema,
} from "../../lessons.schemas";
import { collectionQueryKeys } from "@/features/collections/web/queries/collections.queries";
import { getAudioGenerationJob } from "@/lib/audio-generator-client";

type GenerateLessonInput = z.infer<typeof GenerateLessonInputSchema>;
type SaveLessonGenerationResultInput = z.infer<typeof SaveLessonGenerationResultInputSchema>;

export const lessonQueryKeys = {
  all: ["lessons"] as const,
  content: () => [...lessonQueryKeys.all, "content"] as const,
  detail: (collectionId: string, lessonId: string) =>
    [...lessonQueryKeys.content(), "detail", collectionId, lessonId] as const,
  audio: () => [...lessonQueryKeys.all, "audio"] as const,
  audioCatalog: () => [...lessonQueryKeys.audio(), "catalog"] as const,
  generationJob: (jobId: string) => [...lessonQueryKeys.audio(), "generation-job", jobId] as const,
};

export const lessonDetailsQueryOptions = (collectionId: string, lessonId: string) =>
  queryOptions({
    queryKey: lessonQueryKeys.detail(collectionId, lessonId),
    queryFn: () => getLessonDetailsFn({ data: { collectionId, lessonId } }),
    staleTime: LESSON_QUERY_STALE_TIME_MS,
  });

export const audioCatalogQueryOptions = () =>
  queryOptions({
    queryKey: lessonQueryKeys.audioCatalog(),
    queryFn: () => getAvailableAudioVoicesFn(),
    retry: false,
    staleTime: AUDIO_CATALOG_STALE_TIME_MS,
  });

export const audioGenerationJobQueryOptions = (jobId: string | null) =>
  queryOptions({
    queryKey: lessonQueryKeys.generationJob(jobId ?? "idle"),
    queryFn: ({ signal }) => getAudioGenerationJob(jobId ?? "", signal),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "failed" || status === "succeeded"
        ? false
        : AUDIO_GENERATION_POLL_INTERVAL_MS;
    },
    retry: false,
  });

async function invalidateLessonData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: lessonQueryKeys.content() }),
  ]);
}

export const createLessonMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: ({ collectionId, values }: { collectionId: string; values: LessonEditorValues }) =>
      createLessonFn({ data: { collectionId, ...values } }),
    onSuccess: async ({ lesson }) => {
      queryClient.setQueryData(lessonQueryKeys.detail(lesson.collectionId, lesson.id), lesson);
      await invalidateLessonData(queryClient);
    },
  });

export const updateLessonMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: ({
      collectionId,
      lessonId,
      values,
    }: {
      collectionId: string;
      lessonId: string;
      values: LessonEditorValues;
    }) => updateLessonFn({ data: { collectionId, lessonId, ...values } }),
    onSuccess: async ({ lesson }) => {
      queryClient.setQueryData(lessonQueryKeys.detail(lesson.collectionId, lesson.id), lesson);
      await invalidateLessonData(queryClient);
    },
  });

export const deleteLessonMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: ({ collectionId, lessonId }: { collectionId: string; lessonId: string }) =>
      deleteLessonFn({ data: { collectionId, lessonId } }),
    onSuccess: async (_, { collectionId, lessonId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: lessonQueryKeys.detail(collectionId, lessonId),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all }),
      ]);
    },
  });

export const startAudioGenerationMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: GenerateLessonInput) => startLessonAudioGenerationFn({ data: input }),
  });

export const saveGeneratedAudioMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (input: SaveLessonGenerationResultInput) =>
      saveLessonGenerationResultFn({ data: input }),
    onSuccess: async () => {
      await invalidateLessonData(queryClient);
    },
  });
