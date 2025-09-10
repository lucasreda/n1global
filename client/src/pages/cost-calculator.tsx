import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Truck, 
  Target,
  DollarSign,
  Percent,
  ArrowRight,
  Info,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

interface CalculatorFields {
  deliveryRate: number;
  salePrice: number;
  confirmationRate: number;
  shippingCost: number;
  productCost: number;
  cpa: number;
  ordersPerDay: number;
  currency: string;
  insurance: number;
  storage: number;
  cpaOnConfirmed: boolean;
  returnCost: number; // Custo adicional por devolução (logística reversa)
  platformFee: number; // Taxa da plataforma/gateway (%)
}

interface CalculationResults {
  dailyRevenue: number;
  dailyCosts: number;
  dailyProfit: number;
  profitMargin: number;
  monthlyProfit: number;
  grossProfit: number;
  totalCostWithoutMarketing: number;
  netRevenue: number; // Receita líquida após devoluções
  marketingCosts: number;
  unitProfit: number; // Lucro por unidade
  breakEvenPoint: number; // Ponto de equilíbrio
  confirmedOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
}

interface ConvertedResults {
  dailyRevenueBRL: number;
  dailyCostsBRL: number;
  dailyProfitBRL: number;
  monthlyProfitBRL: number;
}

export default function CostCalculator() {
  const [fields, setFields] = useState<CalculatorFields>({
    deliveryRate: 55, // Alinhado com a planilha
    salePrice: 70.00, // Preço da planilha em EUR
    confirmationRate: 98, // Taxa da planilha
    shippingCost: 7.50,
    productCost: 12.50, // Custo da planilha
    cpa: 12.00, // CPA da planilha
    ordersPerDay: 32, // Volume diário da planilha
    currency: 'EUR',
    insurance: 0,
    storage: 0,
    cpaOnConfirmed: false,
    returnCost: 7.50, // Custo de devolução igual ao frete
    platformFee: 0
  });

  const [results, setResults] = useState<CalculationResults>({
    dailyRevenue: 0,
    dailyCosts: 0,
    dailyProfit: 0,
    profitMargin: 0,
    monthlyProfit: 0,
    grossProfit: 0,
    totalCostWithoutMarketing: 0,
    netRevenue: 0,
    marketingCosts: 0,
    unitProfit: 0,
    breakEvenPoint: 0,
    confirmedOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0
  });

  const [convertedResults, setConvertedResults] = useState<ConvertedResults>({
    dailyRevenueBRL: 0,
    dailyCostsBRL: 0,
    dailyProfitBRL: 0,
    monthlyProfitBRL: 0
  });

  // Buscar taxas de câmbio
  const { data: exchangeRates } = useQuery<Record<string, number>>({
    queryKey: ['/api/currency/rates'],
    enabled: fields.currency !== 'BRL',
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000
  });

  // Cálculo seguindo exatamente a lógica da planilha do usuário
  useEffect(() => {
    // PASSO 1: Volume de Pedidos (igual à planilha)
    const confirmedOrders = fields.ordersPerDay * (fields.confirmationRate / 100);
    const deliveredOrders = confirmedOrders * (fields.deliveryRate / 100);
    const returnedOrders = confirmedOrders - deliveredOrders;
    
    // PASSO 2: Receita (apenas dos entregues - como na planilha)
    const grossRevenue = deliveredOrders * fields.salePrice;
    
    // PASSO 3: Custos (seguindo a planilha)
    // 3.1 - Custo do Produto (sobre confirmados)
    const productCosts = confirmedOrders * fields.productCost;
    
    // 3.2 - Custo de Envio/Frete (sobre confirmados)
    const shippingCosts = confirmedOrders * fields.shippingCost;
    
    // 3.3 - Custo de Devolução/Recusados (sobre devolvidos)
    const returnCosts = returnedOrders * fields.returnCost;
    
    // 3.4 - Custos adicionais (seguro e armazenagem sobre confirmados)
    const insuranceCosts = confirmedOrders * fields.insurance;
    const storageCosts = confirmedOrders * fields.storage;
    
    // 3.5 - Marketing/CPA (sobre confirmados ou total conforme config)
    const marketingCosts = fields.cpaOnConfirmed 
      ? confirmedOrders * fields.cpa 
      : fields.ordersPerDay * fields.cpa;
    
    // 3.6 - Taxa da plataforma/gateway (sobre receita)
    const platformFees = grossRevenue * (fields.platformFee / 100);
    
    // PASSO 4: Custo Total (soma de todos os custos)
    const totalCostWithoutMarketing = productCosts + shippingCosts + returnCosts + insuranceCosts + storageCosts + platformFees;
    const dailyCosts = totalCostWithoutMarketing + marketingCosts;
    
    // PASSO 5: Lucro (Receita - Custos)
    const netRevenue = grossRevenue - platformFees;
    const grossProfit = grossRevenue - (productCosts + shippingCosts); // Lucro bruto básico
    const dailyProfit = grossRevenue - dailyCosts; // Lucro líquido final
    
    // Métricas derivadas
    const profitMargin = grossRevenue > 0 ? (dailyProfit / grossRevenue) * 100 : 0; // Margem sobre receita bruta
    const monthlyProfit = dailyProfit * 30;
    const unitProfit = deliveredOrders > 0 ? dailyProfit / deliveredOrders : 0;
    
    // Ponto de equilíbrio simplificado
    const revenuePerDelivered = fields.salePrice;
    const costPerConfirmed = fields.productCost + fields.shippingCost + fields.insurance + fields.storage;
    const costPerReturned = fields.returnCost;
    const avgCostPerDelivered = deliveredOrders > 0 
      ? (costPerConfirmed * confirmedOrders + costPerReturned * returnedOrders + marketingCosts + platformFees) / deliveredOrders
      : 0;
    const breakEvenPoint = revenuePerDelivered > avgCostPerDelivered 
      ? Math.ceil(dailyCosts / (revenuePerDelivered - avgCostPerDelivered))
      : 0;

    setResults({
      dailyRevenue: grossRevenue,
      dailyCosts,
      dailyProfit,
      profitMargin,
      monthlyProfit,
      grossProfit,
      totalCostWithoutMarketing,
      netRevenue,
      marketingCosts,
      unitProfit,
      breakEvenPoint,
      confirmedOrders,
      deliveredOrders,
      returnedOrders
    });

    // Conversão de moeda
    if (fields.currency !== 'BRL' && exchangeRates) {
      const rate = exchangeRates[fields.currency] || 1;
      setConvertedResults({
        dailyRevenueBRL: grossRevenue * rate,
        dailyCostsBRL: dailyCosts * rate,
        dailyProfitBRL: dailyProfit * rate,
        monthlyProfitBRL: monthlyProfit * rate
      });
    } else {
      setConvertedResults({
        dailyRevenueBRL: grossRevenue,
        dailyCostsBRL: dailyCosts,
        dailyProfitBRL: dailyProfit,
        monthlyProfitBRL: monthlyProfit
      });
    }
  }, [fields, exchangeRates]);

  const handleFieldChange = (field: keyof CalculatorFields, value: string | boolean) => {
    if (field === 'currency') {
      setFields(prev => ({ ...prev, [field]: value as string }));
    } else if (field === 'cpaOnConfirmed') {
      setFields(prev => ({ ...prev, [field]: value as boolean }));
    } else {
      const numValue = parseFloat(value as string) || 0;
      setFields(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const formatCurrency = (value: number) => {
    const locale = fields.currency === 'BRL' ? 'pt-BR' : fields.currency === 'EUR' ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: fields.currency
    }).format(value);
  };

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCurrencySymbol = () => {
    switch (fields.currency) {
      case 'BRL': return 'R$';
      case 'EUR': return '€';
      case 'USD': return '$';
      default: return fields.currency;
    }
  };

  const currencies = [
    { value: 'BRL', label: 'Real (R$)', flag: '🇧🇷' },
    { value: 'EUR', label: 'Euro (€)', flag: '🇪🇺' },
    { value: 'USD', label: 'Dólar ($)', flag: '🇺🇸' }
  ];

  const getProfitStatus = () => {
    if (results.profitMargin > 30) return { icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", label: "Excelente" };
    if (results.profitMargin > 15) return { icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Bom" };
    if (results.profitMargin > 0) return { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "Baixo" };
    return { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", label: "Prejuízo" };
  };

  const profitStatus = getProfitStatus();
  const ProfitIcon = profitStatus.icon;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Calculadora de Lucro COD</h1>
            <p className="text-gray-400 mt-1">Metodologia precisa: Receita dos entregues - Custos dos confirmados</p>
          </div>
          <Link href="/tools">
            <Button variant="outline" size="sm" className="text-gray-400 hover:text-white">
              ← Voltar
            </Button>
          </Link>
        </div>

        {/* Layout em 3 colunas no desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Coluna 1: Inputs principais */}
          <div className="space-y-4">
            {/* Card de Moeda */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Globe size={16} />
                  Moeda Base
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={fields.currency} onValueChange={(value) => handleFieldChange('currency', value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value} className="text-white hover:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <span>{currency.flag}</span>
                          <span>{currency.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Card de Volume */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Package size={16} />
                  Volume & Conversão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-300 text-xs">Pedidos por Dia</Label>
                  <Input
                    type="number"
                    value={fields.ordersPerDay}
                    onChange={(e) => handleFieldChange('ordersPerDay', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    data-testid="input-orders-per-day"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300 text-xs flex items-center gap-1">
                      Taxa Confirmação
                      <Tooltip>
                        <TooltipTrigger>
                          <Info size={12} className="text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>% de pedidos que são confirmados</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={fields.confirmationRate}
                        onChange={(e) => handleFieldChange('confirmationRate', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white pr-8"
                        data-testid="input-confirmation-rate"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs flex items-center gap-1">
                      Taxa Entrega
                      <Tooltip>
                        <TooltipTrigger>
                          <Info size={12} className="text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>% de pedidos confirmados que são entregues</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={fields.deliveryRate}
                        onChange={(e) => handleFieldChange('deliveryRate', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white pr-8"
                        data-testid="input-delivery-rate"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Preços */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <DollarSign size={16} />
                  Valores Unitários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-300 text-xs">Preço de Venda ({getCurrencySymbol()})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fields.salePrice}
                    onChange={(e) => handleFieldChange('salePrice', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    data-testid="input-sale-price"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Custo do Produto ({getCurrencySymbol()})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fields.productCost}
                    onChange={(e) => handleFieldChange('productCost', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    data-testid="input-product-cost"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300 text-xs">Frete ({getCurrencySymbol()})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fields.shippingCost}
                      onChange={(e) => handleFieldChange('shippingCost', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                      data-testid="input-shipping-cost"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">Devolução ({getCurrencySymbol()})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fields.returnCost}
                      onChange={(e) => handleFieldChange('returnCost', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 2: Inputs secundários e custos */}
          <div className="space-y-4">
            {/* Card de Custos Adicionais */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Truck size={16} />
                  Custos Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300 text-xs">Seguro ({getCurrencySymbol()})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fields.insurance}
                      onChange={(e) => handleFieldChange('insurance', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                      data-testid="input-insurance"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">Armazenagem ({getCurrencySymbol()})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fields.storage}
                      onChange={(e) => handleFieldChange('storage', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                      data-testid="input-storage"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs flex items-center gap-1">
                    Taxa da Plataforma
                    <Tooltip>
                      <TooltipTrigger>
                        <Info size={12} className="text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>% sobre a receita bruta</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={fields.platformFee}
                      onChange={(e) => handleFieldChange('platformFee', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Marketing */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Target size={16} />
                  Marketing & Aquisição
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-300 text-xs">CPA - Custo por Aquisição ({getCurrencySymbol()})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fields.cpa}
                    onChange={(e) => handleFieldChange('cpa', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    data-testid="input-cpa"
                  />
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="cpaOnConfirmed"
                    checked={fields.cpaOnConfirmed}
                    onChange={(e) => handleFieldChange('cpaOnConfirmed', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded"
                  />
                  <Label htmlFor="cpaOnConfirmed" className="text-xs text-gray-300 cursor-pointer">
                    CPA apenas sobre pedidos confirmados
                  </Label>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-xs text-blue-400">
                    Custo total de marketing:
                  </p>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(results.marketingCosts)}/dia
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card de Fluxo de Pedidos */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Fluxo de Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-xs text-gray-400">Total</span>
                    <span className="text-sm font-bold text-white">{fields.ordersPerDay}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-gray-500" />
                    <div className="flex-1 flex items-center justify-between p-2 bg-blue-500/10 rounded border border-blue-500/20">
                      <span className="text-xs text-blue-400">Confirmados</span>
                      <span className="text-sm font-bold text-white">{Math.round(results.confirmedOrders)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-gray-500" />
                    <div className="flex-1 flex items-center justify-between p-2 bg-green-500/10 rounded border border-green-500/20">
                      <span className="text-xs text-green-400">Entregues</span>
                      <span className="text-sm font-bold text-white">{Math.round(results.deliveredOrders)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-gray-500" />
                    <div className="flex-1 flex items-center justify-between p-2 bg-red-500/10 rounded border border-red-500/20">
                      <span className="text-xs text-red-400">Devoluções</span>
                      <span className="text-sm font-bold text-white">{Math.round(results.returnedOrders)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 3: Resultados */}
          <div className="space-y-4">
            {/* Card de Projeção de Lucros */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Projeção de Lucros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`p-3 rounded-lg ${results.dailyProfit > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">Lucro Diário</span>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${results.dailyProfit > 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="text-daily-profit">
                        {formatBRL(convertedResults.dailyProfitBRL)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatCurrency(results.dailyProfit)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${results.monthlyProfit > 0 ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">Lucro Mensal</span>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${results.monthlyProfit > 0 ? 'text-blue-400' : 'text-red-400'}`} data-testid="text-monthly-profit">
                        {formatBRL(convertedResults.monthlyProfitBRL)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatCurrency(results.monthlyProfit)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">Lucro Anual Projetado</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-400">
                        {formatBRL(convertedResults.monthlyProfitBRL * 12)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatCurrency(results.monthlyProfit * 12)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Margem de Lucro */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <ProfitIcon size={20} className={profitStatus.color} />
                    Margem de Lucro
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${profitStatus.bg} ${profitStatus.color}`}>
                    {profitStatus.label}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-blue-400 font-bold" style={{fontSize: '38px'}} data-testid="text-profit-margin">
                    {results.profitMargin.toFixed(1)}%
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={Math.max(0, Math.min(100, results.profitMargin))} 
                      className="h-2 bg-gray-800"
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Lucro/Unidade</p>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(results.unitProfit)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Break Even</p>
                      <p className="text-lg font-bold text-white">
                        {results.breakEvenPoint} un/dia
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Receitas e Custos */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Análise Financeira Diária</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Receita Bruta</span>
                    <span className="text-sm font-bold text-white" data-testid="text-daily-revenue">
                      {formatCurrency(results.dailyRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Taxa Plataforma</span>
                    <span className="text-sm text-red-400">
                      -{formatCurrency(results.dailyRevenue * (fields.platformFee / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                    <span className="text-xs text-gray-400">Receita Líquida</span>
                    <span className="text-sm font-bold text-green-400">
                      {formatCurrency(results.netRevenue)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-700">
                  {/* Breakdown dos custos principais */}
                  <div className="text-xs space-y-1 mb-2 bg-gray-800/30 p-2 rounded">
                    <div className="text-gray-500 font-semibold mb-1">Composição dos custos:</div>
                    <div className="flex justify-between text-gray-500">
                      <span>• Produto ({results.confirmedOrders.toFixed(0)}×{fields.productCost}€)</span>
                      <span>{formatCurrency(results.confirmedOrders * fields.productCost)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>• Frete ({results.confirmedOrders.toFixed(0)}×{fields.shippingCost}€)</span>
                      <span>{formatCurrency(results.confirmedOrders * fields.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>• Devolução ({results.returnedOrders.toFixed(0)}×{fields.returnCost}€)</span>
                      <span>{formatCurrency(results.returnedOrders * fields.returnCost)}</span>
                    </div>
                    {fields.insurance > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>• Seguro</span>
                        <span>{formatCurrency(results.confirmedOrders * fields.insurance)}</span>
                      </div>
                    )}
                    {fields.storage > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>• Armazenagem</span>
                        <span>{formatCurrency(results.confirmedOrders * fields.storage)}</span>
                      </div>
                    )}
                    {fields.platformFee > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>• Taxa ({fields.platformFee}%)</span>
                        <span>{formatCurrency(results.dailyRevenue * fields.platformFee / 100)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-semibold">
                      Subtotal (Produto+Frete+Devolução+Extras)
                    </span>
                    <span className="text-sm text-gray-300">
                      {formatCurrency(results.totalCostWithoutMarketing)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">+ Marketing/CPA</span>
                    <span className="text-sm text-gray-300">
                      {formatCurrency(results.marketingCosts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                    <span className="text-xs text-gray-400 font-semibold">CUSTO TOTAL</span>
                    <span className="text-sm font-bold text-red-400" data-testid="text-daily-costs">
                      {formatCurrency(results.dailyCosts)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Memória de Cálculo */}
            <Card className="glassmorphism border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Calculator size={16} />
                  Memória de Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="p-2 bg-gray-800/50 rounded space-y-1">
                  <div className="text-gray-400 font-semibold mb-2">📊 Volume de Pedidos:</div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pedidos/dia:</span>
                    <span className="text-white">{fields.ordersPerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">× Taxa confirmação:</span>
                    <span className="text-white">{fields.confirmationRate}%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-1">
                    <span className="text-gray-400">= Confirmados:</span>
                    <span className="text-green-400 font-bold">{results.confirmedOrders.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500">× Taxa entrega:</span>
                    <span className="text-white">{fields.deliveryRate}%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-1">
                    <span className="text-gray-400">= Entregues:</span>
                    <span className="text-blue-400 font-bold">{results.deliveredOrders.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">= Devolvidos:</span>
                    <span className="text-red-400 font-bold">{results.returnedOrders.toFixed(0)}</span>
                  </div>
                </div>

                <div className="p-2 bg-gray-800/50 rounded space-y-1">
                  <div className="text-gray-400 font-semibold mb-2">💰 Receita:</div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entregues × Preço:</span>
                    <span className="text-white">{results.deliveredOrders.toFixed(0)} × {formatCurrency(fields.salePrice)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-1">
                    <span className="text-gray-400">= Receita Bruta:</span>
                    <span className="text-green-400 font-bold">{formatCurrency(results.dailyRevenue)}</span>
                  </div>
                </div>

                <div className="p-2 bg-gray-800/50 rounded space-y-1">
                  <div className="text-gray-400 font-semibold mb-2">📉 Detalhamento dos Custos:</div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produto:</span>
                    <span className="text-white">{results.confirmedOrders.toFixed(0)} × {formatCurrency(fields.productCost)} = {formatCurrency(results.confirmedOrders * fields.productCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frete:</span>
                    <span className="text-white">{results.confirmedOrders.toFixed(0)} × {formatCurrency(fields.shippingCost)} = {formatCurrency(results.confirmedOrders * fields.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Devoluções:</span>
                    <span className="text-white">{results.returnedOrders.toFixed(0)} × {formatCurrency(fields.returnCost)} = {formatCurrency(results.returnedOrders * fields.returnCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Marketing/CPA:</span>
                    <span className="text-white">{fields.cpaOnConfirmed ? results.confirmedOrders.toFixed(0) : fields.ordersPerDay} × {formatCurrency(fields.cpa)} = {formatCurrency(results.marketingCosts)}</span>
                  </div>
                  {fields.platformFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Taxa Plataforma:</span>
                      <span className="text-white">{fields.platformFee}% de {formatCurrency(results.dailyRevenue)} = {formatCurrency(results.dailyRevenue * fields.platformFee / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-700 pt-1">
                    <span className="text-gray-400">= Custo Total:</span>
                    <span className="text-red-400 font-bold">{formatCurrency(results.dailyCosts)}</span>
                  </div>
                </div>

                <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500 text-xs">Receita - Custos:</span>
                    <span className="text-gray-400 text-xs">{formatCurrency(results.dailyRevenue)} - {formatCurrency(results.dailyCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400 font-semibold">Lucro Líquido:</span>
                    <span className={`font-bold ${results.dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(results.dailyProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Margem:</span>
                    <span className={`font-bold ${results.profitMargin >= 30 ? 'text-green-400' : results.profitMargin >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {results.profitMargin.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Insights e Recomendações */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="glassmorphism border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Info size={20} className="text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Eficiência Operacional</h4>
                  <p className="text-xs text-gray-400">
                    Sua operação converte {(results.deliveredOrders / fields.ordersPerDay * 100).toFixed(1)}% dos pedidos em vendas efetivas.
                    {results.deliveredOrders / fields.ordersPerDay < 0.5 && " Considere melhorar as taxas de confirmação e entrega."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Target size={20} className="text-green-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Otimização de Marketing</h4>
                  <p className="text-xs text-gray-400">
                    Seu CPA representa {((results.marketingCosts / results.dailyCosts) * 100).toFixed(1)}% dos custos totais.
                    {results.marketingCosts / results.dailyCosts > 0.3 && " Avalie estratégias para reduzir o custo de aquisição."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp size={20} className="text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Potencial de Crescimento</h4>
                  <p className="text-xs text-gray-400">
                    Com {results.breakEvenPoint} vendas/dia você atinge o break-even.
                    {results.deliveredOrders > results.breakEvenPoint * 1.5 
                      ? " Excelente margem de segurança!" 
                      : " Aumente o volume para melhorar a rentabilidade."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}