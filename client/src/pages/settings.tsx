import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Briefcase, PlayCircle, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTourContext } from "@/contexts/tour-context";
import { useLocation } from "wouter";

// Common European timezones
const TIMEZONES = [
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0)" },
  { value: "Europe/Rome", label: "Roma (GMT+1)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/Berlin", label: "Berlim (GMT+1)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (GMT+1)" },
  { value: "Europe/Brussels", label: "Bruxelas (GMT+1)" },
  { value: "Europe/London", label: "Londres (GMT+0)" },
  { value: "Europe/Warsaw", label: "Varsóvia (GMT+1)" },
  { value: "Europe/Prague", label: "Praga (GMT+1)" },
  { value: "Europe/Vienna", label: "Viena (GMT+1)" },
  { value: "Europe/Athens", label: "Atenas (GMT+2)" },
];

// Available currencies
const CURRENCIES = [
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "BRL", label: "Real Brasileiro (R$)", symbol: "R$" },
  { value: "USD", label: "Dólar Americano ($)", symbol: "$" },
  { value: "GBP", label: "Libra Esterlina (£)", symbol: "£" },
  { value: "CHF", label: "Franco Suíço (CHF)", symbol: "CHF" },
  { value: "PLN", label: "Zloty Polonês (zł)", symbol: "zł" },
  { value: "CZK", label: "Coroa Tcheca (Kč)", symbol: "Kč" },
  { value: "SEK", label: "Coroa Sueca (kr)", symbol: "kr" },
  { value: "NOK", label: "Coroa Norueguesa (kr)", symbol: "kr" },
  { value: "DKK", label: "Coroa Dinamarquesa (kr)", symbol: "kr" },
  { value: "RON", label: "Leu Romeno (lei)", symbol: "lei" },
  { value: "HUF", label: "Forint Húngaro (Ft)", symbol: "Ft" },
  { value: "BGN", label: "Lev Búlgaro (лв)", symbol: "лв" },
  { value: "TRY", label: "Lira Turca (₺)", symbol: "₺" },
  { value: "SAR", label: "Riyal Saudita (﷼)", symbol: "﷼" },
  { value: "AED", label: "Dirham dos Emirados (د.إ)", symbol: "د.إ" },
];

