import { create } from "zustand";
import { authService } from "@/lib/auth";
import { useOperationStore } from "@/store/operations";
import { queryClient, generateSessionId, getCurrentSessionId } from "@/lib/queryClient";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  preferredLanguage?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      // Clear operation store for fresh user session
      useOperationStore.getState().setSelectedOperation(null);
      localStorage.removeItem('current_operation_id');
      
      // Invalidar todas as queries antes do login para evitar conflitos
      queryClient.clear();
      
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

  register: async (name: string, email: string, password: string, role: string = "user") => {
    try {
      // Invalidar todas as queries antes do registro para evitar conflitos
      queryClient.clear();
      
      const response = await authService.register({ name, email, password, role });
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
    // Clear operation store and localStorage
    useOperationStore.getState().setSelectedOperation(null);
    localStorage.removeItem('current_operation_id');
    
    // Invalidar todas as queries e cancelar requisições pendentes
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
      // Se há token mas não há sessionId, gerar um novo (usuário logado antes da implementação do sistema de sessão)
      if (!getCurrentSessionId()) {
        const sessionId = generateSessionId();
        localStorage.setItem("auth_session_id", sessionId);
      }
      
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
