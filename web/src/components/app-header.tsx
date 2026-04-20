import { Link } from "@tanstack/react-router";

import { buttonVariants } from "./ui/button";

export default function AppHeader() {
  return (
    <header
      className="relative z-10 border-b"
      style={{
        background: "rgba(13,16,22,0.92)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* Amber accent stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #e8963a 25%, #f5b86a 50%, #e8963a 75%, transparent 100%)",
          opacity: 0.6,
        }}
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-16 w-[min(1380px,calc(100%-32px))] items-center justify-between gap-4 py-3 max-sm:grid max-sm:w-[min(100%-20px,1380px)]">
        <Link className="flex min-w-0 items-center gap-3 text-foreground no-underline" to="/">
          {/* Logo mark */}
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-black"
            style={{
              background: "linear-gradient(135deg, #e8963a, #c97c2e)",
              color: "#0f1117",
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "-0.04em",
              boxShadow: "0 0 16px rgba(232,150,58,0.3)",
            }}
            aria-hidden="true"
          >
            A/
          </span>
          <span>
            <strong
              className="block text-sm font-bold tracking-tight"
              style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.02em" }}
            >
              Audiofier
            </strong>
            <small
              className="block text-xs"
              style={{ color: "rgba(232,150,58,0.7)", fontFamily: "IBM Plex Mono, monospace" }}
            >
              tts · workspace
            </small>
          </span>
        </Link>

        <nav
          className="flex shrink-0 items-center gap-2 max-sm:grid max-sm:grid-cols-2"
          aria-label="Primary navigation"
        >
          <Link className={buttonVariants({ variant: "ghost" })} to="/groups">
            Groups
          </Link>
          <Link className={buttonVariants()} to="/groups/new">
            New group
          </Link>
        </nav>
      </div>
    </header>
  );
}
