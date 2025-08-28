import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useLocation } from 'wouter';
import { Sidebar } from './sidebar';
import logoImage from '@assets/n1-lblue_1756418570079.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
  exchangeRate?: number;
}

export function DashboardLayout({ children, exchangeRate }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // Close mobile menu when navigating to a new page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-3 z-50">
        {/* Logo - Left */}
        <div className="flex-shrink-0">
          <img 
            src={logoImage} 
            alt="Logo" 
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Currency Badge + Menu Button - Right */}
        <div className="flex items-center space-x-2">
          {/* Currency Badge */}
          <div className="flex items-center space-x-2 bg-gray-900/30 border border-green-500/50 rounded-lg px-2 py-1">
            <span className="text-green-400 font-medium text-xs">
              € {exchangeRate ? exchangeRate.toFixed(2).replace('.', ',') : '6,40'}
            </span>
            <span className="text-gray-400 text-xs">BRL</span>
          </div>
          
          {/* Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="bg-gray-900/90 border-gray-700 text-white hover:bg-gray-800 w-10 h-10"
                data-testid="mobile-menu-button"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="left" 
              className="p-0 w-[85vw] sm:w-80 max-w-sm bg-card border-gray-700"
              data-testid="mobile-menu-sheet"
            >
              <div className="relative h-full">
                <Sidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-1 pt-14 lg:pt-0">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block fixed left-0 top-0 h-full w-64 z-40">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="w-full min-w-0 flex-1 lg:ml-64 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}