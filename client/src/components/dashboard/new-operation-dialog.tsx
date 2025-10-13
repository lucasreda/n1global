import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// European countries with flags
const EUROPEAN_COUNTRIES = [
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'EUR' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', currency: 'EUR' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', currency: 'HUF' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', currency: 'RON' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', currency: 'BGN' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', currency: 'EUR' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', currency: 'EUR' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', currency: 'EUR' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', currency: 'EUR' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', currency: 'EUR' }
];

// Currency options with symbols
const EUROPEAN_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' }
];

interface NewOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOperationCreated?: (operationId: string) => void;
}


export function NewOperationDialog({ open, onOpenChange, onOperationCreated }: NewOperationDialogProps) {
  const [operationName, setOperationName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const { toast } = useToast();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setOperationName('');
      setSelectedCountry('');
      setSelectedCurrency('');
    }
  }, [open]);

  // Auto-select currency when country changes
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = EUROPEAN_COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setSelectedCurrency(country.currency);
    }
  };


  // Create operation mutation
  const createOperationMutation = useMutation({
    mutationFn: async (data: { name: string; country: string; currency: string }) => {
      const response = await fetch('/api/operations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create operation: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: (response: any) => {
      toast({
        title: "Operação criada com sucesso!",
        description: `A operação "${operationName}" foi criada.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      onOperationCreated?.(response.id);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Erro ao criar operação:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar operação",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });


  const handleCreateOperation = () => {
    if (!operationName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a operação.",
      });
      return;
    }
    if (!selectedCountry || !selectedCurrency) {
      toast({
        variant: "destructive",
        title: "Seleções obrigatórias",
        description: "Por favor, selecione o país e a moeda.",
      });
      return;
    }

    createOperationMutation.mutate({
      name: operationName,
      country: selectedCountry,
      currency: selectedCurrency,
    });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            Criar Nova Operação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Nome da Operação</Label>
            <Input
              type="text"
              placeholder="Ex: Loja Europa"
              value={operationName}
              onChange={(e) => setOperationName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              data-testid="input-operation-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">País</Label>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Selecione o país" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {EUROPEAN_COUNTRIES.map((country) => (
                  <SelectItem 
                    key={country.code} 
                    value={country.code}
                    className="text-white hover:bg-gray-700"
                  >
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-white">Moeda</Label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Selecione a moeda" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {EUROPEAN_CURRENCIES.map((currency) => (
                  <SelectItem 
                    key={currency.code} 
                    value={currency.code}
                    className="text-white hover:bg-gray-700"
                  >
                    {currency.symbol} {currency.name} ({currency.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={handleCreateOperation}
            disabled={createOperationMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
            data-testid="button-create-operation"
          >
            {createOperationMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando operação...
              </>
            ) : (
              'Criar Operação'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}