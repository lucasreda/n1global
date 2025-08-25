import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface CalculatorFields {
  deliveryRate: number; // Taxa de entregado (%)
  salePrice: number; // Preço de venda
  confirmationRate: number; // Taxa de confirmação (%)
  shippingCost: number; // Custo do envio
  productCost: number; // Custo do produto
  cpa: number; // Custo por aquisição
  ordersPerDay: number; // Pedidos por dia
}

interface CalculationResults {
  dailyRevenue: number;
  dailyCosts: number;
  dailyProfit: number;
  profitMargin: number;
  monthlyProfit: number;
}

export default function CostCalculator() {
  const [fields, setFields] = useState<CalculatorFields>({
    deliveryRate: 85, // 85%
    salePrice: 29.90,
    confirmationRate: 70, // 70%
    shippingCost: 7.50,
    productCost: 12.50,
    cpa: 15.00,
    ordersPerDay: 50
  });

  const [results, setResults] = useState<CalculationResults>({
    dailyRevenue: 0,
    dailyCosts: 0,
    dailyProfit: 0,
    profitMargin: 0,
    monthlyProfit: 0
  });

  // Calcula lucro em tempo real sempre que os campos mudam
  useEffect(() => {
    const confirmedOrders = fields.ordersPerDay * (fields.confirmationRate / 100);
    const deliveredOrders = confirmedOrders * (fields.deliveryRate / 100);
    
    // Receita diária (apenas pedidos entregues geram receita)
    const dailyRevenue = deliveredOrders * fields.salePrice;
    
    // Custos diários
    const productCosts = confirmedOrders * fields.productCost; // Produto é enviado para pedidos confirmados
    const shippingCosts = confirmedOrders * fields.shippingCost; // Envio para pedidos confirmados
    const marketingCosts = fields.ordersPerDay * fields.cpa; // Marketing pago por todos os pedidos
    const dailyCosts = productCosts + shippingCosts + marketingCosts;
    
    // Lucro diário
    const dailyProfit = dailyRevenue - dailyCosts;
    
    // Margem de lucro (%)
    const profitMargin = dailyRevenue > 0 ? (dailyProfit / dailyRevenue) * 100 : 0;
    
    // Lucro mensal (considerando 30 dias)
    const monthlyProfit = dailyProfit * 30;

    setResults({
      dailyRevenue,
      dailyCosts,
      dailyProfit,
      profitMargin,
      monthlyProfit
    });
  }, [fields]);

  const handleFieldChange = (field: keyof CalculatorFields, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFields(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getProfitIcon = () => {
    if (results.profitMargin > 20) return <TrendingUp className="text-green-400" size={20} />;
    if (results.profitMargin > 0) return <Minus className="text-yellow-400" size={20} />;
    return <TrendingDown className="text-red-400" size={20} />;
  };

  const getProfitColor = () => {
    if (results.profitMargin > 20) return "text-green-400";
    if (results.profitMargin > 0) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Calculadora de Custos" 
          subtitle="Calcule margens de lucro e otimize sua operação em tempo real" 
        />
        <Link href="/tools">
          <Button variant="outline" size="sm" className="text-gray-400 hover:text-white">
            ← Voltar para Ferramentas
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campos de Entrada */}
        <Card className="glassmorphism border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Calculator className="text-blue-400" size={20} />
              <span>Parâmetros de Cálculo</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Ajuste os valores para calcular o lucro estimado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ordersPerDay" className="text-gray-300">Pedidos por Dia</Label>
                <Input
                  id="ordersPerDay"
                  type="number"
                  min="0"
                  step="1"
                  value={fields.ordersPerDay}
                  onChange={(e) => handleFieldChange('ordersPerDay', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-orders-per-day"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmationRate" className="text-gray-300">Taxa de Confirmação (%)</Label>
                <Input
                  id="confirmationRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={fields.confirmationRate}
                  onChange={(e) => handleFieldChange('confirmationRate', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-confirmation-rate"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryRate" className="text-gray-300">Taxa de Entregado (%)</Label>
                <Input
                  id="deliveryRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={fields.deliveryRate}
                  onChange={(e) => handleFieldChange('deliveryRate', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-delivery-rate"
                />
              </div>
              
              <div>
                <Label htmlFor="salePrice" className="text-gray-300">Preço de Venda (R$)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fields.salePrice}
                  onChange={(e) => handleFieldChange('salePrice', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-sale-price"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productCost" className="text-gray-300">Custo do Produto (R$)</Label>
                <Input
                  id="productCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fields.productCost}
                  onChange={(e) => handleFieldChange('productCost', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-product-cost"
                />
              </div>
              
              <div>
                <Label htmlFor="shippingCost" className="text-gray-300">Custo do Envio (R$)</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fields.shippingCost}
                  onChange={(e) => handleFieldChange('shippingCost', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-shipping-cost"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cpa" className="text-gray-300">CPA - Custo por Aquisição (R$)</Label>
              <Input
                id="cpa"
                type="number"
                min="0"
                step="0.01"
                value={fields.cpa}
                onChange={(e) => handleFieldChange('cpa', e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                data-testid="input-cpa"
              />
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="glassmorphism border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              {getProfitIcon()}
              <span>Resultados do Cálculo</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Lucro estimado baseado nos parâmetros informados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Margem de Lucro - Destaque Principal */}
            <div className="text-center p-4 glassmorphism-light rounded-xl">
              <div className="text-sm text-gray-400 mb-1">Margem de Lucro</div>
              <div className={`text-3xl font-bold ${getProfitColor()}`} data-testid="text-profit-margin">
                {formatPercentage(results.profitMargin)}
              </div>
            </div>

            {/* Métricas Diárias */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-xs text-blue-400 mb-1">Receita Diária</div>
                <div className="text-lg font-semibold text-white" data-testid="text-daily-revenue">
                  {formatCurrency(results.dailyRevenue)}
                </div>
              </div>
              
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-xs text-red-400 mb-1">Custos Diários</div>
                <div className="text-lg font-semibold text-white" data-testid="text-daily-costs">
                  {formatCurrency(results.dailyCosts)}
                </div>
              </div>
            </div>

            {/* Lucro Diário e Mensal */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 glassmorphism-light rounded-lg">
                <span className="text-gray-300">Lucro Diário:</span>
                <span className={`font-semibold ${getProfitColor()}`} data-testid="text-daily-profit">
                  {formatCurrency(results.dailyProfit)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glassmorphism-light rounded-lg">
                <span className="text-gray-300">Lucro Mensal:</span>
                <span className={`font-semibold ${getProfitColor()}`} data-testid="text-monthly-profit">
                  {formatCurrency(results.monthlyProfit)}
                </span>
              </div>
            </div>

            {/* Breakdown dos Pedidos */}
            <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
              <div className="text-sm text-gray-400 mb-3 font-medium">Breakdown dos Pedidos:</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Pedidos totais/dia:</span>
                  <span className="text-white">{fields.ordersPerDay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Pedidos confirmados:</span>
                  <span className="text-white">{Math.round(fields.ordersPerDay * (fields.confirmationRate / 100))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Pedidos entregues:</span>
                  <span className="text-white">{Math.round(fields.ordersPerDay * (fields.confirmationRate / 100) * (fields.deliveryRate / 100))}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}