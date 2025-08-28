import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Users, 
  DollarSign, 
  TrendingUp,
  Building2,
  MoreVertical,
  Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminInvestmentLayout } from "@/components/admin/admin-investment-layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InvestmentPool {
  id: string;
  name: string;
  description: string;
  totalValue: number;
  totalInvested: number;
  monthlyReturn: number;
  yearlyReturn: number;
  riskLevel: string;
  minInvestment: number;
  status: string;
  investorCount: number;
  createdAt: string;
}

const poolFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  totalValue: z.number().min(0, "Valor deve ser positivo"),
  monthlyReturn: z.number().min(0, "Retorno mensal deve ser positivo"),
  yearlyReturn: z.number().min(0, "Retorno anual deve ser positivo"),
  riskLevel: z.enum(["low", "medium", "high"]),
  minInvestment: z.number().min(100, "Investimento mínimo deve ser pelo menos €100"),
  status: z.enum(["active", "paused", "closed"])
});

type PoolFormData = z.infer<typeof poolFormSchema>;

export default function AdminInvestmentPools() {
  const [selectedPool, setSelectedPool] = useState<InvestmentPool | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pools, isLoading } = useQuery<InvestmentPool[]>({
    queryKey: ["/api/admin-investment/pools"],
  });

  const addForm = useForm<PoolFormData>({
    resolver: zodResolver(poolFormSchema),
    defaultValues: {
      name: "",
      description: "",
      totalValue: 0,
      monthlyReturn: 0,
      yearlyReturn: 0,
      riskLevel: "medium",
      minInvestment: 1000,
      status: "active"
    }
  });

  const editForm = useForm<PoolFormData>({
    resolver: zodResolver(poolFormSchema),
  });

  const createPoolMutation = useMutation({
    mutationFn: (data: PoolFormData) => {
      // Transform data to match backend expectations
      const transformedData = {
        ...data,
        monthlyReturnRate: data.monthlyReturn,
        yearlyReturnRate: data.yearlyReturn
      };
      delete (transformedData as any).monthlyReturn;
      delete (transformedData as any).yearlyReturn;
      return apiRequest("/api/admin-investment/pools", "POST", transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-investment/pools"] });
      setAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Pool criada com sucesso",
        description: "A nova pool de investimento foi adicionada."
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar pool",
        description: "Ocorreu um erro ao criar a pool. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const updatePoolMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PoolFormData }) => {
      // Transform data to match backend expectations
      const transformedData = {
        ...data,
        monthlyReturnRate: data.monthlyReturn,
        yearlyReturnRate: data.yearlyReturn
      };
      delete (transformedData as any).monthlyReturn;
      delete (transformedData as any).yearlyReturn;
      return apiRequest(`/api/admin-investment/pools/${id}`, "PUT", transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-investment/pools"] });
      setEditDialogOpen(false);
      editForm.reset();
      setSelectedPool(null);
      toast({
        title: "Pool atualizada com sucesso",
        description: "As informações da pool foram atualizadas."
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar pool",
        description: "Ocorreu um erro ao atualizar a pool. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'closed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const onAddSubmit = (data: PoolFormData) => {
    createPoolMutation.mutate(data);
  };

  const onEditSubmit = (data: PoolFormData) => {
    if (selectedPool) {
      updatePoolMutation.mutate({ id: selectedPool.id, data });
    }
  };

  const handleEditClick = (pool: InvestmentPool) => {
    setSelectedPool(pool);
    editForm.reset({
      name: pool.name,
      description: pool.description || "",
      totalValue: Number(pool.totalValue),
      monthlyReturn: Number(pool.monthlyReturn),
      yearlyReturn: Number(pool.yearlyReturn),
      riskLevel: pool.riskLevel as "low" | "medium" | "high",
      minInvestment: Number(pool.minInvestment),
      status: pool.status as "active" | "paused" | "closed"
    });
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AdminInvestmentLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-white">Carregando pools...</div>
        </div>
      </AdminInvestmentLayout>
    );
  }

  return (
    <AdminInvestmentLayout>
      <div className="space-y-6" data-testid="pools-page">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Gerenciar Pools</h1>
            <p className="text-gray-400">Visualize e gerencie todas as pools de investimento</p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white" 
                data-testid="button-add-pool"
              >
                <Plus className="h-4 w-4 mr-2 text-white" />
                Nova Pool
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Pool</DialogTitle>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Pool</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-pool-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="riskLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Risco</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-risk-level">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Baixo</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="high">Alto</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={addForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-pool-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={addForm.control}
                      name="totalValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Total (€)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-total-value"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="monthlyReturn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retorno Mensal (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value) / 100)}
                              value={field.value * 100}
                              data-testid="input-monthly-return"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="minInvestment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Investimento Mín. (€)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-min-investment"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="yearlyReturn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retorno Anual (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value) / 100)}
                              value={field.value * 100}
                              data-testid="input-yearly-return"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pool-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Ativa</SelectItem>
                              <SelectItem value="paused">Pausada</SelectItem>
                              <SelectItem value="closed">Fechada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setAddDialogOpen(false)}
                      data-testid="button-cancel-add"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPoolMutation.isPending}
                      data-testid="button-submit-add"
                    >
                      {createPoolMutation.isPending ? "Criando..." : "Criar Pool"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pools?.map((pool) => (
            <Card key={pool.id} style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white mb-2" data-testid={`text-pool-name-${pool.id}`}>
                      {pool.name}
                    </CardTitle>
                    <div className="flex gap-2 mb-2">
                      <Badge className={getRiskColor(pool.riskLevel)} data-testid={`badge-risk-${pool.id}`}>
                        {pool.riskLevel === 'low' ? 'Baixo Risco' : 
                         pool.riskLevel === 'medium' ? 'Médio Risco' : 'Alto Risco'}
                      </Badge>
                      <Badge className={getStatusColor(pool.status)} data-testid={`badge-status-${pool.id}`}>
                        {pool.status === 'active' ? 'Ativa' : 
                         pool.status === 'paused' ? 'Pausada' : 'Fechada'}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEditClick(pool)}
                    className="text-gray-400 hover:text-white"
                    data-testid={`button-edit-pool-${pool.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                {pool.description && (
                  <p className="text-sm text-gray-400 mt-2" data-testid={`text-pool-description-${pool.id}`}>
                    {pool.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Valor Total</p>
                    <p className="text-sm font-semibold text-white" data-testid={`text-total-value-${pool.id}`}>
                      {formatCurrency(pool.totalValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Investido</p>
                    <p className="text-sm font-semibold text-white" data-testid={`text-invested-${pool.id}`}>
                      {formatCurrency(pool.totalInvested)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Retorno Mensal</p>
                    <p className="text-sm font-semibold text-green-400" data-testid={`text-monthly-return-${pool.id}`}>
                      {formatPercentage(pool.monthlyReturn)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Investidores</p>
                    <p className="text-sm font-semibold text-white" data-testid={`text-investors-${pool.id}`}>
                      {pool.investorCount || 0}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">Investimento Mínimo</p>
                  <p className="text-sm font-semibold text-white" data-testid={`text-min-investment-${pool.id}`}>
                    {formatCurrency(pool.minInvestment)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Pool: {selectedPool?.name}</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Pool</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-pool-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Risco</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-risk-level">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Baixo</SelectItem>
                            <SelectItem value="medium">Médio</SelectItem>
                            <SelectItem value="high">Alto</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-edit-pool-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="totalValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total (€)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-edit-total-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="monthlyReturn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retorno Mensal (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) / 100)}
                            value={field.value * 100}
                            data-testid="input-edit-monthly-return"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="minInvestment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investimento Mín. (€)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-edit-min-investment"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="yearlyReturn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retorno Anual (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) / 100)}
                            value={field.value * 100}
                            data-testid="input-edit-yearly-return"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-pool-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Ativa</SelectItem>
                            <SelectItem value="paused">Pausada</SelectItem>
                            <SelectItem value="closed">Fechada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updatePoolMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updatePoolMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {pools && pools.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhuma pool encontrada</h3>
            <p className="text-gray-400 mb-4">Comece criando sua primeira pool de investimento.</p>
            <Button 
              onClick={() => setAddDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-first-pool"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Pool
            </Button>
          </div>
        )}
      </div>
    </AdminInvestmentLayout>
  );
}