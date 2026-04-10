import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client with sensible retries for flaky networks.
 * Offline reads still succeed when the service worker serves cached `/api/*` responses.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      // Keep UI snappy: one quick retry is enough.
      retry: 1,
      retryDelay: 400,
      refetchOnWindowFocus: false,
    },
  },
});
