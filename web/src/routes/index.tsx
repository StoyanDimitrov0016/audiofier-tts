import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <section className="mx-auto w-full max-w-3xl pt-2">
      <Card
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <CardHeader>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--primary)", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            local ai tts
          </p>
          <CardTitle
            className="text-4xl md:text-5xl font-bold"
            style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.03em" }}
          >
            Lesson Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            Create audio groups, split long material into lessons, edit markdown, and generate audio one lesson at a
            time.
          </p>

          {/* Decorative waveform bars */}
          <div className="mt-6 flex items-end gap-0.5 h-10 opacity-20" aria-hidden="true">
            {[
              3, 5, 8, 6, 9, 7, 10, 5, 8, 6, 9, 4, 7, 10, 6, 8, 5, 9, 7, 6, 8, 5, 9, 10, 7, 6, 8, 5, 9, 4, 7, 10, 6, 8,
              5,
            ].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h * 10}%`,
                  background: "var(--primary)",
                  opacity: 0.4 + (h / 10) * 0.6,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
