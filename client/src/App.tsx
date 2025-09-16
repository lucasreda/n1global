import { useEffect, useState, lazy } from "react";
import { Switch, Route } from "wouter";
import { LogOut, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SellerDashboard from "@/pages/seller-dashboard";
import Orders from "@/pages/orders";
import Analytics from "@/pages/analytics";
import Integrations from "@/pages/integrations";
import Products from "@/pages/products";
import Tools from "@/pages/tools";
import CostCalculator from "@/pages/cost-calculator";
import Settings from "@/pages/settings";
import Ads from "@/pages/ads";
import Creatives from "@/pages/creatives";
import CreativeDetails from "@/pages/creative-details";
import Onboarding from "@/pages/onboarding";
import InsidePage from "@/pages/inside";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminOrders from "@/pages/admin/orders";
import AdminUsers from "@/pages/admin/users";
import AdminProducts from "@/pages/admin/products";
import AdminStores from "@/pages/admin/stores";
import AdminGlobal from "@/pages/admin/global";
import AdminSettings from "@/pages/admin/settings";
import AdminSupport from "@/pages/admin/support";
import CustomerSupport from "@/pages/customer-support";
import CustomerSupportSettings from "@/pages/customer-support-settings";
import { AdminLayout } from "@/components/admin/admin-layout";
import FinanceDashboard from "@/pages/finance/dashboard";
import FinancePagamentos from "@/pages/finance/pagamentos";
import FinanceNovoPagamento from "@/pages/finance/novo-pagamento";
import SupplierDashboard from "@/pages/supplier";
import SupplierWallet from "@/pages/supplier/wallet";
import SupplierCreateProduct from "@/pages/supplier-create-product";
import ProductSuccess from "@/pages/product-success";
import InvestorSupplierLanding from "@/pages/investor-supplier";
import InvestmentDashboard from "@/pages/investment/dashboard";
import InvestmentsPage from "@/pages/investment/investments";
import { PoolDetailsPage } from "@/pages/investment/pool-details";
import PaymentsPage from "@/pages/investment/payments";
import AdminInvestmentDashboard from "@/pages/admin-investment/dashboard";
import AdminInvestmentPools from "@/pages/admin-investment/pools";
import AdminInvestmentInvestors from "@/pages/admin-investment/investors";
import NotFound from "@/pages/not-found";

interface OnboardingStatus {
  onboardingCompleted: boolean;
  onboardingSteps: {
    step1_operation: boolean;
    step2_shopify: boolean;
    step3_shipping: boolean;
    step4_ads: boolean;
    step5_sync: boolean;
  };
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: onboardingStatus, isLoading, error, refetch } = useQuery<OnboardingStatus>({
    queryKey: ['/api/user/onboarding-status'],
    enabled: !!user && isAuthenticated,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
    staleTime: 0,
    gcTime: 0,
    retry: 3,
    meta: {
      errorMessage: 'Failed to fetch onboarding status'
    }
  });

  // Debug the query response
  console.log('Query Debug:', {
    enabled: !!user && isAuthenticated,
    data: onboardingStatus,
    isLoading,
    error: error?.message,
    queryKey: ['/api/user/onboarding-status']
  });

  // Clear cache when user changes - force fresh data
  useEffect(() => {
    if (user && isAuthenticated) {
      queryClient.removeQueries({ 
        queryKey: ['/api/user/onboarding-status'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/user/onboarding-status'] 
      });
      // Force refetch with new user ID
      refetch();
    }
  }, [user?.id, isAuthenticated, refetch]);

  // Handle redirection
  useEffect(() => {
    const hasUser = !!user;
    const hasAuth = isAuthenticated;
    const hasData = !isLoading && onboardingStatus !== undefined;
    const skipOnboarding = user?.role === 'supplier' || user?.role === 'super_admin' || user?.role === 'admin_financeiro' || user?.role === 'investor' || user?.role === 'admin_investimento';
    const needsOnboarding = hasData && !onboardingStatus?.onboardingCompleted && !skipOnboarding;
    const notOnOnboardingPage = location !== '/onboarding';
    
    console.log('OnboardingGuard - Debug:', {
      hasUser,
      userId: user?.id,
      userRole: user?.role,
      isAuthenticated: hasAuth,
      isLoading,
      error: error?.message,
      hasData,
      onboardingStatus,
      onboardingCompleted: onboardingStatus?.onboardingCompleted,
      skipOnboarding,
      needsOnboarding,
      location,
      queryEnabled: !!user && isAuthenticated,
      shouldRedirect: hasUser && hasAuth && needsOnboarding && notOnOnboardingPage
    });

    // Se temos dados válidos e o usuário precisa fazer onboarding, mas não é supplier ou super_admin
    if (hasData && onboardingStatus && onboardingStatus.onboardingCompleted === false && !skipOnboarding) {
      console.log('🚨 ONBOARDING REQUIRED - User needs to complete onboarding');
    } else if (skipOnboarding) {
      console.log('✅ PRIVILEGED USER - Skipping onboarding (role:', user?.role, ')');
    }

    if (hasUser && hasAuth && needsOnboarding && notOnOnboardingPage) {
      console.log('OnboardingGuard - REDIRECTING NOW');
      setLocation('/onboarding');
    }
  }, [user, isAuthenticated, isLoading, onboardingStatus, error, location, setLocation]);

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

  // If we have user and onboarding data but not completed (and not a supplier), ensure we're on onboarding
  if (onboardingStatus && !onboardingStatus.onboardingCompleted && location !== '/onboarding' && user?.role !== 'supplier') {
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
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const isProductSeller = user?.role === 'product_seller';
  const isSuperAdmin = user?.role === 'super_admin';
  const isSupplier = user?.role === 'supplier';
  const isAdminFinanceiro = user?.role === 'admin_financeiro';
  const isInvestor = user?.role === 'investor';

  const isAdminInvestimento = user?.role === 'admin_investimento';

  // Auto-redirect users based on role
  useEffect(() => {
    if (isSuperAdmin && location === '/') {
      setLocation('/inside');
    } else if (isSupplier && location === '/') {
      setLocation('/supplier');
    } else if (isAdminFinanceiro && location === '/') {
      setLocation('/finance');
    } else if (isInvestor && location === '/') {
      setLocation('/investment');
    } else if (isAdminInvestimento && location === '/') {
      setLocation('/admin-investment');
    } else if (isAuthenticated && user?.role === 'user' && location === '/') {
      setLocation('/customer-support');
    }
  }, [isSuperAdmin, isSupplier, isAdminFinanceiro, isInvestor, isAdminInvestimento, isAuthenticated, user, location, setLocation]);

  return (
    <OnboardingGuard>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/onboarding" component={Onboarding} />
        
        {/* Admin Routes with Layout */}
        <Route path="/inside/orders" component={isSuperAdmin ? () => <AdminLayout><AdminOrders /></AdminLayout> : () => <NotFound />} />
        <Route path="/inside/users" component={isSuperAdmin ? () => <AdminLayout><AdminUsers /></AdminLayout> : () => <NotFound />} />
        <Route path="/inside/products" component={isSuperAdmin ? () => <AdminLayout><AdminProducts /></AdminLayout> : () => <NotFound />} />
        <Route path="/inside/stores" component={isSuperAdmin ? () => <AdminLayout><AdminStores /></AdminLayout> : () => <NotFound />} />
        <Route path="/inside/global" component={isSuperAdmin ? () => <AdminLayout><AdminGlobal /></AdminLayout> : () => <NotFound />} />
        <Route path="/inside/support" component={isSuperAdmin ? () => <AdminLayout><AdminSupport /></AdminLayout> : () => <NotFound />} />
        <Route path="/customer-support/settings" component={isAuthenticated ? CustomerSupportSettings : () => <NotFound />} />
        <Route path="/customer-support" component={isAuthenticated ? CustomerSupport : () => <NotFound />} />
        <Route path="/inside/settings" component={isSuperAdmin ? () => <AdminLayout><AdminSettings /></AdminLayout> : () => <NotFound />} />
        <Route path="/inside" component={isSuperAdmin ? () => <AdminLayout><AdminDashboard /></AdminLayout> : () => <NotFound />} />
        
        {/* Finance Routes */}
        <Route path="/finance/pagamentos/novo" component={isAdminFinanceiro ? FinanceNovoPagamento : () => <NotFound />} />
        <Route path="/finance/pagamentos" component={isAdminFinanceiro ? FinancePagamentos : () => <NotFound />} />
        <Route path="/finance" component={isAdminFinanceiro ? FinanceDashboard : () => <NotFound />} />
        
        {/* Supplier Routes */}
        <Route path="/supplier/wallet" component={isSupplier ? SupplierWallet : () => <NotFound />} />
        <Route path="/supplier/create-product" component={isSupplier ? SupplierCreateProduct : () => <NotFound />} />
        <Route path="/supplier/product-success" component={isSupplier ? ProductSuccess : () => <NotFound />} />
        <Route path="/supplier" component={isSupplier ? SupplierDashboard : () => <NotFound />} />
        
        {/* Investment Routes */}
        <Route path="/investment/pools/:slug" component={isInvestor ? PoolDetailsPage : () => <NotFound />} />
        <Route path="/investment/investments" component={isInvestor ? InvestmentsPage : () => <NotFound />} />
        <Route path="/investment/payments" component={isInvestor ? PaymentsPage : () => <NotFound />} />
        <Route path="/investment" component={isInvestor ? InvestmentDashboard : () => <NotFound />} />
        
        {/* Admin Investment Routes */}
        <Route path="/admin-investment/pools" component={isAdminInvestimento ? AdminInvestmentPools : () => <NotFound />} />
        <Route path="/admin-investment/investors" component={isAdminInvestimento ? AdminInvestmentInvestors : () => <NotFound />} />
        <Route path="/admin-investment" component={isAdminInvestimento ? AdminInvestmentDashboard : () => <NotFound />} />
        
        {/* Default Routes */}
        <Route path="/" component={isSupplier ? SupplierDashboard : isProductSeller ? SellerDashboard : Dashboard} />
        <Route path="/orders" component={Orders} />
        {!isProductSeller && <Route path="/analytics" component={Analytics} />}
        <Route path="/integrations" component={Integrations} />
        {!isProductSeller && <Route path="/ads" component={Ads} />}
        {!isProductSeller && <Route path="/creatives/:id" component={CreativeDetails} />}
        {!isProductSeller && <Route path="/creatives" component={Creatives} />}
        <Route path="/products" component={Products} />
        <Route path="/tools" component={Tools} />
        <Route path="/cost-calculator" component={CostCalculator} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </OnboardingGuard>
  );
}

import supplierLogo from "@assets/SUPPLIER_1756128445862.png";

function SupplierHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="supplier-header shadow-sm border-b border-gray-700">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={supplierLogo} 
              alt="Supplier Dashboard" 
              className="h-6"
            />
          </div>
          
          {/* User menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="text-sm font-medium text-gray-300">
                {user?.name}
              </div>
              {user?.role === 'supplier' && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 text-xs font-medium px-2 py-1 shadow-sm">
                  <Crown className="h-3 w-3 mr-1" />
                  Fornecedor
                </Badge>
              )}
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors hover:bg-gray-800 rounded-md"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardLayoutWithExchangeRate({ children }: { children: React.ReactNode }) {
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics", "30"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/metrics?period=30d");
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const exchangeRate = metrics?.exchangeRates?.EUR || 6.37;

  return (
    <DashboardLayout exchangeRate={exchangeRate}>
      {children}
    </DashboardLayout>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, checkAuth, user, login } = useAuth();
  const [location] = useLocation();
  const isSupplier = user?.role === 'supplier';
  const isAdminFinanceiro = user?.role === 'admin_financeiro';
  const isInvestor = user?.role === 'investor';
  const isAdminInvestimento = user?.role === 'admin_investimento';
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

  // Public routes
  if (location === '/investor-supplier') {
    return <InvestorSupplierLanding />;
  }
  
  if (location === '/login') {
    return <Login />;
  }
  
  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Authenticated routes
  return (
    <>
      {/* Fullscreen layout for onboarding and inside pages */}
      {(location === '/onboarding' || location.startsWith('/inside')) ? (
        <div className="min-h-screen">
          <Router />
        </div>
      ) : isSupplier ? (
        /* Supplier layout with header only */
        <div className="min-h-screen !bg-gray-900" style={{ backgroundColor: '#111827' }}>
          <SupplierHeader />
          <main className="p-6">
            <Router />
          </main>
        </div>
      ) : isAdminFinanceiro ? (
        /* Finance layout - fullscreen with own layout */
        <div className="min-h-screen">
          <Router />
        </div>
      ) : isInvestor ? (
        /* Investment layout - fullscreen with own layout */
        <div className="min-h-screen">
          <Router />
        </div>
      ) : isAdminInvestimento ? (
        /* Admin Investment layout - fullscreen with own layout */
        <div className="min-h-screen">
          <Router />
        </div>
      ) : (
        /* Regular dashboard layout with sidebar */
        <DashboardLayoutWithExchangeRate>
          <Router />
        </DashboardLayoutWithExchangeRate>
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
