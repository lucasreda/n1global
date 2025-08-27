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
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <img 
              src={logoImage} 
              alt="Inside Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Inside
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Link key={item.id} href={item.path}>
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    isActive(item.path)
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' 
                      : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="p-3 flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${
                      isActive(item.path)
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      isActive(item.path)
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="w-full justify-start text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
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
  );
}