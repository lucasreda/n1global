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
    icon: Home 
  },
  { 
    href: "/finance/receitas", 
    label: "Receitas", 
    icon: DollarSign 
  },
  { 
    href: "/finance/custos", 
    label: "Custos", 
    icon: TrendingUp 
  },
  { 
    href: "/finance/relatorios", 
    label: "Relatórios", 
    icon: FileText 
  },
  { 
    href: "/finance/pagamentos", 
    label: "Pagamentos", 
    icon: CreditCard 
  },
  { 
    href: "/finance/analytics", 
    label: "Analytics", 
    icon: BarChart3 
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
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-48 border-r border-gray-800 z-40" style={{ backgroundColor: '#0f0f0f' }}>
        <nav className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/finance" && location.startsWith(item.href));
              
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <span
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:text-white hover:bg-gray-800"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
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