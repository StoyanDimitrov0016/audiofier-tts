import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <section className="workspace narrow-workspace">
      <p className="eyebrow">Audiofier</p>
      <h1>Lesson Library</h1>
      <p className="service-note">
        Create audio groups, split long material into lessons, edit markdown, and generate audio one lesson at a time.
      </p>
    </section>
  );
}
