import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

const swallowAuthExpired = (err) => {
  if (err?.code === 'AUTH_EXPIRED') return;
};

export const queryClientInstance = new QueryClient({
  queryCache: new QueryCache({ onError: swallowAuthExpired }),
  mutationCache: new MutationCache({ onError: swallowAuthExpired }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, err) => {
        if (err?.code === 'AUTH_EXPIRED') return false;
        return failureCount < 1;
      },
    },
  },
});