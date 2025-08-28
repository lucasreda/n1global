import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useLocation } from 'wouter';
import { Sidebar } from './sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // Close mobile menu when navigating to a new page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 z-40">
        <Sidebar />
      </div>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
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

      {/* Main Content */}
      <main className="w-full min-w-0 flex-1 lg:ml-64 p-3 sm:p-4 lg:p-6 pt-14 sm:pt-16 lg:pt-6 overflow-x-hidden">
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}