import { apiRequest, generateSessionId, clearSessionId } from "./queryClient";
import { queryClient } from "./queryClient";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  preferredLanguage?: string | null;
}

interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest("/api/auth/login", "POST", credentials);
    const data = await response.json();
    
    // Gerar novo sessionId ao fazer login
    const sessionId = generateSessionId();
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("auth_session_id", sessionId);
    
    return data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiRequest("/api/auth/register", "POST", credentials);
    const data = await response.json();
    
    // Gerar novo sessionId ao fazer registro
    const sessionId = generateSessionId();
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("auth_session_id", sessionId);
    
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiRequest("/api/auth/me", "GET");
    return response.json();
  },

  logout() {
    // Limpar sessionId e cancelar requisições pendentes
    clearSessionId();
    // Invalidar todas as queries do React Query
    queryClient.clear();
    // Limpar dados de autenticação
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  },

  forceLogout() {
    // Limpar sessionId e cancelar requisições pendentes
    clearSessionId();
    // Invalidar todas as queries do React Query
    queryClient.clear();
    // Clear all localStorage data
    localStorage.clear();
    // Also clear sessionStorage just in case
    sessionStorage.clear();
    // Force page reload to reset all state
    window.location.href = '/';
  },

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  },

  getUser(): User | null {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

// Add token to all API requests
const originalApiRequest = apiRequest;
export const authenticatedApiRequest = async (
  method: string,
  url: string,
  data?: unknown,
  options?: { headers?: Record<string, string> }
): Promise<Response> => {
  // Usar apiRequest que já tem timeout e retry logic
  return apiRequest(url, method, data);
};
