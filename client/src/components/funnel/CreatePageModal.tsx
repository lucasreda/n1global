import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, ShoppingCart, TrendingUp, Heart, Gift } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const createPageSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  pageType: z.string().min(1, "Tipo de página é obrigatório"),
  templateId: z.string().optional(),
  description: z.string().optional(),
});

type CreatePageForm = z.infer<typeof createPageSchema>;

interface CreatePageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnelId: string;
  onSuccess: () => void;
}

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  pageType: string;
  category: string;
  thumbnail?: string;
  isActive: boolean;
}

export function CreatePageModal({ open, onOpenChange, funnelId, onSuccess }: CreatePageModalProps) {
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const form = useForm<CreatePageForm>({
    resolver: zodResolver(createPageSchema),
    defaultValues: {
      name: "",
      pageType: "",
      templateId: "",
      description: "",
    },
  });

  // Fetch page templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/funnels/page-templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/funnels/page-templates');
      if (!response.ok) {
        throw new Error('Falha ao carregar templates');
      }
      return response.json();
    },
    enabled: open,
  });

  // Create page mutation
  const createPageMutation = useMutation({
    mutationFn: async (data: CreatePageForm) => {
      const response = await apiRequest('POST', `/api/funnels/${funnelId}/pages?operationId=${selectedOperation}`, {
        ...data,
        templateId: selectedTemplate || undefined,
      });
      if (!response.ok) {
        throw new Error('Falha ao criar página');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Página criada com sucesso!",
      });
      form.reset();
      setSelectedTemplate(null);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const templates: PageTemplate[] = templatesData?.templates || [];
  const selectedPageType = form.watch("pageType");
  const filteredTemplates = selectedPageType
    ? templates.filter(template => template.pageType === selectedPageType)
    : templates;

  const handleSubmit = (data: CreatePageForm) => {
    createPageMutation.mutate(data);
  };

  const getPageTypeIcon = (type: string) => {
    switch (type) {
      case 'landing': return FileText;
      case 'checkout': return ShoppingCart;
      case 'upsell': return TrendingUp;
      case 'downsell': return Gift;
      case 'thank_you': return Heart;
      default: return FileText;
    }
  };

  const pageTypes = [
    { value: 'landing', label: 'Landing Page', description: 'Página principal de captura' },
    { value: 'checkout', label: 'Checkout', description: 'Página de finalização de compra' },
    { value: 'upsell', label: 'Upsell', description: 'Oferta adicional após compra' },
    { value: 'downsell', label: 'Downsell', description: 'Oferta alternativa mais barata' },
    { value: 'thank_you', label: 'Obrigado', description: 'Página de confirmação' },
    { value: 'custom', label: 'Personalizada', description: 'Página personalizada' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Página</DialogTitle>
          <DialogDescription>
            Adicione uma nova página ao seu funil de vendas
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Form */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Página</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Página de Vendas Principal"
                          className="bg-gray-800 border-gray-600"
                          data-testid="input-page-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Página</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-page-type">
                            <SelectValue placeholder="Selecione o tipo de página" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pageTypes.map((type) => {
                            const Icon = getPageTypeIcon(type.value);
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <div>
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-xs text-gray-500">{type.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Descreva o propósito desta página..."
                          className="bg-gray-800 border-gray-600"
                          rows={3}
                          data-testid="textarea-page-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column - Templates */}
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-white mb-2">Templates Disponíveis</h4>
                  <p className="text-xs text-gray-400">
                    Selecione um template para acelerar a criação da página
                  </p>
                </div>

                {templatesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 text-center">
                      <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        {selectedPageType
                          ? 'Nenhum template disponível para este tipo'
                          : 'Selecione um tipo de página para ver os templates'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-950/20'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                        data-testid={`template-${template.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-white truncate">
                                {template.name}
                              </h5>
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {template.description}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {template.category}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-create"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createPageMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-create-page"
              >
                {createPageMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {createPageMutation.isPending ? 'Criando...' : 'Criar Página'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}