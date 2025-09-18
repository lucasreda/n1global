
interface DashboardHeaderProps {
  title: string;
  subtitle: string | React.ReactNode;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {

  return (
    <header className="p-4 sm:p-6 mb-6 animate-fade-in">
      <div className="flex-1 min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2" data-testid="text-page-title">
          {title}
        </h2>
        <div className="text-sm sm:text-base text-gray-300" data-testid="text-page-subtitle">
          {subtitle}
        </div>
      </div>
    </header>
  );
}
