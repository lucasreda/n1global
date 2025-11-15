import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, FileText, Wallet } from "lucide-react";

interface SupplierLayoutProps {
  children: ReactNode;
  activeSection?: 'dashboard' | 'contracts' | 'wallet';
}

export function SupplierLayout({ children, activeSection }: SupplierLayoutProps) {
  const [, setLocation] = useLocation();

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      path: '/supplier',
      active: activeSection === 'dashboard'
    },
    { 
      id: 'contracts', 
      label: 'Contratos', 
      icon: FileText,
      path: '/supplier#contracts',
      active: activeSection === 'contracts'
    },
    { 
      id: 'wallet', 
      label: 'Carteira', 
      icon: Wallet,
      path: '/supplier/wallet',
      active: activeSection === 'wallet'
    }
  ];

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.id === 'wallet') {
      setLocation('/supplier/wallet');
    } else if (item.id === 'contracts') {
      setLocation('/supplier#contracts');
      // For contracts, we need to trigger the section change in the parent component
      window.dispatchEvent(new CustomEvent('supplierSectionChange', { detail: 'contracts' }));
    } else {
      setLocation('/supplier');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex gap-4">
        {/* Sidebar Menu */}
        <div className="flex-shrink-0 w-24">
          <div className="grid grid-cols-1 gap-2">
            {menuItems.map((item) => (
              <Card 
                key={item.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  item.active 
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
                onClick={() => handleMenuClick(item)}
                data-testid={`menu-${item.id}`}
              >
                <CardContent className="p-2 text-center">
                  <item.icon className={`h-5 w-5 mx-auto mb-1.5 ${
                    item.active 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                  <h3 className={`text-xs font-medium ${
                    item.active 
                      ? 'text-blue-900 dark:text-blue-100' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {item.label}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}