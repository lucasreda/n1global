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
    staleTime: 0, // Don't cache to ensure fresh data
    gcTime: 0,
  });

  // Clear cache when user changes
  useEffect(() => {
    if (user) {
      queryClient.removeQueries({ 
        queryKey: ['/api/user/onboarding-status'] 
      });
    }
  }, [user?.id]);

  // Handle redirection
  useEffect(() => {
    const hasUser = !!user;
    const hasData = !isLoading && onboardingStatus !== undefined;
    const needsOnboarding = hasData && !onboardingStatus?.onboardingCompleted;
    const notOnOnboardingPage = location !== '/onboarding';
    
    console.log('OnboardingGuard - Debug:', {
      hasUser,
      isLoading,
      hasData,
      onboardingCompleted: onboardingStatus?.onboardingCompleted,
      needsOnboarding,
      location,
      shouldRedirect: hasUser && needsOnboarding && notOnOnboardingPage
    });

    if (hasUser && needsOnboarding && notOnOnboardingPage) {
      console.log('OnboardingGuard - REDIRECTING NOW');
      setLocation('/onboarding');
    }
  }, [user, isLoading, onboardingStatus, location, setLocation]);

  // Always render onboarding page if we're on that route
  if (location === '/onboarding') {
    return <>{children}</>;
  }

  // Show loading while checking auth or onboarding status
  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glassmorphism rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  // If we have user and onboarding data, check if redirection is needed
  if (onboardingStatus && !onboardingStatus.onboardingCompleted) {
    // Force redirect after a brief delay if not already on onboarding page
    if (location !== '/onboarding') {
      setTimeout(() => {
        console.log('OnboardingGuard - Force redirect to onboarding');
        setLocation('/onboarding');
      }, 100);
    }
    
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
