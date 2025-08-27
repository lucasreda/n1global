import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  DollarSign,
  TrendingUp,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import financeLogo from "@assets/FINANCE_1756299410940.png";

interface FinanceLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { 
    href: "/finance", 
    label: "Dashboard", 
    icon: BarChart3 
  },
  { 
    href: "/finance/pagamentos", 
    label: "Pagamentos", 
    icon: CreditCard 
  },
  { 
    href: "/finance/configuracoes", 
    label: "Configurações", 
    icon: Settings 
  }
];

export function FinanceLayout({ children }: FinanceLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-black border-b border-gray-800 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <img 
            src={financeLogo} 
            alt="Finance Dashboard" 
            className="h-6"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Profile Picture or Initials */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span>
                {user?.firstName && user?.lastName 
                  ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                  : user?.email 
                    ? user.email.substring(0, 2).toUpperCase()
                    : 'U'
                }
              </span>
            )}
          </div>
          <span className="text-sm text-gray-300">{user?.email}</span>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-48 bg-black/60 border-r border-gray-800 flex flex-col pt-4 backdrop-blur-sm z-40">
        {/* Navigation */}
        <nav className="flex-1 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/finance" && location.startsWith(item.href));
              const isDisabled = item.href === "/finance/configuracoes";
              
              if (isDisabled) {
                return (
                  <div key={item.href}>
                    <div 
                      className="cursor-not-allowed transition-all duration-200 rounded-lg p-2 flex items-center gap-2 text-gray-500 opacity-50"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {item.label}
                      </span>
                    </div>
                  </div>
                );
              }
              
              return (
                <Link key={item.href} href={item.href}>
                  <div 
                    className={`cursor-pointer transition-all duration-200 rounded-lg p-2 flex items-center gap-2 ${
                      isActive
                        ? 'bg-gray-700/60 text-white border border-gray-600' 
                        : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                    }`}
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

        {/* User Info */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-3 text-gray-300">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span>
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                    : user?.email 
                      ? user.email.substring(0, 2).toUpperCase()
                      : 'U'
                  }
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-48 pt-16 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}