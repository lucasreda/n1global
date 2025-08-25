import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, BarChart3 } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/utils";

interface ChartsSectionProps {
  revenueData: any[];
  distributionData: { name: string; value: number; percentage: string; color: string }[];
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Revenue Chart */}
      <div className="glassmorphism rounded-2xl p-6" data-testid="chart-revenue">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Receita por Período</h3>
          <Select defaultValue="7days">
            <SelectTrigger className="glassmorphism-light border-0 w-40 text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glassmorphism border-0">
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="h-64">
          {!isLoading && revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => formatCurrencyBRL(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => [formatCurrencyBRL(value), 'Receita']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
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
      <div className="glassmorphism rounded-2xl p-8 min-h-[400px]" data-testid="chart-distribution">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-semibold text-white">Distribuição de Status</h3>
          <Button 
            variant="ghost"
            size="sm"
            className="glassmorphism-light rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/20 transition-all"
            data-testid="button-export-chart"
          >
            <Download className="mr-2" size={16} />
            Exportar
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          {/* Chart Section */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="w-72 h-72 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    innerRadius={45}
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
                  <div className="text-2xl font-bold text-white">
                    {distributionData.reduce((sum, item) => sum + item.value, 0)}
                  </div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend Section */}
          <div className="lg:col-span-3">
            <div className="space-y-5">
              {distributionData.map((item) => (
                <div key={item.name} className="glassmorphism-light rounded-lg p-4 transition-all hover:bg-white/10" data-testid={`distribution-${item.name.toLowerCase()}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="w-5 h-5 rounded-full shadow-lg flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                      <div className="min-w-0 flex-1">
                        <span className="text-white font-medium text-base block">{item.name}</span>
                        <div className="text-sm text-gray-400 mt-1">{item.description}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-white font-bold text-xl" data-testid={`percentage-${item.name.toLowerCase()}`}>
                        {item.percentage}%
                      </div>
                      <div className="text-sm text-gray-400">
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