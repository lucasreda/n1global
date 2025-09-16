import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard,
  Users,
  Building2,
  ShoppingCart,
  Package,
  LogOut,
  Globe,
  Settings,
  MessageSquare,
  Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@assets/INSIDE_1756100933599.png";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    path: '/inside' 
  },
  { 
    id: 'orders', 
    label: 'Pedidos', 
    icon: ShoppingCart, 
    path: '/inside/orders' 
  },
  { 
    id: 'stores', 
    label: 'Lojas', 
    icon: Building2, 
    path: '/inside/stores' 
  },
  { 
    id: 'users', 
    label: 'Usuários', 
    icon: Users, 
    path: '/inside/users' 
  },
  { 
    id: 'products', 
    label: 'Produtos', 
    icon: Package, 
    path: '/inside/products' 
  },
  { 
    id: 'global', 
    label: 'Global', 
    icon: Globe, 
    path: '/inside/global' 
  },
  { 
    id: 'support', 
    label: 'Suporte', 
    icon: MessageSquare, 
    path: '/inside/support' 
  },
  { 
    id: 'hub-control', 
    label: 'Hub Control', 
    icon: Monitor, 
    path: '/inside/hub-control' 
  },
  { 
    id: 'settings', 
    label: 'Configurações', 
    icon: Settings, 
    path: '/inside/settings' 
  }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

  const isActive = (path: string) => {
    if (path === '/inside') {
      return location === '/inside';
    }
    return location.startsWith(path);
  };

  // Filter menu items based on user permissions
  const getFilteredMenuItems = () => {
    if (!user) return [];
    
    // Super admin sees all items
    if (user.role === 'super_admin') {
      return menuItems;
    }
    
    // For other users, filter based on permissions
    const userPermissions = user.permissions || [];
    return menuItems.filter(item => userPermissions.includes(item.id));
  };

  return (
    <div className="h-screen bg-gradient-to-br from-black via-black to-gray-950 flex flex-col admin-layout">
      {/* Header */}
      <div className="h-16 bg-black border-b border-gray-700 flex items-center px-6 relative z-50">
        <img 
          src={logoImage} 
          alt="Inside Logo" 
          className="h-6 object-contain"
        />
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-black/60 border-r border-gray-800 flex flex-col pt-4 backdrop-blur-sm">
          {/* Navigation */}
          <nav className="flex-1 px-3">
            <div className="space-y-1">
              {getFilteredMenuItems().map((item) => (
                <Link key={item.id} href={item.path}>
                  <div 
                    className={`cursor-pointer transition-all duration-200 rounded-lg p-2 flex items-center gap-2 ${
                      isActive(item.path)
                        ? 'bg-gray-700/60 text-white border border-gray-600' 
                        : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {item.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-gray-700">
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              size="sm"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800/60 p-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="text-sm">Sair</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}