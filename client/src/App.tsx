import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthModal } from "@/components/auth/auth-modal";
import { Sidebar } from "@/components/dashboard/sidebar";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import Analytics from "@/pages/analytics";
import Integrations from "@/pages/integrations";
import Products from "@/pages/products";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/orders" component={Orders} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/products" component={Products} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glassmorphism rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthModal isOpen={!isAuthenticated} />
      {isAuthenticated && (
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-64 flex-1 p-6">
            <Router />
          </main>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <AppContent />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
