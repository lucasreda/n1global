import { Link, useLocation } from "wouter";
import { 
  Home, 
  Package, 
  BarChart3, 
  Plug, 
  Settings, 
  LogOut,
  TrendingUp,
  ShoppingCart,
  Target,
  Briefcase,
  ChevronDown,
  Plus,
  Wrench,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Store,
  Zap,
  User,
  Key
} from "lucide-react";
import logoImage from "@assets/Dashboard_1756440445659.png";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NewOperationDialog } from "./new-operation-dialog";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useOperationPermissions } from "@/hooks/use-operation-permissions";

const getNavigationForRole = (
  userRole: string, 
  operationPermissions: {
    canView: (module: 'dashboard' | 'orders' | 'products' | 'ads' | 'integrations' | 'settings' | 'team') => boolean;
    isOwner?: boolean;
    isAdmin?: boolean;
  } | null
) => {
  // All possible navigation items with their permission modules
  // Items marked with adminOnly: true are only visible to admins/owners
  const allNavigationItems = [
    { id: 'dashboard', name: "Dashboard", href: "/", icon: Home, permissionModule: 'dashboard' },
    { id: 'hub', name: "N1 Hub", href: "/hub", icon: Store, permissionModule: 'dashboard' }, // Hub uses dashboard permissions
    { id: 'orders', name: "Pedidos", href: "/orders", icon: Package, permissionModule: 'orders' },
    { id: 'analytics', name: "Análises", href: "/analytics", icon: BarChart3, adminOnly: true }, // Only for admins
    { id: 'ads', name: "Anúncios", href: "/ads", icon: Target, permissionModule: 'ads' },
    { id: 'creatives', name: "Criativos", href: "/creatives", icon: Sparkles, adminOnly: true }, // Only for admins
    { 
      id: 'funnels',
      name: "Funis de Venda", 
      icon: Zap,
      isDropdown: true,
      adminOnly: true, // Only for admins
      subItems: [
        { name: "Gerenciar Funis", href: "/funnels" },
        { name: "Preview & Validação", href: "/funnel-preview" }
      ]
    },
    { name: "Produtos", href: "/products", icon: ShoppingCart, permissionModule: 'products' },
    { 
      id: 'support',
      name: "Suporte", 
      icon: MessageSquare,
      isDropdown: true,
      adminOnly: true, // Only for admins
      subItems: [
        { name: "Suporte de Clientes", href: "/customer-support" },
        { name: "Configurações", href: "/customer-support/settings" }
      ]
    },
    { id: 'integrations', name: "Integrações", href: "/integrations", icon: Plug, permissionModule: 'integrations' },
    { id: 'tools', name: "Ferramentas", href: "/tools", icon: Wrench, adminOnly: true }, // Only for admins
    { name: "Configurações", href: "/settings", icon: Settings, permissionModule: 'settings' },
  ];

  // For super_admin and admin roles, show all items
  if (userRole === 'super_admin' || userRole === 'admin') {
    return allNavigationItems;
  }

  // For product_seller, show only basic navigation
  if (userRole === 'product_seller') {
    return allNavigationItems.filter(item => 
      !item.id || ['dashboard', 'hub', 'orders'].includes(item.id)
    );
  }

  // For regular users, filter by operation permissions
  if (!operationPermissions) {
    // If no operation permissions, show nothing (user might not have access to any operation)
    return [];
  }

  // Filter items based on operation permissions
  return allNavigationItems.filter(item => {
    // Admin-only items: only show for admins/owners
    if (item.adminOnly) {
      return operationPermissions?.isOwner || operationPermissions?.isAdmin || false;
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

export function Sidebar() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [showNewOperationDialog, setShowNewOperationDialog] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const { selectedOperation, operations, changeOperation, isDssOperation } = useCurrentOperation();
  const operationPermissions = useOperationPermissions();
  
  // Disabled debug logs
  // console.log("🔍 Sidebar Debug:", ...);
  
  // Use operation permissions if available, otherwise fallback to user permissions for backwards compatibility
  const navigation = getNavigationForRole(
    user?.role || 'user', 
    operationPermissions && !operationPermissions.isLoading ? operationPermissions : null
  );

  // Handle operation change
  const handleOperationChange = (operationId: string) => {
    changeOperation(operationId);
  };

  // Handle new operation created
  const handleOperationCreated = (operationId: string) => {
    // Invalidate operations query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    // Select the new operation
    changeOperation(operationId);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleDropdown = (itemName: string) => {
    setOpenDropdowns(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <nav className="h-full w-full rounded-lg border bg-card text-card-foreground shadow-sm p-4 sm:p-6 animate-slide-up flex flex-col">
      <div className="flex justify-start sm:justify-center mb-8">
        <img 
          src={logoImage} 
          alt="COD Dashboard Logo" 
          className="w-[120px] sm:w-[140px] h-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
            if (nextElement) {
              nextElement.style.display = 'block';
            }
          }}
        />
        <div className="text-xl font-bold text-white tracking-wider hidden">
          COD DASHBOARD
        </div>
      </div>

      {/* Operation Selector */}
      <div className="mb-6 p-3 rounded-lg border bg-card text-card-foreground shadow-sm" data-tour-id="operation-selector-section">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">Operação</span>
        </div>
        {operations.length > 0 ? (
          <Select value={selectedOperation} onValueChange={(value) => {
            if (value === "add-new") {
              setShowNewOperationDialog(true);
              return;
            }
            handleOperationChange(value);
          }}>
            <SelectTrigger className="w-full" data-testid="operation-selector">
              <SelectValue placeholder="Selecionar operação" />
            </SelectTrigger>
            <SelectContent>
              {operations.map((operation: any) => (
                <SelectItem key={operation.id} value={operation.id} data-testid={`operation-${operation.id}`} className="py-3 text-[14px]">
                  {operation.name}
                </SelectItem>
              ))}
              <SelectItem value="add-new" className="py-3 text-[14px]">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Nova</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Button 
            onClick={() => setShowNewOperationDialog(true)} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 animate-soft-bounce shadow-[0_0_20px_rgba(59,130,246,0.5),0_8px_32px_rgba(31,38,135,0.37)]" 
            data-testid="create-operation-button"
          >
            <Plus className="w-4 h-4 mr-2 text-white" />
            Criar Operação
          </Button>
        )}
      </div>

      <ul className="space-y-1 flex-1" data-testid="nav-menu">
        {navigation.map((item: any) => {
          const hasOperations = operations.length > 0;
          const isDashboard = item.name === "Dashboard";
          const isLocked = !isDashboard && !hasOperations;

          if (item.isDropdown) {
            const isDropdownOpen = openDropdowns.includes(item.name);
            const isAnySubItemActive = item.subItems?.some((subItem: any) => location === subItem.href);
            
            return (
              <li key={item.name}>
                <Collapsible open={isDropdownOpen} onOpenChange={() => !isLocked && toggleDropdown(item.name)}>
                  <CollapsibleTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center justify-between space-x-2.5 px-3 py-2 rounded-xl transition-all w-full",
                        isLocked 
                          ? "opacity-50 cursor-not-allowed text-gray-400"
                          : "cursor-pointer",
                        !isLocked && isAnySubItemActive
                          ? "text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30"
                          : !isLocked && "text-gray-300 hover:text-white hover:bg-white/10"
                      )}
                      data-testid={`nav-dropdown-${item.name.toLowerCase()}`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <item.icon size={15} className={isAnySubItemActive ? "text-blue-400" : "text-gray-400"} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <ChevronRight 
                        size={14} 
                        className={cn(
                          "transition-transform",
                          isDropdownOpen ? "rotate-90" : ""
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  {!isLocked && (
                    <CollapsibleContent className="space-y-1 mt-1">
                      {item.subItems?.map((subItem: any) => {
                        const isActive = location === subItem.href;
                        return (
                          <Link key={subItem.name} href={subItem.href}>
                            <div
                              className={cn(
                                "flex items-center space-x-2.5 px-3 py-2 ml-6 rounded-xl transition-all cursor-pointer",
                                isActive
                                  ? "text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30"
                                  : "text-gray-300 hover:text-white hover:bg-white/10"
                              )}
                              data-testid={`nav-sublink-${subItem.name.toLowerCase()}`}
                            >
                              <span className="font-medium text-sm">{subItem.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </li>
            );
          }

          const isActive = location === item.href;
          
          if (isLocked) {
            return (
              <li key={item.name}>
                <div
                  className={cn(
                    "flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all opacity-50 cursor-not-allowed text-gray-400"
                  )}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                >
                  <item.icon size={15} className="text-gray-400" />
                  <span className="font-medium">{item.name}</span>
                </div>
              </li>
            );
          }

          return (
            <li key={item.name}>
              <Link href={item.href}>
                <div
                  className={cn(
                    "flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer",
                    isActive
                      ? "text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  )}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                >
                  <item.icon size={15} className={isActive ? "text-blue-400" : "text-gray-400"} />
                  <span className="font-medium">{item.name}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pb-2">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 mt-3 sm:mt-6 cursor-pointer hover:bg-card/80 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 gradient-success rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-foreground" data-testid="text-user-initials">
                      {user ? getUserInitials(user.name) : "U"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white" data-testid="text-username">
                      {user?.name || "Usuário"}
                    </p>
                    <p className="text-xs text-gray-400" data-testid="text-user-role">
                      {user?.role === "admin" ? "Administrador" : user?.role === "product_seller" ? "Vendedor" : "Usuário"}
                    </p>
                  </div>
                  <div className="text-gray-400">
                    <User size={18} />
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side="top"
              sideOffset={8}
              className="w-[calc(100%-2rem)] min-w-[200px] mx-4"
            >
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {user?.email}
              </div>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => {
                  setLocation("/profile");
                }}
                data-testid="menu-profile"
              >
                <User className="mr-2 h-4 w-4" />
                Minha Conta
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
                onClick={logout}
                data-testid="menu-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* New Operation Dialog */}
      <NewOperationDialog
        open={showNewOperationDialog}
        onOpenChange={setShowNewOperationDialog}
        onOperationCreated={handleOperationCreated}
      />

    </nav>
  );
}
