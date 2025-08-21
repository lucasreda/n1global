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
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Pedidos", href: "/orders", icon: Package },
  { name: "Produtos", href: "/products", icon: ShoppingCart },
  { name: "Análises", href: "/analytics", icon: BarChart3 },
  { name: "Anúncios", href: "/ads", icon: Target },
  { name: "Integrações", href: "/integrations", icon: Plug },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

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
          className="w-[200px] h-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling.style.display = 'block';
          }}
        />
        <div className="text-2xl font-bold text-white tracking-wider hidden">
          COD DASHBOARD
        </div>
      </div>

      <ul className="space-y-2" data-testid="nav-menu">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <li key={item.name}>
              <Link href={item.href}>
                <a
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all",
                    isActive
                      ? "text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  )}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                >
                  <item.icon size={18} className={isActive ? "text-blue-400" : "text-gray-400"} />
                  <span>{item.name}</span>
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
                {user?.role === "admin" ? "Administrador" : "Usuário"}
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
    </nav>
  );
}
