import { Calendar, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    return now.toLocaleDateString('pt-BR', options);
  };

  return (
    <header className="glassmorphism rounded-2xl p-6 mb-6 shadow-xl animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-page-title">
            {title}
          </h2>
          <p className="text-gray-300" data-testid="text-page-subtitle">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="glassmorphism-light rounded-xl px-4 py-2 flex items-center space-x-2">
            <Calendar className="text-blue-400" size={16} />
            <span className="text-sm text-gray-200" data-testid="text-current-date">
              {getCurrentDate()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="glassmorphism-light rounded-xl p-3 hover:bg-white/20 transition-all"
            data-testid="button-notifications"
          >
            <Bell className="text-gray-300" size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}
