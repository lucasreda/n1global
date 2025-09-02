import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, BarChart3 } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/utils";

interface ChartsSectionProps {
  revenueData: any[];
  distributionData: { name: string; value: number; percentage: string; color: string; description: string }[];
  isLoading?: boolean;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function ChartsSection({ revenueData, distributionData, isLoading = false }: ChartsSectionProps) {
  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 animate-fade-in">
      {/* Revenue Chart */}
      <div className="w-full bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300 overflow-hidden" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid="chart-revenue">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-white">Receita por Período</h3>
          <div className="text-xs sm:text-sm text-gray-400">
            Dados sincronizados com período selecionado
          </div>
        </div>
        
        <div className="w-full h-40 sm:h-48 lg:h-64 overflow-hidden">
          {!isLoading && revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{fontSize: 11, fill: '#6B7280'}}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [formatCurrencyBRL(value), 'Receita']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-gradient rounded-xl flex items-center justify-center h-full">
              <div className="text-center">
                <BarChart3 className="mx-auto text-4xl text-blue-300 mb-3" size={48} />
                <p className="text-gray-300">{isLoading ? "Dados de receita carregando..." : "Nenhum dado de receita encontrado"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="w-full bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300 min-h-[320px] sm:min-h-[350px] lg:min-h-[400px] overflow-hidden" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid="chart-distribution">
        <div className="mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-white">Distribuição de Status</h3>
        </div>
        
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Chart Section */}
          <div className="flex justify-center w-full">
            <div className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={65}
                    innerRadius={30}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="none"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={entry.color}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                    formatter={(value, name) => [
                      `${value} pedidos`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center total */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                    {distributionData.reduce((sum, item) => sum + item.value, 0)}
                  </div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend Section */}
          <div className="w-full">
            <div className="space-y-3 sm:space-y-4">
              {distributionData.map((item) => (
                <div key={item.name} className="glassmorphism-light rounded-lg p-3 sm:p-4 transition-all hover:bg-white/10" data-testid={`distribution-${item.name.toLowerCase()}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-lg flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                      <div className="min-w-0 flex-1">
                        <span className="text-white font-medium text-sm sm:text-base block">{item.name}</span>
                        <div className="text-xs sm:text-sm text-gray-400 mt-1">{item.description}</div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="text-white font-bold text-lg sm:text-xl" data-testid={`percentage-${item.name.toLowerCase()}`}>
                        {item.percentage}%
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400">
                        {item.value} pedidos
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700/30 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all duration-500" 
                      style={{ 
                        backgroundColor: item.color, 
                        width: `${item.percentage}%`,
                        boxShadow: `0 0 12px ${item.color}50`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}