export default function Settings() {
  const [operationType, setOperationType] = useState<string>("Cash on Delivery");
  const [originalOperationType, setOriginalOperationType] = useState<string>("Cash on Delivery");
  const [timezone, setTimezone] = useState<string>("Europe/Madrid");
  const [originalTimezone, setOriginalTimezone] = useState<string>("Europe/Madrid");
  const [currency, setCurrency] = useState<string>("EUR");
  const [originalCurrency, setOriginalCurrency] = useState<string>("EUR");
  const [shopifyPrefix, setShopifyPrefix] = useState<string>("");
  const [originalShopifyPrefix, setOriginalShopifyPrefix] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Tour context
  const { resetTour, isResettingTour } = useTourContext();

  const handleRestartTour = async () => {
    await resetTour();
    // Navigate to dashboard to start tour
    navigate('/');
  };

  // Fetch full operations data to get operationType, timezone, currency, and shopifyOrderPrefix
  const { data: operations } = useQuery<Array<{ id: string; name: string; operationType?: string; timezone?: string; currency?: string; shopifyOrderPrefix?: string }>>({
    queryKey: ['/api/operations'],
    enabled: !!selectedOperation,
  });

  // Set initial operationType, timezone, currency, and shopifyPrefix from current operation
  useEffect(() => {
    if (operations && selectedOperation) {
      const operation = operations.find((op) => op.id === selectedOperation);
      console.log('📋 Settings - Current operation data:', operation);
      if (operation?.operationType) {
        setOperationType(operation.operationType);
        setOriginalOperationType(operation.operationType);
      }
      if (operation?.timezone) {
        setTimezone(operation.timezone);
        setOriginalTimezone(operation.timezone);
      }
      if (operation?.currency) {
        setCurrency(operation.currency);
        setOriginalCurrency(operation.currency);
      }
      if (operation?.shopifyOrderPrefix !== undefined) {
        console.log('🏷️ Setting prefix from backend:', operation.shopifyOrderPrefix);
        setShopifyPrefix(operation.shopifyOrderPrefix || "");
        setOriginalShopifyPrefix(operation.shopifyOrderPrefix || "");
      }
      setHasChanges(false);
    }
  }, [operations, selectedOperation]);

  const handleOperationTypeChange = (value: string) => {
    setOperationType(value);
    setHasChanges(value !== originalOperationType || timezone !== originalTimezone || currency !== originalCurrency || shopifyPrefix !== originalShopifyPrefix);
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setHasChanges(operationType !== originalOperationType || value !== originalTimezone || currency !== originalCurrency || shopifyPrefix !== originalShopifyPrefix);
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    setHasChanges(operationType !== originalOperationType || timezone !== originalTimezone || value !== originalCurrency || shopifyPrefix !== originalShopifyPrefix);
  };

  const handleShopifyPrefixChange = (value: string) => {
    // Normalize prefix: always add # if not present, keep only first 3 chars after #
    const normalized = value.trim();
    let finalValue = '';
    
    if (normalized) {
      // Remove # if present, then add it back
      const withoutHash = normalized.startsWith('#') ? normalized.substring(1) : normalized;
      // Keep only first 3 characters after #
      const prefix = withoutHash.substring(0, 3).toUpperCase();
      finalValue = prefix ? `#${prefix}` : '';
    }
    
    setShopifyPrefix(finalValue);
    setHasChanges(operationType !== originalOperationType || timezone !== originalTimezone || currency !== originalCurrency || finalValue !== originalShopifyPrefix);
  };

  const handleSave = async () => {
    console.log('🔄 Starting handleSave, selectedOperation:', selectedOperation, 'operationType:', operationType, 'timezone:', timezone, 'currency:', currency, 'shopifyPrefix:', shopifyPrefix);
    
    if (!selectedOperation) {
      toast({
        title: "Erro",
        description: "Nenhuma operação selecionada",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      console.log('📤 Making API request to:', `/api/operations/${selectedOperation}/settings`, 'with data:', { operationType, timezone, currency, shopifyOrderPrefix: shopifyPrefix });
      
      const response = await apiRequest(`/api/operations/${selectedOperation}/settings`, 'PATCH', { operationType, timezone, currency, shopifyOrderPrefix: shopifyPrefix });
      
      console.log('✅ API response received:', response);

      setOriginalOperationType(operationType);
      setOriginalTimezone(timezone);
      setOriginalCurrency(currency);
      setOriginalShopifyPrefix(shopifyPrefix);
      setHasChanges(false);
      
      // Invalidate cache to refresh operations data across the app
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Configurações do Sistema" 
        subtitle="Personalize e configure suas preferências" 
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Negócio */}
        <div 
          className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-black/30 transition-all duration-300"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
              <Briefcase className="text-green-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Negócio</h3>
              <p className="text-gray-400 text-sm">Configure o tipo de operação do seu negócio</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block">Tipo de Operação</label>
              <Select value={operationType} onValueChange={handleOperationTypeChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-operation-type"
                >
                  <SelectValue placeholder="Selecione o tipo de operação" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  <SelectItem value="Cash on Delivery" data-testid="option-cash-on-delivery">
                    Cash on Delivery
                  </SelectItem>
                  <SelectItem value="Pagamento no Cartão" data-testid="option-pagamento-cartao">
                    Pagamento no Cartão
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block flex items-center">
                <Clock className="mr-2" size={16} />
                Fuso Horário da Operação
              </label>
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-timezone"
                >
                  <SelectValue placeholder="Selecione o fuso horário" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} data-testid={`option-timezone-${tz.value}`}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-gray-400 text-xs mt-2">
                Este fuso horário será usado para calcular as métricas e relatórios do dashboard
              </p>
            </div>

            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block">Moeda da Operação</label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-currency"
                >
                  <SelectValue placeholder="Selecione a moeda" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value} data-testid={`option-currency-${curr.value}`}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-gray-400 text-xs mt-2">
                Moeda em que os valores serão exibidos no dashboard
              </p>
            </div>

            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block flex items-center">
                <Hash className="mr-2" size={16} />
                Prefixo Shopify (FHB Sync)
              </label>
              <Input
                type="text"
                value={shopifyPrefix}
                onChange={(e) => handleShopifyPrefixChange(e.target.value)}
                placeholder="Ex: 52, BG, CR (# será adicionado automaticamente)"
                maxLength={4}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 hover:bg-black/30"
                data-testid="input-shopify-prefix"
              />
              <p className="text-gray-400 text-xs mt-2">
                Digite os 3 caracteres do prefixo (# é adicionado automaticamente). Ex: 52 vira #52, BG vira #BG
              </p>
            </div>
            
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`w-full transition-all duration-200 ${
                hasChanges && !isSaving
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-save-settings"
            >
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>
        
        {/* Tour Interativo */}
        <div 
          className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-black/30 transition-all duration-300"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <PlayCircle className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Tour Interativo</h3>
              <p className="text-gray-400 text-sm">Conheça todas as funcionalidades do dashboard</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/10 border border-white/5 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-4">
                O tour guiado mostra os principais recursos do sistema, incluindo métricas, integrações e anúncios. 
                Perfeito para novos usuários ou para relembrar funcionalidades.
              </p>
              <Button 
                onClick={handleRestartTour}
                disabled={isResettingTour}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200"
                data-testid="button-restart-tour"
              >
                {isResettingTour ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Iniciando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2" size={18} />
                    Refazer Tour Guiado
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div 
        className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-black/30 transition-all duration-300"
        style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
      >
        <h3 className="text-xl font-semibold text-white mb-4">Sobre o Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">Versão</h4>
            <p className="text-gray-400 text-sm">v1.0.0</p>
          </div>
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">Última Atualização</h4>
            <p className="text-gray-400 text-sm">15/12/2024</p>
          </div>
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">Suporte</h4>
            <p className="text-gray-400 text-sm">24/7 Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
