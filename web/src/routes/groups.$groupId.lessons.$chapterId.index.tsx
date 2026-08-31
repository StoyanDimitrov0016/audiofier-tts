import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import MarkdownPreview from "../features/lessons/web/components/markdown-preview";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import type { AudioVoice } from "../lib/audio-types";
import { collectionDetailsQueryOptions } from "../features/collections/web/queries/collections.queries";
import {
  audioCatalogQueryOptions,
  audioGenerationJobQueryOptions,
  lessonDetailsQueryOptions,
  saveGeneratedAudioMutationOptions,
  startAudioGenerationMutationOptions,
} from "../features/lessons/web/queries/lessons.queries";
import {
  AUDIO_GENERATION_INITIAL_PROGRESS_PERCENT,
  AUDIO_GENERATION_TIMEOUT_MS,
  AUDIO_SPEED_MAX,
  AUDIO_SPEED_MIN,
  AUDIO_SPEED_STEP,
  DEFAULT_AUDIO_MODEL_ID,
  DEFAULT_AUDIO_SPEED,
} from "../features/lessons/lessons.constants";
import { PERCENTAGE_MAX } from "../features/shared/numeric.constants";

const QWEN_STYLE_OPTIONS = [
  {
    id: "neutral",
    label: "Neutral narration",
    instruct:
      "Read in one consistent narrator voice. Use a calm, neutral audiobook narration style. Do not act out characters or change voices for reported speech. Keep emotion restrained, avoid dramatic emphasis, and keep intonation steady between paragraphs.",
  },
  {
    id: "plain",
    label: "Plain lecture",
    instruct:
      "Read in one consistent narrator voice, clearly and evenly like a lecture recording. Do not perform characters. Use minimal emotion, keep steady pacing, and avoid expressive rises at the beginning of each section.",
  },
  {
    id: "warm",
    label: "Warm audiobook",
    instruct:
      "Read in one consistent narrator voice with a warm audiobook tone. Do not act out characters or shift into dialogue performance. Keep the delivery intimate, restrained, and natural without becoming theatrical or overly emotional.",
  },
] as const;

export const Route = createFileRoute("/groups/$groupId/lessons/$chapterId/")({
  loader: async ({ context, params }) => {
    const lesson = await context.queryClient.ensureQueryData(
      lessonDetailsQueryOptions(params.groupId, params.chapterId)
    );
    if (!lesson) {
      throw notFound({ data: { message: "That lesson does not exist." } });
    }
  },
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: LessonIndexPage,
});

