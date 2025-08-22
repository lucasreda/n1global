import { apiRequest } from "./queryClient";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    const data = await response.json();
    
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    return data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/register", credentials);
    const data = await response.json();
    
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },

  logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
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
  const token = authService.getToken();
  const headers: HeadersInit = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(options?.headers || {})
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }

  return response;
};
