import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Percent,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Package,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CommissionRule {
  id: string;
  operationId?: string;
  productId?: string;
  commissionRate: string;
  isActive: boolean;
  createdAt: string;
  operationName?: string;
  productName?: string;
}

export default function AffiliatesCommissionRules() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(null);
  const [formData, setFormData] = useState({
    ruleType: "global",
    operationId: "",
    productId: "",
    commissionRate: "",
  });

  const { data: rules = [], isLoading } = useQuery<CommissionRule[]>({
    queryKey: ['/api/affiliate/commission/rules'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/affiliate/commission/rules', {
        credentials: 'include',
        headers
      });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/affiliate/commission/rules', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/commission/rules'] });
      toast({
        title: "Regra criada!",
        description: "A regra de comissão foi criada com sucesso.",
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar regra",
        description: error.message || "Não foi possível criar a regra.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return await apiRequest(`/api/affiliate/commission/rules/${ruleId}`, 'DELETE', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/commission/rules'] });
      toast({
        title: "Regra excluída!",
        description: "A regra de comissão foi excluída com sucesso.",
      });
      setDeleteDialogOpen(false);
      setSelectedRule(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir regra",
        description: error.message || "Não foi possível excluir a regra.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      ruleType: "global",
      operationId: "",
      productId: "",
      commissionRate: "",
    });
  };

  const handleCreate = () => {
    const payload: any = {
      commissionRate: parseFloat(formData.commissionRate),
    };

    if (formData.ruleType === "operation" && formData.operationId) {
      payload.operationId = formData.operationId;
    } else if (formData.ruleType === "product" && formData.productId) {
      payload.productId = formData.productId;
    }

    createMutation.mutate(payload);
  };

  const globalRules = rules.filter(r => !r.operationId && !r.productId);
  const operationRules = rules.filter(r => r.operationId);
  const productRules = rules.filter(r => r.productId);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Regras de Comissão</h1>
          <p className="text-gray-400">Configure percentuais de comissão por produto ou operação</p>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-create-rule"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Regras Globais</p>
                <p className="text-3xl font-bold">{globalRules.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Percent className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Por Operação</p>
                <p className="text-3xl font-bold">{operationRules.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Por Produto</p>
                <p className="text-3xl font-bold">{productRules.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card className="bg-[#1a1a1a] border-[#252525]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Regras Configuradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">
              Carregando regras...
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <Percent className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-2">Nenhuma regra configurada</p>
              <p className="text-sm text-gray-500">Crie sua primeira regra de comissão</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Global Rules */}
              {globalRules.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Regras Globais</h3>
                  {globalRules.map((rule) => (
                    <Card key={rule.id} className="bg-[#0f0f0f] border-[#252525] mb-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <Percent className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                              <p className="font-medium">Comissão Padrão</p>
                              <p className="text-sm text-gray-400">Aplicada a todos os produtos</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-purple-500">{rule.commissionRate}%</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRule(rule);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Operation Rules */}
              {operationRules.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Regras por Operação</h3>
                  {operationRules.map((rule) => (
                    <Card key={rule.id} className="bg-[#0f0f0f] border-[#252525] mb-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium">{rule.operationName || "Operação"}</p>
                              <p className="text-sm text-gray-400">Operação específica</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-500">{rule.commissionRate}%</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRule(rule);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Product Rules */}
              {productRules.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Regras por Produto</h3>
                  {productRules.map((rule) => (
                    <Card key={rule.id} className="bg-[#0f0f0f] border-[#252525] mb-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                              <Package className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <p className="font-medium">{rule.productName || "Produto"}</p>
                              <p className="text-sm text-gray-400">Produto específico</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-500">{rule.commissionRate}%</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRule(rule);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white">
          <DialogHeader>
            <DialogTitle>Nova Regra de Comissão</DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure um percentual de comissão personalizado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="ruleType" className="text-gray-300">Tipo de Regra</Label>
              <Select value={formData.ruleType} onValueChange={(value) => setFormData({ ...formData, ruleType: value })}>
                <SelectTrigger className="bg-[#0f0f0f] border-[#252525] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#252525] text-white">
                  <SelectItem value="global">Global (Padrão)</SelectItem>
                  <SelectItem value="operation">Por Operação</SelectItem>
                  <SelectItem value="product">Por Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.ruleType === "operation" && (
              <div>
                <Label htmlFor="operationId" className="text-gray-300">ID da Operação</Label>
                <Input
                  id="operationId"
                  value={formData.operationId}
                  onChange={(e) => setFormData({ ...formData, operationId: e.target.value })}
                  placeholder="Digite o ID da operação"
                  className="bg-[#0f0f0f] border-[#252525] text-white"
                />
              </div>
            )}

            {formData.ruleType === "product" && (
              <div>
                <Label htmlFor="productId" className="text-gray-300">ID do Produto</Label>
                <Input
                  id="productId"
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  placeholder="Digite o ID do produto"
                  className="bg-[#0f0f0f] border-[#252525] text-white"
                />
              </div>
            )}

            <div>
              <Label htmlFor="commissionRate" className="text-gray-300">Percentual de Comissão (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                placeholder="Ex: 10.00"
                className="bg-[#0f0f0f] border-[#252525] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.commissionRate || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? "Criando..." : "Criar Regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white">
          <DialogHeader>
            <DialogTitle>Excluir Regra</DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem certeza que deseja excluir esta regra de comissão? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedRule(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => selectedRule && deleteMutation.mutate(selectedRule.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
