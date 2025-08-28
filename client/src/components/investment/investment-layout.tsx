import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  TrendingUp, 
  BarChart3, 
  CreditCard, 
  Bell, 
  Settings,
  Menu,
  X,
  LogOut,
  User,
  PiggyBank
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import investmentLogo from "@assets/Investment_1756400581219.png";

interface InvestmentLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/investment",
    exact: true
  },
  {
    icon: PiggyBank,
    label: "Meus Investimentos",
    href: "/investment/investments"
  },
  {
    icon: BarChart3,
    label: "Analytics",
    href: "/investment/analytics"
  },
  {
    icon: CreditCard,
    label: "Pagamentos",
    href: "/investment/payments"
  },
  {
    icon: Bell,
    label: "Notificações",
    href: "/investment/notifications"
  },
  {
    icon: Settings,
    label: "Configurações",
    href: "/investment/settings"
  }
];

export function InvestmentLayout({ children }: InvestmentLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const isActivePath = (href: string, exact?: boolean) => {
    if (exact) {
      return location === href;
    }
    return location.startsWith(href);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  };

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'IN';
  };

  return (
    <div className="min-h-screen bg-[#020817]">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-black border-b border-[#252525] z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <Link href="/investment">
              <div className="flex items-center cursor-pointer">
                <img 
                  src={investmentLogo}
                  alt="Investment Logo" 
                  className="h-8 object-contain"
                />
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {getUserInitials(user?.name, user?.email)}
              </span>
            </div>
            <span className="text-sm text-gray-300">{user?.email}</span>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`
          fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[#0f0f0f] border-r border-[#252525] z-40 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:h-[calc(100vh-4rem)]
          w-48
        `}>
          <div className="flex flex-col h-full">
            <nav className="flex-1 py-6">
              <div className="space-y-1 px-3">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.href, item.exact);
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors
                          ${isActive 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                          }
                        `}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        {item.label}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* User section at bottom */}
            <div className="border-t border-[#252525] p-3">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-[#252525] rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className={`
          flex-1 transition-all duration-300 ease-in-out
          md:ml-0
          ${sidebarOpen ? 'md:ml-48' : 'md:ml-48'}
        `}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}