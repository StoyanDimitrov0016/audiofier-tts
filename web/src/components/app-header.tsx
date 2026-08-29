import { Link } from "@tanstack/react-router";

export default function AppHeader() {
  return (
    <header className="relative z-10 border-b border-border bg-[#0d1016]/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-[min(1380px,calc(100%-32px))] items-center justify-between gap-4 py-3 max-sm:grid max-sm:w-[min(100%-20px,1380px)]">
        <Link className="flex min-w-0 items-center gap-3 text-foreground no-underline" to="/">
          {/* Logo mark */}
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-[#c97c2e] font-mono text-sm font-black tracking-[-0.04em] text-[#0f1117] shadow-[0_0_16px_rgba(232,150,58,0.3)]"
            aria-hidden="true"
          >
            A/
          </span>
          <span>
            <strong className="block font-heading text-sm font-bold tracking-[-0.02em]">
              Audiofier
            </strong>
            <small className="block font-mono text-xs text-primary/70">tts · workspace</small>
          </span>
        </Link>
      </div>
    </header>
  );
}
