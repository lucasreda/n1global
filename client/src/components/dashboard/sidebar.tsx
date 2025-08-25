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
    <nav className="fixed left-0 top-0 h-full w-64 glassmorphism p-6 z-40 animate-slide-up">
      <div className="flex justify-center mb-8">
        <img 
          src="/logo.png" 
          alt="COD Dashboard Logo" 
          className="w-[140px] h-auto object-contain"
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
      {operations.length > 0 && (
        <div className="mb-6 p-3 glassmorphism rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60 font-medium">Operação</span>
          </div>
          <Select value={selectedOperation} onValueChange={(value) => {
            if (value === "add-new") {
              setShowNewOperationDialog(true);
              return;
            }
            handleOperationChange(value);
          }}>
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
              <SelectValue placeholder="Selecionar operação" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {operations.map((operation: any) => (
                <SelectItem 
                  key={operation.id} 
                  value={operation.id}
                  className="text-white hover:bg-gray-800"
                >
                  {operation.name}
                </SelectItem>
              ))}
              {/* Separador visual */}
              <div className="border-t border-gray-700 my-1" />
              {/* Botão Adicionar Nova */}
              <SelectItem 
                value="add-new"
                className="text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Nova</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <ul className="space-y-1" data-testid="nav-menu">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <li key={item.name}>
              <Link href={item.href}>
                <a
                  className={cn(
                    "flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all",
                    isActive
                      ? "text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  )}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                >
                  <item.icon size={15} className={isActive ? "text-blue-400" : "text-gray-400"} />
                  <span className="font-medium">{item.name}</span>
                </a>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="glassmorphism-light rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 gradient-success rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white" data-testid="text-user-initials">
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
