import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Settings, CheckCircle, AlertCircle } from "lucide-react";

export default function Integrations() {
  const integrations = [
    {
      name: "Correios",
      status: "connected",
      description: "Integração ativa com rastreamento automático",
      icon: "📦",
    },
    {
      name: "Jadlog",
      status: "pending",
      description: "Aguardando configuração das credenciais",
      icon: "🚚",
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Integrações com Transportadoras" 
        subtitle="Configure e gerencie as integrações com parceiros de entrega" 
      />
      
      <div className="glassmorphism rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Transportadoras Disponíveis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <div key={integration.name} className="glassmorphism-light rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h4 className="text-white font-medium">{integration.name}</h4>
                    <p className="text-gray-400 text-sm">{integration.description}</p>
                  </div>
                </div>
                
                {integration.status === "connected" ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <AlertCircle className="text-yellow-400" size={20} />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  integration.status === "connected" 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {integration.status === "connected" ? "Conectado" : "Pendente"}
                </span>
                
                <button className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                  <Settings size={16} />
                  <span className="text-sm">Configurar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 p-4 glassmorphism-light rounded-xl">
          <h4 className="text-white font-medium mb-2">Configurações Futuras</h4>
          <p className="text-gray-400 text-sm">
            As integrações com as transportadoras serão implementadas nas próximas versões. 
            Isso incluirá rastreamento automático, cálculo de frete e notificações de status.
          </p>
        </div>
      </div>
    </div>
  );
}
