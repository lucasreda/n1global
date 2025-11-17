import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Briefcase, PlayCircle, Clock, Hash, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTourContext } from "@/contexts/tour-context";
import { useLocation } from "wouter";
import { useTranslation } from "@/hooks/use-translation";

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

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "it", label: "Italiano" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pl", label: "Polski" },
  { value: "ro", label: "Română" },
  { value: "cs", label: "Čeština" },
  { value: "hu", label: "Magyar" },
  { value: "bg", label: "Български" },
  { value: "hr", label: "Hrvatski" },
  { value: "sk", label: "Slovenčina" },
  { value: "sl", label: "Slovenščina" },
];

export default function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [operationType, setOperationType] = useState<string>("Cash on Delivery");
  const [originalOperationType, setOriginalOperationType] = useState<string>("Cash on Delivery");
  const [timezone, setTimezone] = useState<string>("Europe/Madrid");
  const [originalTimezone, setOriginalTimezone] = useState<string>("Europe/Madrid");
  const [currency, setCurrency] = useState<string>("EUR");
  const [originalCurrency, setOriginalCurrency] = useState<string>("EUR");
  const [language, setLanguage] = useState<string>("es");
  const [originalLanguage, setOriginalLanguage] = useState<string>("es");
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

  // Fetch full operations data to get operationType, timezone, currency, language, and shopifyOrderPrefix
  const { data: operations } = useQuery<Array<{ id: string; name: string; operationType?: string; timezone?: string; currency?: string; language?: string; shopifyOrderPrefix?: string }>>({
    queryKey: ['/api/operations'],
    enabled: !!selectedOperation,
  });

  // Set initial operationType, timezone, currency, language, and shopifyPrefix from current operation
  useEffect(() => {
    if (operations && selectedOperation) {
      const operation = operations.find((op) => op.id === selectedOperation);
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
      if (operation?.language) {
        setLanguage(operation.language);
        setOriginalLanguage(operation.language);
      }
      if (operation?.shopifyOrderPrefix !== undefined) {
        setShopifyPrefix(operation.shopifyOrderPrefix || "");
        setOriginalShopifyPrefix(operation.shopifyOrderPrefix || "");
      }
      setHasChanges(false);
    }
  }, [operations, selectedOperation]);

  const handleOperationTypeChange = (value: string) => {
    setOperationType(value);
    setHasChanges(value !== originalOperationType || timezone !== originalTimezone || currency !== originalCurrency || language !== originalLanguage || shopifyPrefix !== originalShopifyPrefix);
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setHasChanges(operationType !== originalOperationType || value !== originalTimezone || currency !== originalCurrency || language !== originalLanguage || shopifyPrefix !== originalShopifyPrefix);
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    setHasChanges(operationType !== originalOperationType || timezone !== originalTimezone || value !== originalCurrency || language !== originalLanguage || shopifyPrefix !== originalShopifyPrefix);
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    setHasChanges(operationType !== originalOperationType || timezone !== originalTimezone || currency !== originalCurrency || value !== originalLanguage || shopifyPrefix !== originalShopifyPrefix);
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
    setHasChanges(operationType !== originalOperationType || timezone !== originalTimezone || currency !== originalCurrency || language !== originalLanguage || finalValue !== originalShopifyPrefix);
  };

  const handleSave = async () => {
    if (!selectedOperation) {
      toast({
        title: t('settings.error'),
        description: t('settings.noOperationSelected'),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest(`/api/operations/${selectedOperation}/settings`, 'PATCH', { operationType, timezone, currency, language, shopifyOrderPrefix: shopifyPrefix });

      setOriginalOperationType(operationType);
      setOriginalTimezone(timezone);
      setOriginalCurrency(currency);
      setOriginalLanguage(language);
      setOriginalShopifyPrefix(shopifyPrefix);
      setHasChanges(false);
      
      // Invalidate cache to refresh operations data across the app
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      
      toast({
        title: t('settings.success'),
        description: t('settings.settingsUpdatedSuccess'),
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: t('settings.error'),
        description: t('settings.errorUpdatingSettings'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={t('settings.title')} 
        subtitle={t('settings.subtitle')} 
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
              <h3 className="text-white font-semibold">{t('settings.business')}</h3>
              <p className="text-gray-400 text-sm">{t('settings.businessDescription')}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block">{t('settings.operationType')}</label>
              <Select value={operationType} onValueChange={handleOperationTypeChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-operation-type"
                >
                  <SelectValue placeholder={t('settings.selectOperationType')} />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  <SelectItem value="Cash on Delivery" data-testid="option-cash-on-delivery">
                    {t('settings.cashOnDelivery')}
                  </SelectItem>
                  <SelectItem value="Pagamento no Cartão" data-testid="option-pagamento-cartao">
                    {t('settings.cardPayment')}
                  </SelectItem>
                </SelectContent>
              </Select>
                </div>

                <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block flex items-center">
                <Clock className="mr-2" size={16} />
                {t('settings.timezone')}
              </label>
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-timezone"
                >
                  <SelectValue placeholder={t('settings.selectTimezone')} />
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
                {t('settings.timezoneDescription')}
              </p>
            </div>

            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block">{t('settings.currency')}</label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-currency"
                >
                  <SelectValue placeholder={t('settings.selectCurrency')} />
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
                {t('settings.currencyDescription')}
              </p>
            </div>

            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block flex items-center">
                <Globe className="mr-2" size={16} />
                {t('settings.language')}
              </label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-language"
                >
                  <SelectValue placeholder={t('settings.selectLanguage')} />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value} data-testid={`option-language-${lang.value}`}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-gray-400 text-xs mt-2">
                {t('settings.languageDescription')}
              </p>
            </div>

            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block flex items-center">
                <Hash className="mr-2" size={16} />
                {t('settings.orderPrefix')}
              </label>
              <Input
                type="text"
                value={shopifyPrefix}
                onChange={(e) => handleShopifyPrefixChange(e.target.value)}
                placeholder={t('settings.orderPrefixPlaceholder')}
                maxLength={4}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 hover:bg-black/30"
                data-testid="input-shopify-prefix"
              />
              <p className="text-gray-400 text-xs mt-2">
                {t('settings.orderPrefixDescription')}
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
              {isSaving ? t('settings.saving') : t('settings.saveSettings')}
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
              <h3 className="text-white font-semibold">{t('settings.interactiveTour')}</h3>
              <p className="text-gray-400 text-sm">{t('settings.interactiveTourDescription')}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/10 border border-white/5 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-4">
                {t('settings.tourDescription')}
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
                    {t('settings.starting')}
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2" size={18} />
                    {t('settings.restartTour')}
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
        <h3 className="text-xl font-semibold text-white mb-4">{t('settings.aboutSystem')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">{t('settings.version')}</h4>
            <p className="text-gray-400 text-sm">v1.0.0</p>
          </div>
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">{t('settings.lastUpdate')}</h4>
            <p className="text-gray-400 text-sm">15/12/2024</p>
          </div>
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">{t('settings.support')}</h4>
            <p className="text-gray-400 text-sm">{t('settings.support24_7')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
