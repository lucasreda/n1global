import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard,
  Link2,
  Package,
  TrendingUp,
  DollarSign,
  Bell,
  LogOut,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import affiliateLogoUrl from "@assets/affiliate-logo_1759699339818.png";

interface AffiliateLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { 
    href: "/affiliate", 
    label: "Visão Geral", 
    icon: LayoutDashboard 
  },
  { 
    href: "/affiliate/marketplace", 
    label: "Marketplace", 
    icon: ShoppingBag 
  },
  { 
    href: "/affiliate/links", 
    label: "Links de Rastreamento", 
    icon: Link2 
  },
  { 
    href: "/affiliate/products", 
    label: "Produtos", 
    icon: Package 
  },
  { 
    href: "/affiliate/analytics", 
    label: "Analytics", 
    icon: TrendingUp 
  },
  { 
    href: "/affiliate/payments", 
    label: "Pagamentos", 
    icon: DollarSign 
  },
  { 
    href: "/affiliate/notifications", 
    label: "Notificações", 
    icon: Bell 
  },
];

export function AffiliateLayout({ children }: AffiliateLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-black border-b border-gray-800 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <img 
            src={affiliateLogoUrl} 
            alt="Logo" 
            className="h-[22px] object-contain"
          />
        </div>
        
        <div className="hidden md:flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            <span>
              {user?.email 
                ? user.email.substring(0, 2).toUpperCase()
                : 'A'
              }
            </span>
          </div>
          <span className="text-sm text-gray-300">{user?.email}</span>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-56 bg-black/60 border-r border-gray-800 flex flex-col pt-4 backdrop-blur-sm z-40">
        {/* Navigation */}
        <nav className="flex-1 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/affiliate" && location.startsWith(item.href));
              
              return (
                <Link key={item.href} href={item.href}>
                  <div 
                    className={`cursor-pointer transition-all duration-200 rounded-lg p-2 flex items-center gap-2 ${
                      isActive
                        ? 'bg-gray-700/60 text-white border border-gray-600' 
                        : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800/60 p-2 rounded-lg flex items-center gap-2 text-sm transition-all duration-200"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-56 pt-16 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
