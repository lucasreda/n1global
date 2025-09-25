
interface DashboardHeaderProps {
  title: string;
  subtitle: string | React.ReactNode;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {

  return (
    <header className="p-4 sm:p-6 mb-6 animate-fade-in">
      <div className="flex-1 min-w-0">
      </div>
    </header>
  );
}
