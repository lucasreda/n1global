import { Link, useLocation } from "wouter";
import { Home, Package, Target, BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Pedidos", href: "/orders", icon: Package },
  { name: "Anúncios", href: "/ads", icon: Target },
  { name: "Criativos", href: "/creatives", icon: Sparkles },
  { name: "Análises", href: "/analytics", icon: BarChart3 },
];

export function MobileBottomNav() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-gray-700/50 shadow-sm">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg min-w-0 flex-1 transition-all duration-200",
                active
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
              )}
              data-testid={`mobile-nav-${item.name.toLowerCase()}`}
            >
              <IconComponent className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium truncate">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}