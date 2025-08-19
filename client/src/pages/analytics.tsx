import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function Analytics() {
  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Análises Avançadas" 
        subtitle="Relatórios detalhados e insights sobre performance" 
      />
      
      <div className="glassmorphism rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Relatórios e Gráficos</h3>
        <p className="text-gray-300">
          Esta seção conterá análises avançadas, relatórios de performance, 
          gráficos de tendências e insights detalhados sobre o desempenho dos pedidos COD.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="glassmorphism-light rounded-xl p-4">
            <h4 className="text-white font-medium mb-2">Análise de Conversão</h4>
            <p className="text-gray-400 text-sm">Taxa de conversão por região</p>
          </div>
          <div className="glassmorphism-light rounded-xl p-4">
            <h4 className="text-white font-medium mb-2">Performance por Transportadora</h4>
            <p className="text-gray-400 text-sm">Comparativo de eficiência</p>
          </div>
          <div className="glassmorphism-light rounded-xl p-4">
            <h4 className="text-white font-medium mb-2">Análise Temporal</h4>
            <p className="text-gray-400 text-sm">Tendências por período</p>
          </div>
        </div>
      </div>
    </div>
  );
}
