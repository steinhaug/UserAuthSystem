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
    body?: string;
    data?: unknown | undefined;
    headers?: Record<string, string>;
  } = {},
): Promise<Response> {
  const method = options.method || 'GET';
  
  // Add development mode header if in development mode
  const headers = { 
    ...(options.body || options.data ? { "Content-Type": "application/json" } : {}),
    ...(DEVELOPMENT_MODE ? { "X-Dev-Mode": "true" } : {}),
    ...(options.headers || {})
  };
  
  console.log(`API Request to ${url} with development mode: ${DEVELOPMENT_MODE}`);
  
  // Use either direct body or stringify data
  const body = options.body || (options.data ? JSON.stringify(options.data) : undefined);
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    
    // Check if response should be parsed as JSON
    const contentType = res.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    
    return res;
  } catch (error) {
    console.error(`API request error for ${url}:`, error);
    throw error;
  }
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
    
    console.log(`Query request to ${queryKey[0]} with development mode: ${DEVELOPMENT_MODE}`);
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`401 Unauthorized for ${queryKey[0]}, returning null as configured`);
        return null;
      }

      await throwIfResNotOk(res);
      
      const contentType = res.headers.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Response from ${queryKey[0]} is not JSON, content type: ${contentType}`);
        return null;
      }
      
      return await res.json();
    } catch (error) {
      console.error(`Query error for ${queryKey[0]}:`, error);
      throw error;
    }
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
