import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem("auth_token");
  const operationId = localStorage.getItem("current_operation_id");
  
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (operationId) {
    headers["x-operation-id"] = operationId;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    // Token expired or invalid, clear auth
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const token = localStorage.getItem("auth_token");
    const operationId = localStorage.getItem("current_operation_id");
    
    console.log("🔧 Query request:", { url, hasToken: !!token, tokenLength: token?.length });
    
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (operationId) {
      headers["x-operation-id"] = operationId;
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    console.log("🔧 Query response:", { url, status: res.status, statusText: res.statusText });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("🔧 Returning null for 401");
      return null;
    }

    if (res.status === 401 || res.status === 403) {
      console.log("🔧 Auth failed, redirecting");
      // Token expired or invalid, clear auth
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log("🔧 Query data:", { url, dataLength: Array.isArray(data) ? data.length : 'not-array' });
    return data;
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
