import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Wrench, Calculator, Database, FileText, Download, Upload, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Tools() {
  const tools = [
    {
      id: "cost-calculator",
      name: "Calculadora de Lucro COD",
      description: "Metodologia precisa para calcular o lucro da sua oferta",
      icon: Calculator,
      color: "blue",
      status: "active"
    },
    {
      id: "data-export",
      name: "Exportar Dados",
      description: "Exporte pedidos, produtos e relatórios para CSV/Excel",
      icon: Download,
      color: "green",
      status: "active"
    },
    {
      id: "data-import",
      name: "Importar Dados",
      description: "Importe produtos e dados em lote via CSV",
      icon: Upload,
      color: "purple",
      status: "coming-soon"
    },
    {
      id: "database-backup",
      name: "Backup de Dados",
      description: "Faça backup completo dos seus dados",
      icon: Database,
      color: "orange",
      status: "coming-soon"
    },
    {
      id: "report-generator",
      name: "Gerador de Relatórios",
      description: "Crie relatórios personalizados e automáticos",
      icon: FileText,
      color: "indigo",
      status: "coming-soon"
    },
    {
      id: "automation",
      name: "Automações",
      description: "Configure automações para tarefas repetitivas",
      icon: Zap,
      color: "yellow",
      status: "coming-soon"
    }
  ];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return { text: "Disponível", color: "text-green-400", bgColor: "bg-green-500/20" };
      case "coming-soon":
        return { text: "Em breve", color: "text-blue-400", bgColor: "bg-blue-500/20" };
      default:
        return { text: "Indisponível", color: "text-gray-400", bgColor: "bg-gray-500/20" };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-white" style={{fontSize: '22px'}}>Ferramentas</h1>
        <p className="text-gray-400 mt-1">Utilitários e ferramentas para otimizar sua operação</p>
      </div>
      
      {/* Grid de Ferramentas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const statusInfo = getStatusInfo(tool.status);
          const IconComponent = tool.icon;
          const isActive = tool.status === "active";
          
          return (
            <div 
              key={tool.id} 
              className={`glassmorphism rounded-2xl p-6 transition-all duration-300 border ${
                isActive 
                  ? 'hover:scale-[1.02] cursor-pointer border-gray-500/20 hover:border-gray-400/40' 
                  : 'opacity-60 border-gray-600/20 cursor-not-allowed'
              }`}
              data-testid={`tool-${tool.id}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-${tool.color}-500/20 rounded-xl flex items-center justify-center ${isActive && 'group-hover:scale-110'} transition-transform duration-300`}>
                  <IconComponent className={`text-${tool.color}-400 w-6 h-6`} />
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusInfo.text}
                </span>
              </div>
              
              <h3 className="text-white font-semibold mb-2">{tool.name}</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">{tool.description}</p>
              
              {isActive && tool.id === "cost-calculator" ? (
                <Link href="/cost-calculator">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                    data-testid={`button-${tool.id}`}
                  >
                    <Settings size={16} className="mr-2" />
                    Abrir
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 cursor-not-allowed"
                  disabled={true}
                  data-testid={`button-${tool.id}`}
                >
                  <Settings size={16} className="mr-2" />
                  Em Breve
                </Button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Seção de Status */}
      <div className="glassmorphism rounded-2xl p-6">
        <h4 className="text-white font-medium mb-4 flex items-center space-x-2">
          <Wrench className="text-blue-400" size={18} />
          <span>Status das Ferramentas</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {tools.filter(t => t.status === "active").length}
            </div>
            <div className="text-sm text-gray-400">Disponíveis</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {tools.filter(t => t.status === "coming-soon").length}
            </div>
            <div className="text-sm text-gray-400">Em Desenvolvimento</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {tools.length}
            </div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}