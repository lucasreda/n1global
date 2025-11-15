import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, BarChart3 } from "lucide-react";
import { formatOperationCurrency } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

interface ChartsSectionProps {
  revenueData: any[];
  distributionData: { name: string; value: number; percentage: string; color: string; description: string }[];
  isLoading?: boolean;
  currency?: string;
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

export function ChartsSection({ revenueData, distributionData, isLoading = false, currency = "EUR" }: ChartsSectionProps) {
  const { t, currentLanguage } = useTranslation();
  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 animate-fade-in">
      {/* Revenue Chart */}
      <div className="w-full bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300 overflow-hidden" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid="chart-revenue">
        <div className="mb-4 sm:mb-6">
          <h3 className="text-lg font-semibold text-white">{t('dashboard.revenueByPeriod')}</h3>
        </div>
        
        <div className="w-full h-40 sm:h-48 lg:h-64 overflow-hidden">
          {!isLoading && revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(74, 222, 128, 0.5)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [formatOperationCurrency(value, currency), 'Receita']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, stroke: '#10B981', strokeWidth: 1, fill: '#10B981' }}
                />
              </LineChart>
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
      <div className="w-full bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300 overflow-hidden flex flex-col" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid="chart-distribution">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">{t('dashboard.statusDistribution')}</h3>
        </div>
        
        <div className="flex gap-4 items-center justify-center flex-1">
          {/* Chart Section */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 sm:w-36 sm:h-36 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={50}
                    innerRadius={25}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="none"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={entry.color}
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(value, name) => [
                      `${value} ${t('dashboard.orders')}`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center total */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-sm font-bold text-white">
                    {distributionData.reduce((sum, item) => sum + item.value, 0)}
                  </div>
                  <div className="text-xs text-gray-400">{t('dashboard.total')}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend Section */}
          <div className="flex-1 min-w-0">
            <div className="space-y-2">
              {distributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10 transition-all" data-testid={`distribution-${item.name.toLowerCase()}`}>
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                    <span className="text-white text-sm font-medium truncate">{item.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-white font-semibold text-sm" data-testid={`percentage-${item.name.toLowerCase()}`}>
                      {item.percentage}%
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.value}
                    </div>
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