import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard,
  Users,
  Building2,
  ShoppingCart,
  Package,
  LogOut,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  
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

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-black border-b border-gray-800 flex items-center px-6 relative z-50">
        <img 
          src={logoImage} 
          alt="Inside Logo" 
          className="h-8 object-contain"
        />
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col pt-4">
          {/* Navigation */}
          <nav className="flex-1 px-3">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Link key={item.id} href={item.path}>
                  <div 
                    className={`cursor-pointer transition-all duration-200 rounded-lg p-2 flex items-center gap-2 ${
                      isActive(item.path)
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
          <div className="p-3 border-t border-gray-200 dark:border-gray-800">
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              size="sm"
              className="w-full justify-start text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 p-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="text-sm">Sair</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6 max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}