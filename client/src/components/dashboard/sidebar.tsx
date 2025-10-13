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
  Zap
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

const getNavigationForRole = (userRole: string, userPermissions: string[] = []) => {
  // All possible navigation items with their permission IDs
  const allNavigationItems = [
    { id: 'dashboard', name: "Dashboard", href: "/", icon: Home },
    { id: 'hub', name: "N1 Hub", href: "/hub", icon: Store },
    { id: 'orders', name: "Pedidos", href: "/orders", icon: Package },
    { id: 'analytics', name: "Análises", href: "/analytics", icon: BarChart3 },
    { id: 'ads', name: "Anúncios", href: "/ads", icon: Target },
    { id: 'creatives', name: "Criativos", href: "/creatives", icon: Sparkles },
    { 
      id: 'funnels',
      name: "Funis de Venda", 
      icon: Zap,
      isDropdown: true,
      subItems: [
        { name: "Gerenciar Funis", href: "/funnels" },
        { name: "Preview & Validação", href: "/funnel-preview" }
      ]
    },
    { name: "Produtos", href: "/products", icon: ShoppingCart }, // Always visible
    { 
      id: 'support',
      name: "Suporte", 
      icon: MessageSquare,
      isDropdown: true,
      subItems: [
        { name: "Suporte de Clientes", href: "/customer-support" },
        { name: "Configurações", href: "/customer-support/settings" }
      ]
    },
    { id: 'integrations', name: "Integrações", href: "/integrations", icon: Plug },
    { id: 'tools', name: "Ferramentas", href: "/tools", icon: Wrench },
    { name: "Configurações", href: "/settings", icon: Settings }, // Always visible
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

  // For regular users, filter by permissions
  return allNavigationItems.filter(item => 
    !item.id || userPermissions.includes(item.id)
  );
};

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [showNewOperationDialog, setShowNewOperationDialog] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const { selectedOperation, operations, changeOperation, isDssOperation } = useCurrentOperation();
  
  // Disabled debug logs
  // console.log("🔍 Sidebar Debug:", ...);
  
  const navigation = getNavigationForRole(user?.role || 'user', user?.permissions || []);

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
            className="w-full" 
            variant="outline"
            data-testid="create-operation-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Operação
          </Button>
        )}
      </div>

      <ul className="space-y-1 flex-1" data-testid="nav-menu">
        {navigation.map((item: any) => {
          if (item.isDropdown) {
            const isDropdownOpen = openDropdowns.includes(item.name);
            const isAnySubItemActive = item.subItems?.some((subItem: any) => location === subItem.href);
            
            return (
              <li key={item.name}>
                <Collapsible open={isDropdownOpen} onOpenChange={() => toggleDropdown(item.name)}>
                  <CollapsibleTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center justify-between space-x-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer w-full",
                        isAnySubItemActive
                          ? "text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
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
                </Collapsible>
              </li>
            );
          }

          const isActive = location === item.href;
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
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 mt-3 sm:mt-6">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-400 hover:text-red-400 transition-colors p-2 h-auto"
              data-testid="button-logout"
            >
              <LogOut size={16} />
            </Button>
          </div>
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
