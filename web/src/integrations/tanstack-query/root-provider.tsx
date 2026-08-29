import { QueryClient } from "@tanstack/react-query";

export function getRouterContext() {
  return {
    queryClient: new QueryClient(),
  };
}
