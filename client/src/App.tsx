import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthModal } from "@/components/auth/auth-modal";
import { Sidebar } from "@/components/dashboard/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import SellerDashboard from "@/pages/seller-dashboard";
import Orders from "@/pages/orders";
import Analytics from "@/pages/analytics";
import Integrations from "@/pages/integrations";
import Products from "@/pages/products";
import Settings from "@/pages/settings";
import Ads from "@/pages/ads";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ['/api/user/onboarding-status', user?.id],
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Clear cache when user changes
  useEffect(() => {
    if (user) {
      // Clear all onboarding-related queries for clean state
      queryClient.removeQueries({ 
        queryKey: ['/api/user/onboarding-status'] 
      });
    }
  }, [user?.id]);

  // Effect to handle redirection without causing React warnings
  useEffect(() => {
    const needsOnboarding = user && !isLoading && !onboardingStatus?.onboardingCompleted;
    
    console.log('OnboardingGuard - Debug:', {
      user: !!user,
      userId: user?.id,
      isLoading,
      onboardingCompleted: onboardingStatus?.onboardingCompleted,
      onboardingSteps: onboardingStatus?.onboardingSteps,
      location,
      needsOnboarding,
      shouldRedirect: needsOnboarding && location !== '/onboarding'
    });
    
    if (needsOnboarding && location !== '/onboarding') {
      console.log('OnboardingGuard - Redirecting to /onboarding');
      setLocation('/onboarding');
    }
  }, [user, isLoading, onboardingStatus?.onboardingCompleted, location, setLocation]);

  // Don't interfere with onboarding page itself
  if (location === '/onboarding') {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glassmorphism rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  // Show loading if redirection is needed
  if (user && !onboardingStatus?.onboardingCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glassmorphism rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Redirecionando para configuração...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();
  const isProductSeller = user?.role === 'product_seller';

  return (
    <OnboardingGuard>
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/" component={isProductSeller ? SellerDashboard : Dashboard} />
        <Route path="/orders" component={Orders} />
        {!isProductSeller && <Route path="/analytics" component={Analytics} />}
        <Route path="/integrations" component={Integrations} />
        {!isProductSeller && <Route path="/ads" component={Ads} />}
        <Route path="/products" component={Products} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </OnboardingGuard>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const [location] = useLocation();

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
        <>
          {/* Fullscreen layout for onboarding */}
          {location === '/onboarding' ? (
            <div className="min-h-screen">
              <Router />
            </div>
          ) : (
            /* Regular dashboard layout with sidebar */
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="ml-64 flex-1 p-6">
                <Router />
              </main>
            </div>
          )}
        </>
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
