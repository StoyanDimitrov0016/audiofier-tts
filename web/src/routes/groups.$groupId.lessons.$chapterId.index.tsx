import { useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";

import MarkdownPreview from "../components/markdown-preview";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { generateChapterAudio, getAudioGroupDetails, getChapterDetails } from "../server/lessons";

export const Route = createFileRoute("/groups/$groupId/lessons/$chapterId/")({
  loader: async ({ params }) => {
    const [groupDetails, chapter] = await Promise.all([
      getAudioGroupDetails({
        data: {
          groupId: params.groupId,
        },
      }),
      getChapterDetails({
        data: {
          groupId: params.groupId,
          chapterId: params.chapterId,
        },
      }),
    ]);

    if (!groupDetails || !chapter) {
      throw notFound({
        data: {
          message: "That lesson does not exist.",
        },
      });
    }

    return {
      group: groupDetails.group,
      chapter,
    };
  },
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: LessonIndexPage,
});

function LessonIndexPage() {
  const { group, chapter } = Route.useLoaderData();
  const router = useRouter();
  const [voice, setVoice] = useState("af_heart");
  const [speed, setSpeed] = useState(1);
  const [wavOnly, setWavOnly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(chapter.generatedAudio);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateAudio() {
    setIsGenerating(true);
    setNotice(null);
    setError(null);

    try {
      const generated = await generateChapterAudio({
        data: {
          groupId: group.id,
          chapterId: chapter.id,
          voice,
          speed,
          wavOnly,
        },
      });
      await router.invalidate({ sync: true });
      setGeneratedAudio(generated.generatedAudio);
      setNotice(`Audio stored in ${generated.generatedAudio.lessonOutputDir}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audio generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="grid gap-6 pt-2">
      <Link
        className={buttonVariants({ variant: "link", className: "w-fit px-0" })}
        to="/groups/$groupId"
        params={{ groupId: group.id }}
      >
        Back to group
      </Link>
      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-primary">Lesson {chapter.order}</p>
          <h1 className="mt-1 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{chapter.title}</h1>
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

        <Card className="rounded-lg" role="complementary" aria-label="Audio settings">
          <CardHeader>
            <CardTitle>Audio settings</CardTitle>
            <CardDescription>Generate audio for this lesson.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="voice">Voice</Label>
              <Input id="voice" value={voice} onChange={(event) => setVoice(event.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="speed">Speed</Label>
              <Input
                id="speed"
                type="number"
                min="0.5"
                max="2"
                step="0.05"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
            </div>

            <Label className="flex items-center gap-2">
              <Checkbox checked={wavOnly} onCheckedChange={(checked) => setWavOnly(Boolean(checked))} />
              WAV only
            </Label>

            <Button type="button" onClick={generateAudio} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate audio"}
            </Button>

            {generatedAudio ? (
              <Card className="rounded-lg bg-muted/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Last generated
                    <Badge variant="secondary">{generatedAudio.formattedDuration}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3">
                    <div className="grid gap-1">
                      <dt className="text-xs font-semibold uppercase text-muted-foreground">Output</dt>
                      <dd className="[overflow-wrap:anywhere]">{generatedAudio.lessonOutputDir}</dd>
                    </div>
                    <div className="grid gap-1">
                      <dt className="text-xs font-semibold uppercase text-muted-foreground">WAV</dt>
                      <dd className="[overflow-wrap:anywhere]">{generatedAudio.wavPath}</dd>
                    </div>
                    {generatedAudio.mp3Path ? (
                      <div className="grid gap-1">
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">MP3</dt>
                        <dd className="[overflow-wrap:anywhere]">{generatedAudio.mp3Path}</dd>
                      </div>
                    ) : null}
                  </dl>
                </CardContent>
              </Card>
            ) : null}

            {notice ? (
              <Alert>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
