import { useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";

import MarkdownPreview from "../components/markdown-preview";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
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
import { getAudioGenerationJob } from "../lib/audio-generator-client";
import type { AudioVoice, GenerateAudioProgress } from "../lib/audio-types";
import {
  getAudioGroupDetails,
  getAvailableAudioVoices,
  getChapterDetails,
  saveChapterAudioGenerationResult,
  startChapterAudioGeneration,
} from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/lessons/$chapterId/")({
  loader: async ({ params }) => {
    const [groupDetails, chapter, voices] = await Promise.all([
      getAudioGroupDetails({ data: { groupId: params.groupId } }),
      getChapterDetails({ data: { groupId: params.groupId, chapterId: params.chapterId } }),
      getAvailableAudioVoices(),
    ]);
    if (!groupDetails || !chapter) {
      throw notFound({ data: { message: "That lesson does not exist." } });
    }
    return { group: groupDetails.group, chapter, voices };
  },
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: LessonIndexPage,
});

function LessonIndexPage() {
  const { group, chapter, voices } = Route.useLoaderData();
  const router = useRouter();
  const [voice, setVoice] = useState(voices.defaultVoice);
  const [speed, setSpeed] = useState(1);
  const [wavOnly, setWavOnly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(chapter.generatedAudio);
  const [generationProgress, setGenerationProgress] = useState<GenerateAudioProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const progressPercent =
    generationProgress?.total && generationProgress.total > 0
      ? Math.min(100, Math.round((generationProgress.current / generationProgress.total) * 100))
      : isGenerating
        ? 8
        : 0;

  const selectedVoice =
    voices.voices.find((availableVoice: AudioVoice) => availableVoice.id === voice) ?? voices.voices[0];
  const voicesByLanguage = voices.voices.reduce<Record<string, AudioVoice[]>>((groups, availableVoice) => {
    groups[availableVoice.language] ??= [];
    groups[availableVoice.language].push(availableVoice);
    return groups;
  }, {});

  function wait(milliseconds: number) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function generateAudio() {
    setIsGenerating(true);
    setGenerationProgress({
      stage: "starting",
      current: 0,
      total: null,
      message: "Starting audio generation.",
    });
    setNotice(null);
    setError(null);

    try {
      const started = await startChapterAudioGeneration({
        data: {
          groupId: group.id,
          chapterId: chapter.id,
          backend: selectedVoice?.backend,
          voice,
          langCode: selectedVoice?.lang_code,
          speed,
          wavOnly,
        },
      });

      setGenerationProgress(started.progress);

      while (true) {
        await wait(800);
        const polled = await getAudioGenerationJob(started.jobId);

        setGenerationProgress(polled.progress);

        if (polled.status === "failed") {
          throw new Error(polled.error ?? "Audio generation failed.");
        }

        if (polled.status === "succeeded" && polled.result) {
          const saved = await saveChapterAudioGenerationResult({
            data: {
              groupId: group.id,
              chapterId: chapter.id,
              result: polled.result,
            },
          });

          await router.invalidate({ sync: true });
          setGeneratedAudio(saved.generatedAudio);
          setNotice(`Audio stored in ${saved.generatedAudio.lessonOutputDir}.`);
          return;
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audio generation failed.");
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  }

  async function copyMarkdownPath() {
    setCopyNotice(null);
    setError(null);

    try {
      await navigator.clipboard.writeText(chapter.markdownPath);
      setCopyNotice("Markdown path copied.");
    } catch {
      setError("Could not copy markdown path.");
    }
  }

  return (
    <section className="grid gap-6 pt-2">
      <Link
        className={buttonVariants({ variant: "link", className: "w-fit px-0" })}
        to="/groups/$groupId"
        params={{ groupId: group.id }}
      >
        ← Back to group
      </Link>

      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--primary)", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Lesson {chapter.order}
          </p>
          <h1
            className="mt-0 max-w-3xl text-3xl md:text-5xl font-bold"
            style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.03em" }}
          >
            {chapter.title}
          </h1>
        </div>
        <Link
          className={buttonVariants({ variant: "outline" })}
          to="/groups/$groupId/lessons/$chapterId/edit"
          params={{ groupId: group.id, chapterId: chapter.id }}
        >
          Edit lesson
        </Link>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <MarkdownPreview markdown={chapter.markdown} />

        {/* Audio settings panel */}
        <Card
          className="rounded-xl"
          role="complementary"
          aria-label="Audio settings"
          style={{ background: "var(--card)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <CardHeader className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <CardTitle style={{ fontFamily: "Syne, sans-serif" }}>Audio Settings</CardTitle>
            <CardDescription>Generate TTS audio for this lesson.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 pt-5">
            <div
              className="grid gap-3 rounded-lg p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Label
                className="text-xs uppercase tracking-wider"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
              >
                Markdown location
              </Label>
              <p
                className="break-all text-xs leading-relaxed"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--foreground)", opacity: 0.8 }}
              >
                {chapter.markdownPath}
              </p>
              <Button className="w-fit" type="button" variant="outline" size="sm" onClick={copyMarkdownPath}>
                Copy path
              </Button>
              {copyNotice ? (
                <p className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--primary)" }}>
                  {copyNotice}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(80px,0.75fr)_minmax(0,180px)_auto] sm:items-center">
              <div className="order-2 flex items-center gap-2">
                <Label
                  htmlFor="voice"
                  className="sr-only"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
                >
                  Voice
                </Label>
                <Select
                  value={voice}
                  onValueChange={(nextVoice) => {
                    if (nextVoice) {
                      setVoice(nextVoice);
                    }
                  }}
                >
                  <SelectTrigger
                    id="voice"
                    className="w-full"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.82rem" }}
                  >
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
                  <p
                    className="hidden text-xs"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
                  >
                    {selectedVoice.language} · {selectedVoice.gender}
                  </p>
                ) : null}
              </div>

              <div className="order-1 flex items-center gap-2">
                <div className="order-2 flex shrink-0 items-center gap-2">
                  <Label
                    htmlFor="speed"
                    className="sr-only"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
                  >
                    Speed
                  </Label>
                  <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {speed.toFixed(2)}x
                  </span>
                </div>
                <Slider
                  id="speed"
                  className="order-1 min-w-24 flex-1"
                  min={0.25}
                  max={2}
                  step={0.05}
                  value={[speed]}
                  onValueChange={(value) => {
                    const nextSpeed = Array.isArray(value) ? value[0] : value;

                    if (typeof nextSpeed === "number") {
                      setSpeed(nextSpeed);
                    }
                  }}
                />
                <div
                  className="hidden justify-between text-xs"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
                >
                  <span>0.25x</span>
                  <span>2x</span>
                </div>
              </div>

              <Label className="order-3 flex cursor-pointer select-none items-center gap-2">
                <Checkbox checked={wavOnly} onCheckedChange={(checked) => setWavOnly(Boolean(checked))} />
                <span className="whitespace-nowrap text-sm" style={{ color: "var(--muted-foreground)" }}>
                  WAV-only
                </span>
              </Label>
            </div>

            {/* Generate button */}
            <Button
              className="btn-generate w-full font-semibold tracking-wide"
              type="button"
              onClick={generateAudio}
              disabled={isGenerating}
              style={{ fontFamily: "Syne, sans-serif", letterSpacing: "0.03em" }}
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
                  className="h-2 overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressPercent}%`,
                      background: "linear-gradient(90deg, #e8963a, #f5b86a)",
                    }}
                  />
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
                >
                  {generationProgress.message}
                </p>
              </div>
            ) : null}

            {/* Last generated result */}
            {generatedAudio && (
              <div
                className="rounded-lg p-4 grid gap-3"
                style={{ background: "rgba(232,150,58,0.06)", border: "1px solid rgba(232,150,58,0.15)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--primary)" }}
                  >
                    Last Generated
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: "rgba(232,150,58,0.15)",
                      color: "var(--primary)",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {generatedAudio.formattedDuration}
                  </span>
                </div>

                <dl className="grid gap-2.5">
                  {[
                    { label: "output", value: generatedAudio.lessonOutputDir },
                    { label: "wav", value: generatedAudio.wavPath },
                    ...(generatedAudio.mp3Path ? [{ label: "mp3", value: generatedAudio.mp3Path }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="grid gap-0.5">
                      <dt
                        className="text-xs uppercase"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: "var(--muted-foreground)",
                          fontSize: "0.65rem",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {label}
                      </dt>
                      <dd
                        className="text-xs break-all leading-relaxed"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--foreground)", opacity: 0.8 }}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div
                  className="flex gap-3 text-xs"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
                >
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
