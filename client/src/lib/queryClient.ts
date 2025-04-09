import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { DEVELOPMENT_MODE } from './constants';

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
  
  // Add development mode header if in development mode
  const headers = { 
    ...(options.data ? { "Content-Type": "application/json" } : {}),
    ...(DEVELOPMENT_MODE ? { "X-Dev-Mode": "true" } : {}),
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
    // Add development mode header in development mode
    const headers: Record<string, string> = {};
    if (DEVELOPMENT_MODE) {
      headers["X-Dev-Mode"] = "true";
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
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
