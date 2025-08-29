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
  Wrench
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
import { NewOperationDialog } from "./new-operation-dialog";
import { useCurrentOperation } from "@/hooks/use-current-operation";

const getNavigationForRole = (userRole: string) => {
  const baseNavigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Pedidos", href: "/orders", icon: Package },
    { name: "Produtos", href: "/products", icon: ShoppingCart },
    { name: "Integrações", href: "/integrations", icon: Plug },
    { name: "Ferramentas", href: "/tools", icon: Wrench },
    { name: "Configurações", href: "/settings", icon: Settings },
  ];

  // Add restricted pages only for admin/user roles
  if (userRole !== 'product_seller') {
    baseNavigation.splice(3, 0, { name: "Análises", href: "/analytics", icon: BarChart3 });
    baseNavigation.splice(4, 0, { name: "Anúncios", href: "/ads", icon: Target });
  }

  return baseNavigation;
};

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [showNewOperationDialog, setShowNewOperationDialog] = useState(false);
  const { selectedOperation, operations, changeOperation, isDssOperation } = useCurrentOperation();
  
  // Disabled debug logs
  // console.log("🔍 Sidebar Debug:", ...);
  
  const navigation = getNavigationForRole(user?.role || 'user');

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

  return (
    <nav className="h-full w-full rounded-lg border bg-card text-card-foreground shadow-sm p-4 sm:p-6 animate-slide-up flex flex-col">
      <div className="flex justify-start sm:justify-center mb-8">
        <img 
          src={logoImage} 
          alt="COD Dashboard Logo" 
          className="w-[110px] h-auto object-contain"
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
      <div className="mb-6 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
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
                <SelectItem key={operation.id} value={operation.id} data-testid={`operation-${operation.id}`}>
                  {operation.name}
                </SelectItem>
              ))}
              <SelectItem value="add-new">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Nova</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="p-3 text-sm text-muted-foreground border rounded-md" data-testid="no-operations">
            Carregando operações...
          </div>
        )}
      </div>

      <ul className="space-y-1 flex-1" data-testid="nav-menu">
        {navigation.map((item) => {
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
