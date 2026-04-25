/// <reference types="vite/client" />

import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";

import AppHeader from "../components/app-header";
import AppSidePanel from "../components/app-side-panel";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import { getLessonLibrary } from "../server/lessons";
import css from "../styles/app.css?url";
import favicon from "../assets/favicon.svg?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Audiofier",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: css,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: favicon,
      },
    ],
  }),
  loader: async () => getLessonLibrary(),
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: RootComponent,
});

function RootComponent() {
  const library = Route.useLoaderData();

  return (
    <RootDocument>
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto grid w-[min(1380px,calc(100%-32px))] grid-cols-[300px_minmax(0,1fr)] items-start gap-6 py-6 max-lg:grid-cols-1 max-sm:w-[min(100%-20px,1380px)] max-sm:py-4">
          <AppSidePanel library={library} />
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
