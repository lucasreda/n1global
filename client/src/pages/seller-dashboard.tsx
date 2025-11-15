import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Package, TrendingUp, Users, Clock, CheckCircle, XCircle, Truck, AlertCircle } from "lucide-react";

export default function SellerDashboard() {
  const [dateFilter, setDateFilter] = useState("current_month");

  // Auto-sync on page load (similar to main dashboard)
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        console.log('🔄 Verificando necessidade de auto-sync da transportadora...');
        const response = await authenticatedApiRequest("GET", "/api/sync/auto");
        const result = await response.json();
        
        if (result.executed) {
          console.log('✅ Auto-sync da transportadora executado:', result.reason);
          // Refresh data after auto-sync
          window.location.reload();
        } else {
          console.log('ℹ️ Auto-sync não necessário:', result.reason);
        }
      } catch (error) {
        console.error('❌ Erro no auto-sync da transportadora:', error);
      }
    };

    performAutoSync();
  }, []); 

  // Fetch dashboard metrics (without marketing and profit data)
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics", dateFilter, "seller"],
    queryFn: async () => {
      const period = dateFilter === '1' ? '1d' : dateFilter === '7' ? '7d' : dateFilter === '30' ? '30d' : dateFilter === '90' ? '90d' : dateFilter === 'current_month' ? 'current_month' : 'current_month';
      const response = await authenticatedApiRequest("GET", `/api/dashboard/metrics?period=${period}`);
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Fetch revenue chart data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/dashboard/revenue-chart", dateFilter, "seller"],
    queryFn: async () => {
      const period = dateFilter === '1' ? '1d' : dateFilter === '7' ? '7d' : dateFilter === '30' ? '30d' : dateFilter === '90' ? '90d' : dateFilter === 'current_month' ? 'current_month' : 'current_month';
      const response = await authenticatedApiRequest("GET", `/api/dashboard/revenue-chart?period=${period}`);
      return response.json();
    },
  });

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 glassmorphism" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 glassmorphism" />
          <Skeleton className="h-80 glassmorphism" />
        </div>
      </div>
    );
  }

  const {
    totalOrders = 0,
    deliveredOrders = 0,
    confirmedOrders = 0,
    shippedOrders = 0,
    pendingOrders = 0,
    cancelledOrders = 0,
    returnedOrders = 0,
    totalRevenue = 0,
    deliveryRate = 0,
    averageOrderValue = 0,
    exchangeRates
  } = metrics || {};

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header with Exchange Rate and Date Filter */}
      <div className="flex justify-between items-center">
        {/* Euro Exchange Rate */}
        <div className="flex items-center space-x-2 bg-gray-900/30 border border-green-500/50 rounded-lg px-3 py-2">
          <span className="text-green-400 font-medium text-sm">
            € {exchangeRates?.EUR ? (exchangeRates.EUR).toFixed(2).replace('.', ',') : '6,40'}
          </span>
          <span className="text-gray-400 text-xs">BRL</span>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2 bg-gray-900/30 border border-gray-700/50 rounded-lg px-3 py-2">
          <Calendar className="text-gray-400" size={16} />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-36 bg-transparent border-0 text-gray-300 text-sm h-auto p-0">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="glassmorphism border-gray-600">
              <SelectItem value="current_month">Este Mês</SelectItem>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">3 meses</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Stats Cards - Orders Focused */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <div className="glassmorphism rounded-xl p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 hover:scale-105 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Receita Total</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</h3>
              <p className="text-blue-400 text-xs mt-1">Apenas pedidos entregues</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="text-blue-400" size={24} />
            </div>
          </div>
        </div>

        {/* Total Orders Card */}
        <div className="glassmorphism rounded-xl p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 hover:scale-105 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Total Pedidos</p>
              <h3 className="text-2xl font-bold text-white">{totalOrders.toLocaleString()}</h3>
              <p className="text-purple-400 text-xs mt-1">Todos os status</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Package className="text-purple-400" size={24} />
            </div>
          </div>
        </div>

        {/* Delivered Orders Card */}
        <div className="glassmorphism rounded-xl p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 hover:scale-105 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Entregues</p>
              <h3 className="text-2xl font-bold text-white">{deliveredOrders.toLocaleString()}</h3>
              <p className="text-green-400 text-xs mt-1">{deliveryRate.toFixed(1)}% do total</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </div>
        </div>

        {/* Average Order Value Card */}
        <div className="glassmorphism rounded-xl p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 hover:scale-105 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Ticket Médio</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(averageOrderValue)}</h3>
              <p className="text-yellow-400 text-xs mt-1">Por pedido pago</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users className="text-yellow-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Confirmed Orders */}
        <div className="glassmorphism rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-blue-400" size={20} />
            <span className="text-2xl font-bold text-white">{confirmedOrders}</span>
          </div>
          <p className="text-gray-400 text-sm">Confirmados</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div className="bg-blue-400 h-2 rounded-full" style={{width: `${totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0}%`}}></div>
          </div>
        </div>

        {/* Shipped Orders */}
        <div className="glassmorphism rounded-lg p-4 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <Truck className="text-cyan-400" size={20} />
            <span className="text-2xl font-bold text-white">{shippedOrders}</span>
          </div>
          <p className="text-gray-400 text-sm">Enviados</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div className="bg-cyan-400 h-2 rounded-full" style={{width: `${totalOrders > 0 ? (shippedOrders / totalOrders) * 100 : 0}%`}}></div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="glassmorphism rounded-lg p-4 border border-orange-500/20">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="text-orange-400" size={20} />
            <span className="text-2xl font-bold text-white">{pendingOrders}</span>
          </div>
          <p className="text-gray-400 text-sm">Pendentes</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div className="bg-orange-400 h-2 rounded-full" style={{width: `${totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0}%`}}></div>
          </div>
        </div>

        {/* Cancelled Orders */}
        <div className="glassmorphism rounded-lg p-4 border border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="text-red-400" size={20} />
            <span className="text-2xl font-bold text-white">{cancelledOrders + returnedOrders}</span>
          </div>
          <p className="text-gray-400 text-sm">Cancelados</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div className="bg-red-400 h-2 rounded-full" style={{width: `${totalOrders > 0 ? ((cancelledOrders + returnedOrders) / totalOrders) * 100 : 0}%`}}></div>
          </div>
        </div>
      </div>

      {/* Orders Information Section */}
      <div className="glassmorphism rounded-2xl p-6 bg-gradient-to-br from-gray-500/10 to-slate-500/5 border border-gray-500/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Package className="mr-3 text-gray-400" size={24} />
            Informações dos Pedidos
          </h3>
          <div className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium">
            Dados da Transportadora
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-300 mb-2">
              {deliveryRate.toFixed(1)}%
            </div>
            <div className="text-lg text-gray-400 mb-1">
              Taxa de Entrega
            </div>
            <div className="text-sm text-gray-500">Performance de entregas</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-300 mb-2">
              {formatCurrency(averageOrderValue)}
            </div>
            <div className="text-lg text-gray-400 mb-1">
              Ticket Médio
            </div>
            <div className="text-sm text-gray-500">Valor por pedido entregue</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-300 mb-2">
              {totalOrders - deliveredOrders - cancelledOrders - returnedOrders}
            </div>
            <div className="text-lg text-gray-400 mb-1">
              Em Processamento
            </div>
            <div className="text-sm text-gray-500">Aguardando entrega</div>
          </div>
        </div>
      </div>
    </div>
  );
}