/// <reference types="vite/client" />

import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";

import AppHeader from "../components/app-header";
import RouteError from "../components/route-error";
import RouteNotFound from "../components/route-not-found";
import appCss from "../styles/app.css?url";

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
        href: appCss,
      },
    ],
  }),
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <div className="app-shell">
        <AppHeader />
        <main className="app-main">
          <Outlet />
        </main>
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
