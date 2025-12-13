"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: false,
            queryFn: async ({ queryKey }) => {
              const url = Array.isArray(queryKey) ? queryKey.join("/") : queryKey;
              const res = await fetch(url as string, {
                credentials: "include",
              });
              if (!res.ok) {
                throw new Error(await res.text());
              }
              return res.json();
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
