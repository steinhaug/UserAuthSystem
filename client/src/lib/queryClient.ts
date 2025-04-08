import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: {
    method?: string; 
    data?: unknown | undefined;
    headers?: Record<string, string>;
  } = {},
): Promise<any> {
  const method = options.method || 'GET';
  const headers = { 
    ...(options.data ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };
  
  const res = await fetch(url, {
    method,
    headers,
    body: options.data ? JSON.stringify(options.data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Check if response should be parsed as JSON
  const contentType = res.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
