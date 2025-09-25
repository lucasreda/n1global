
interface DashboardHeaderProps {
  title: string;
  subtitle: string | React.ReactNode;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {

  return (
    <header className="animate-fade-in">
      <div className="flex-1 min-w-0">
      </div>
    </header>
  );
}
