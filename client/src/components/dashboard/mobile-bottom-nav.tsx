import { Link, useLocation } from "wouter";
import { Home, Package, Target, BarChart3, Sparkles, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useOperationPermissions } from "@/hooks/use-operation-permissions";

const getAllNavigationItems = () => [
  { id: 'dashboard', name: "Dashboard", href: "/", icon: Home, permissionModule: 'dashboard' },
  { id: 'hub', name: "Hub", href: "/hub", icon: Store, permissionModule: 'dashboard' },
  { id: 'orders', name: "Pedidos", href: "/orders", icon: Package, permissionModule: 'orders' },
  { id: 'ads', name: "Anúncios", href: "/ads", icon: Target, permissionModule: 'ads' },
  { id: 'analytics', name: "Análises", href: "/analytics", icon: BarChart3, adminOnly: true },
];

const getFilteredNavigationItems = (
  userRole: string, 
  operationPermissions: {
    canView: (module: 'dashboard' | 'orders' | 'products' | 'ads' | 'integrations' | 'settings' | 'team') => boolean;
    isOwner?: boolean;
    isAdmin?: boolean;
  } | null
) => {
  const allItems = getAllNavigationItems();
  
  // For super_admin and admin roles, show all items
  if (userRole === 'super_admin' || userRole === 'admin') {
    return allItems;
  }

  // For product_seller, show only basic navigation
  if (userRole === 'product_seller') {
    return allItems.filter(item => ['dashboard', 'hub', 'orders'].includes(item.id));
  }

  // For regular users, filter by operation permissions
  if (!operationPermissions) {
    return [];
  }

  return allItems.filter(item => {
    // Admin-only items: only show for admins/owners
    if (item.adminOnly) {
      return operationPermissions.isOwner || operationPermissions.isAdmin || false;
    }
    
    // Items without permissionModule should not appear for non-admin users
    if (!item.permissionModule) {
      return false;
    }
    
    // Check if user has view permission for this module
    const module = item.permissionModule as 'dashboard' | 'orders' | 'products' | 'ads' | 'integrations' | 'settings' | 'team';
    return operationPermissions.canView(module);
  });
};

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const operationPermissions = useOperationPermissions();
  
  const navigationItems = getFilteredNavigationItems(
    user?.role || 'user', 
    operationPermissions && !operationPermissions.isLoading ? operationPermissions : null
  );

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-gray-700/50 shadow-sm">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg min-w-0 flex-1 transition-all duration-200",
                active
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
              )}
              data-testid={`mobile-nav-${item.name.toLowerCase()}`}
            >
              <IconComponent className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium truncate">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}