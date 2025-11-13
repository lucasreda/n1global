import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Configuração de timeout (30 segundos)
const REQUEST_TIMEOUT = 30000;
// Configuração de retry
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo base

// Verifica se é um erro de rede que deve ser retentado
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name?.toLowerCase() || '';
  
  // Erros de rede que devem ser retentados
  return (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('networkerror') ||
    errorMessage.includes('network request failed') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorName === 'typeerror' ||
    errorName === 'networkerror'
  );
}

// Função para fazer retry com backoff exponencial
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Se for erro 5xx, tentar novamente (exceto na última tentativa)
        if (response.status >= 500 && response.status < 600 && attempt < retries) {
          const delay = RETRY_DELAY * Math.pow(2, attempt);
          console.warn(`⚠️ Erro do servidor ${response.status}, tentando novamente em ${delay}ms... (tentativa ${attempt + 1}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error: any) {
      lastError = error;
      
      // Se for erro de abort (timeout) ou erro de rede retentável
      if (
        (error.name === 'AbortError' || isRetryableError(error)) &&
        attempt < retries
      ) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`⚠️ Erro de conexão, tentando novamente em ${delay}ms... (tentativa ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Se não for retentável ou esgotaram as tentativas, lançar erro
      throw error;
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  throw lastError || new Error('Falha na requisição após múltiplas tentativas');
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
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

  try {
    const res = await fetchWithRetry(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (res.status === 401 || res.status === 403) {
      // Only redirect if this is an authenticated request that failed
      // Don't redirect on login failures
      if (url !== "/api/auth/login" && localStorage.getItem("auth_token")) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        window.location.href = "/";
      }
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // Tratamento de erros de conexão
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      throw new Error('Tempo de conexão esgotado. Verifique sua conexão com a internet e tente novamente.');
    }
    
    if (isRetryableError(error)) {
      throw new Error('Erro de conexão. Verifique sua conexão com a internet e tente novamente.');
    }
    
    // Re-lançar outros erros
    throw error;
  }
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
    
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (operationId) {
      headers["x-operation-id"] = operationId;
    }

    try {
      const res = await fetchWithRetry(url, {
        headers,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      if (res.status === 401 || res.status === 403) {
        // Only redirect if this is an authenticated request that failed
        // Don't redirect on login failures
        if (url !== "/api/auth/login" && localStorage.getItem("auth_token")) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          window.location.href = "/";
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      // Tratamento de erros de conexão
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        throw new Error('Tempo de conexão esgotado. Verifique sua conexão com a internet e tente novamente.');
      }
      
      if (isRetryableError(error)) {
        throw new Error('Erro de conexão. Verifique sua conexão com a internet e tente novamente.');
      }
      
      // Re-lançar outros erros
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
      // Retry já é feito na função fetchWithRetry, então não precisamos retry adicional aqui
      // Apenas em casos muito específicos de erro de rede que não foram capturados
      retry: (failureCount, error: any) => {
        // Apenas retry se for erro de rede e ainda não tivermos feito muitas tentativas
        // O fetchWithRetry já faz 3 tentativas, então aqui fazemos apenas 1 tentativa extra se necessário
        if (isRetryableError(error) && failureCount === 0) {
          return true;
        }
        return false;
      },
      retryDelay: 2000, // 2 segundos de delay antes de retry
    },
    mutations: {
      // Para mutations, não fazer retry automático - já é feito no fetchWithRetry
      retry: false,
    },
  },
});
