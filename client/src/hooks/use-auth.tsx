import { create } from "zustand";
import { authService } from "@/lib/auth";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      const response = await authService.register({ name, email, password });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: () => {
    const token = authService.getToken();
    const user = authService.getUser();
    
    if (token && user) {
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