function LessonIndexPage() {
  const { groupId, chapterId } = Route.useParams();
  const { data: collectionDetails } = useSuspenseQuery(collectionDetailsQueryOptions(groupId));
  const { data: lesson } = useSuspenseQuery(lessonDetailsQueryOptions(groupId, chapterId));
  if (!collectionDetails || !lesson) {
    throw notFound({ data: { message: "That lesson does not exist." } });
  }
  const currentLesson = lesson;
  const { collection } = collectionDetails;
  const queryClient = useQueryClient();
  const audioCatalogQuery = useQuery(audioCatalogQueryOptions());
  const startGeneration = useMutation(startAudioGenerationMutationOptions());
  const saveGeneratedAudio = useMutation(saveGeneratedAudioMutationOptions(queryClient));
  const [jobId, setJobId] = useState<string | null>(null);
  const generationJob = useQuery(audioGenerationJobQueryOptions(jobId));
  const savedJobId = useRef<string | null>(null);
  const generationStatus = generationJob.data?.status;
  const [hasPollingTimedOut, setHasPollingTimedOut] = useState(false);
  const audioCatalog = audioCatalogQuery.data;
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const defaultModelId = audioCatalog?.models.defaultModel ?? DEFAULT_AUDIO_MODEL_ID;
  const modelId = selectedModelId ?? defaultModelId;
  const defaultModelVoices = audioCatalog?.voicesByModel[modelId];
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const voice = selectedVoiceId ?? defaultModelVoices?.defaultVoice ?? "";
  const [style, setStyle] = useState<(typeof QWEN_STYLE_OPTIONS)[number]["id"]>("neutral");
  const [speed, setSpeed] = useState(DEFAULT_AUDIO_SPEED);
  const [wavOnly, setWavOnly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isJobRunning =
    jobId !== null &&
    generationJob.data?.status !== "failed" &&
    generationJob.data?.status !== "succeeded" &&
    !hasPollingTimedOut &&
    !generationJob.isError;
  const isGenerating = isJobRunning || startGeneration.isPending || saveGeneratedAudio.isPending;
  const generatedAudio = saveGeneratedAudio.data?.generatedAudio ?? currentLesson.generatedAudio;
  const generationProgress = generationJob.data?.progress ?? startGeneration.data?.progress ?? null;
  const error =
    startGeneration.error?.message ??
    generationJob.error?.message ??
    saveGeneratedAudio.error?.message ??
    (generationJob.data?.status === "failed"
      ? (generationJob.data.error ?? "Audio generation failed.")
      : null) ??
    (generationJob.data?.status === "succeeded" && !generationJob.data.result
      ? "Audio generation completed without a result."
      : null) ??
    (hasPollingTimedOut
      ? "Audio generation status timed out. The job may still be running."
      : null) ??
    null;

  let progressPercent = 0;
  if (generationProgress?.total && generationProgress.total > 0) {
    progressPercent = Math.min(
      PERCENTAGE_MAX,
      Math.round((generationProgress.current / generationProgress.total) * PERCENTAGE_MAX)
    );
  } else if (isGenerating) {
    progressPercent = AUDIO_GENERATION_INITIAL_PROGRESS_PERCENT;
  }

  const selectedModel = audioCatalog?.models.models.find(
    (availableModel) => availableModel.id === modelId
  );
  const voicesForModel = audioCatalog?.voicesByModel[modelId]?.voices ?? [];
  const isQwenModel = modelId.startsWith("qwen-");
  const selectedStyle =
    QWEN_STYLE_OPTIONS.find((option) => option.id === style) ?? QWEN_STYLE_OPTIONS[0];
  const selectedVoice = voicesForModel.find(
    (availableVoice: AudioVoice) => availableVoice.id === voice
  );
  const voicesByLanguage = voicesForModel.reduce<Record<string, AudioVoice[]>>(
    (groups, availableVoice) => {
      groups[availableVoice.language] ??= [];
      groups[availableVoice.language].push(availableVoice);
      return groups;
    },
    {}
  );

  useEffect(() => {
    const polled = generationJob.data;
    if (
      !jobId ||
      polled?.status !== "succeeded" ||
      !polled.result ||
      savedJobId.current === jobId
    ) {
      return;
    }

    savedJobId.current = jobId;
    saveGeneratedAudio.mutate(
      { collectionId: collection.id, lessonId: currentLesson.id, result: polled.result },
      {
        onSuccess: ({ generatedAudio: saved }) => {
          setNotice(`Audio stored in ${saved.lessonOutputDir}.`);
        },
      }
    );
  }, [collection.id, currentLesson.id, generationJob.data, jobId, saveGeneratedAudio]);

  useEffect(() => {
    if (!jobId || generationStatus === "failed" || generationStatus === "succeeded") {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setHasPollingTimedOut(true);
      setJobId(null);
    }, AUDIO_GENERATION_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [generationStatus, jobId]);

  async function generateAudio() {
    setNotice(null);
    setHasPollingTimedOut(false);

    try {
      const started = await startGeneration.mutateAsync({
        collectionId: collection.id,
        lessonId: currentLesson.id,
        modelId,
        voice,
        langCode: selectedVoice?.langCode,
        speed,
        instruct:
          isQwenModel && selectedModel?.supportsInstruct ? selectedStyle.instruct : undefined,
        wavOnly,
      });
      savedJobId.current = null;
      setJobId(started.jobId);
    } catch {
      // The mutation exposes its error in the audio panel.
    }
  }

  return (
    <section className="grid gap-6 pt-2">
      <Link
        className={buttonVariants({ variant: "link", className: "w-fit px-0" })}
        to="/groups/$groupId"
        params={{ groupId: collection.id }}
      >
        ← Collection overview
      </Link>

      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Lesson {lesson.order}
          </p>
          <h1 className="mt-0 max-w-3xl font-heading text-3xl font-bold tracking-[-0.03em] md:text-5xl">
            {lesson.title}
          </h1>
        </div>
        <Link
          className={buttonVariants({ variant: "outline" })}
          to="/groups/$groupId/lessons/$chapterId/edit"
          params={{ groupId: collection.id, chapterId: lesson.id }}
        >
          Edit lesson
        </Link>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <MarkdownPreview markdown={lesson.markdown} />

        {/* Audio settings panel */}
        <Card
          className="rounded-xl border-border bg-card"
          role="complementary"
          aria-label="Audio settings"
        >
          <CardHeader className="border-b border-white/6">
            <CardTitle className="font-heading">Audio Settings</CardTitle>
            <CardDescription>Generate TTS audio for this lesson.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 pt-5">
            {audioCatalogQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription className="grid gap-3 text-sm">
                  <span>
                    The audio generator is unavailable. You can still read and edit this lesson.
                  </span>
                  <Button
                    className="w-fit"
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void audioCatalogQuery.refetch()}
                  >
                    Retry audio service
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="model"
                  className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Model
                </Label>
                <Select
                  value={modelId}
                  disabled={!audioCatalog}
                  onValueChange={(nextModelId) => {
                    if (!nextModelId) {
                      return;
                    }

                    setSelectedModelId(nextModelId);
                    const nextVoices = audioCatalog?.voicesByModel[nextModelId];
                    if (nextVoices) {
                      setSelectedVoiceId(nextVoices.defaultVoice);
                    }
                  }}
                >
                  <SelectTrigger id="model" className="w-full font-mono text-[0.82rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {audioCatalog?.models.models.map((availableModel) => (
                      <SelectItem key={availableModel.id} value={availableModel.id}>
                        {availableModel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="voice"
                  className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Voice
                </Label>
                <Select
                  value={voice}
                  disabled={!audioCatalog}
                  onValueChange={(nextVoice) => {
                    if (nextVoice) {
                      setSelectedVoiceId(nextVoice);
                    }
                  }}
                >
                  <SelectTrigger id="voice" className="w-full font-mono text-[0.82rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(voicesByLanguage).map(([language, languageVoices]) => (
                      <SelectGroup key={language}>
                        <SelectLabel>{language}</SelectLabel>
                        {languageVoices.map((availableVoice) => (
                          <SelectItem key={availableVoice.id} value={availableVoice.id}>
                            {availableVoice.name} ({availableVoice.id}
                            {availableVoice.grade ? `, ${availableVoice.grade}` : ""})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVoice ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    {selectedVoice.language} · {selectedVoice.gender}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="style"
                  className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Style
                </Label>
                <Select
                  value={style}
                  disabled={!isQwenModel || !selectedModel?.supportsInstruct}
                  onValueChange={(nextStyle) => {
                    const knownStyle = QWEN_STYLE_OPTIONS.find((option) => option.id === nextStyle);
                    if (knownStyle) {
                      setStyle(knownStyle.id);
                    }
                  }}
                >
                  <SelectTrigger id="style" className="w-full font-mono text-[0.82rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QWEN_STYLE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <div className="order-2 flex shrink-0 items-center gap-2">
                  <Label htmlFor="speed" className="sr-only font-mono text-muted-foreground">
                    Speed
                  </Label>
                  <span className="font-mono text-xs">{speed.toFixed(2)}x</span>
                </div>
                <Slider
                  id="speed"
                  className="order-1 min-w-24 flex-1"
                  min={AUDIO_SPEED_MIN}
                  max={AUDIO_SPEED_MAX}
                  step={AUDIO_SPEED_STEP}
                  value={[speed]}
                  onValueChange={(value: number | readonly number[]) => {
                    // Base UI's callback metadata currently reaches type-aware lint as any.
                    // oxlint-disable-next-line typescript/no-unsafe-assignment
                    const nextSpeed = Array.isArray(value) ? value.at(0) : value;

                    if (typeof nextSpeed === "number") {
                      setSpeed(nextSpeed);
                    }
                  }}
                />
                <div className="hidden justify-between font-mono text-xs text-muted-foreground">
                  <span>0.25x</span>
                  <span>2x</span>
                </div>
              </div>

              <Label className="flex cursor-pointer select-none items-center gap-2">
                <Checkbox checked={wavOnly} onCheckedChange={(checked) => setWavOnly(checked)} />
                <span className="whitespace-nowrap text-sm text-muted-foreground">WAV-only</span>
              </Label>
            </div>

            {/* Generate button */}
            <Button
              className="btn-generate w-full font-semibold tracking-wide"
              type="button"
              onClick={generateAudio}
              disabled={isGenerating || !audioCatalog || !voice}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Generating…
                </span>
              ) : (
                "Generate Audio"
              )}
            </Button>

            {isGenerating && generationProgress ? (
              <div className="grid gap-2">
                <div
                  className="h-2 overflow-hidden rounded-full bg-white/8"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={PERCENTAGE_MAX}
                >
                  <div
                    className="h-full rounded-full bg-linear-to-r from-primary to-[#f5b86a] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  {generationProgress.message}
                </p>
              </div>
            ) : null}

            {/* Last generated result */}
            {generatedAudio && (
              <div className="grid gap-3 rounded-lg border border-primary/15 bg-primary/6 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                    Last Generated
                  </span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {generatedAudio.formattedDuration}
                  </span>
                </div>

                <dl className="grid gap-2.5">
                  {[
                    ...(generatedAudio.modelId
                      ? [{ label: "model", value: generatedAudio.modelId }]
                      : []),
                    ...(generatedAudio.voice
                      ? [{ label: "voice", value: generatedAudio.voice }]
                      : []),
                    ...(generatedAudio.instruct
                      ? [{ label: "style", value: generatedAudio.instruct }]
                      : []),
                    ...(generatedAudio.modelSource
                      ? [{ label: "source", value: generatedAudio.modelSource }]
                      : []),
                    { label: "output", value: generatedAudio.lessonOutputDir },
                    { label: "wav", value: generatedAudio.wavPath },
                    ...(generatedAudio.mp3Path
                      ? [{ label: "mp3", value: generatedAudio.mp3Path }]
                      : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="grid gap-0.5">
                      <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="break-all font-mono text-xs leading-relaxed text-foreground/80">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                  <span>{generatedAudio.chunkCount} chunks</span>
                  <span>·</span>
                  <span>{generatedAudio.cleanedCharacterCount.toLocaleString()} chars</span>
                </div>
              </div>
            )}

            {notice && (
              <Alert>
                <AlertDescription className="text-sm">{notice}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
