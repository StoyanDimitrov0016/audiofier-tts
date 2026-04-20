import { Link } from "@tanstack/react-router";

import { buttonVariants } from "./ui/button";

export default function AppHeader() {
  return (
    <header className="border-b bg-card/90">
      <div className="mx-auto flex min-h-18 w-[min(1380px,calc(100%-32px))] items-center justify-between gap-4 py-3 max-sm:grid max-sm:w-[min(100%-20px,1380px)]">
        <Link className="flex min-w-0 items-center gap-3 text-foreground no-underline" to="/">
          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black"
            aria-hidden="true"
          >
            A
          </span>
          <span>
            <strong className="block text-base">Audiofier</strong>
            <small className="mt-0.5 block text-sm font-semibold text-muted-foreground">Lesson audio workspace</small>
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
