import { useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";

import MarkdownPreview from "../components/markdown-preview";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import RoutePending from "../components/route-pending";
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
    <section className="workspace">
      <Link className="text-link" to="/groups/$groupId" params={{ groupId: group.id }}>
        Back to group
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">Lesson {chapter.order}</p>
          <h1>{chapter.title}</h1>
        </div>
        <Link
          className="secondary-link"
          to="/groups/$groupId/lessons/$chapterId/edit"
          params={{ groupId: group.id, chapterId: chapter.id }}
        >
          Edit lesson
        </Link>
      </header>

      <div className="lesson-view-grid">
        <MarkdownPreview markdown={chapter.markdown} />

        <aside className="control-panel" aria-label="Audio settings">
          <label>
            Voice
            <input value={voice} onChange={(event) => setVoice(event.target.value)} />
          </label>

          <label>
            Speed
            <input
              type="number"
              min="0.5"
              max="2"
              step="0.05"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
          </label>

          <label className="toggle-row">
            <input type="checkbox" checked={wavOnly} onChange={(event) => setWavOnly(event.target.checked)} />
            WAV only
          </label>

          <button className="primary-action" type="button" onClick={generateAudio} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate audio"}
          </button>

          {generatedAudio ? (
            <div className="result-box">
              <p>Last generated {generatedAudio.formattedDuration}</p>
              <dl>
                <div>
                  <dt>Output</dt>
                  <dd>{generatedAudio.lessonOutputDir}</dd>
                </div>
                <div>
                  <dt>WAV</dt>
                  <dd>{generatedAudio.wavPath}</dd>
                </div>
                {generatedAudio.mp3Path ? (
                  <div>
                    <dt>MP3</dt>
                    <dd>{generatedAudio.mp3Path}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          {notice ? <p className="status-banner">{notice}</p> : null}
          {error ? <p className="status-banner error-text">{error}</p> : null}
        </aside>
      </div>
    </section>
  );
}
