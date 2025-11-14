import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckSquare, Square, Home, Package, ShoppingCart, Target, Plug, Settings, Users } from "lucide-react";

interface EditMemberPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: any;
  };
  operationId: string;
}

interface TeamPermissions {
  dashboard?: { view?: boolean; export?: boolean };
  orders?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  products?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  ads?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  integrations?: { view?: boolean; edit?: boolean };
  settings?: { view?: boolean; edit?: boolean };
  team?: { view?: boolean; invite?: boolean; manage?: boolean };
}

const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, TeamPermissions> = {
  owner: {
    dashboard: { view: true, export: true },
    orders: { view: true, create: true, edit: true, delete: true },
    products: { view: true, create: true, edit: true, delete: true },
    ads: { view: true, create: true, edit: true, delete: true },
    integrations: { view: true, edit: true },
    settings: { view: true, edit: true },
    team: { view: true, invite: true, manage: true },
  },
  admin: {
    dashboard: { view: true, export: true },
    orders: { view: true, create: true, edit: true, delete: false },
    products: { view: true, create: true, edit: true, delete: false },
    ads: { view: true, create: true, edit: true, delete: false },
    integrations: { view: true, edit: true },
    settings: { view: true, edit: true },
    team: { view: true, invite: true, manage: true },
  },
  viewer: {
    dashboard: { view: true, export: false },
    orders: { view: true, create: false, edit: false, delete: false },
    products: { view: true, create: false, edit: false, delete: false },
    ads: { view: true, create: false, edit: false, delete: false },
    integrations: { view: true, edit: false },
    settings: { view: true, edit: false },
    team: { view: true, invite: false, manage: false },
  },
};

export function EditMemberPermissionsModal({
  open,
  onClose,
  member,
  operationId,
}: EditMemberPermissionsModalProps) {
  const { toast } = useToast();
  const [role, setRole] = useState<"owner" | "admin" | "viewer">(member.role as any);
  const [permissions, setPermissions] = useState<TeamPermissions>(
    member.permissions || DEFAULT_PERMISSIONS_BY_ROLE[member.role]
  );

  useEffect(() => {
    if (open) {
      setRole(member.role as any);
      setPermissions(member.permissions || DEFAULT_PERMISSIONS_BY_ROLE[member.role]);
    }
  }, [open, member]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/operations/${operationId}/team/${member.id}`, "PATCH", {
        role,
        permissions,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Permissões atualizadas com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations', operationId, 'team'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar permissões",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (newRole: "owner" | "admin" | "viewer") => {
    setRole(newRole);
    setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[newRole]);
  };

  const handlePermissionChange = (
    module: keyof TeamPermissions,
    action: string,
    value: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: value,
      },
    }));
  };


  const handleClose = () => {
    onClose();
  };

  const getModuleActions = (module: keyof TeamPermissions, currentRole?: string): string[] => {
    const modulePerms = permissions[module];
    if (!modulePerms) return [];
    
    // Para funcionários (viewer), ocultar opções de convidar e gerenciar no módulo team
    if (module === 'team' && currentRole === 'viewer') {
      return ['view']; // Apenas visualizar
    }
    
    // Para owner e admin, mostrar todas as ações disponíveis
    return Object.keys(modulePerms);
  };

  const getModuleLabel = (module: string): string => {
    const labels: Record<string, string> = {
      dashboard: "Dashboard",
      orders: "Pedidos",
      products: "Produtos",
      ads: "Anúncios",
      integrations: "Integrações",
      settings: "Configurações",
      team: "Equipe",
    };
    return labels[module] || module;
  };

  const getModuleIcon = (module: string) => {
    const icons: Record<string, typeof Home> = {
      dashboard: Home,
      orders: Package,
      products: ShoppingCart,
      ads: Target,
      integrations: Plug,
      settings: Settings,
      team: Users,
    };
    return icons[module] || Settings;
  };

  const areAllModulePermissionsSelected = (module: keyof TeamPermissions): boolean => {
    const modulePerms = permissions[module];
    if (!modulePerms) return false;
    
    // Para funcionários (viewer) no módulo team, verificar apenas 'view'
    if (module === 'team' && role === 'viewer') {
      return modulePerms.view === true;
    }
    
    // Para outros casos, verificar todas as ações
    return Object.values(modulePerms).every((value) => value === true);
  };

  const handleToggleModulePermissions = (module: keyof TeamPermissions) => {
    const modulePerms = permissions[module];
    if (!modulePerms) return;

    // Para funcionários (viewer) no módulo team, apenas toggle da ação 'view'
    if (module === 'team' && role === 'viewer') {
      const currentView = modulePerms.view === true;
      setPermissions((prev) => ({
        ...prev,
        [module]: {
          ...modulePerms,
          view: !currentView,
        },
      }));
      return;
    }

    // Para outros casos, toggle de todas as ações
    const allSelected = areAllModulePermissionsSelected(module);
    const newModulePerms: any = {};
    Object.keys(modulePerms).forEach((action) => {
      newModulePerms[action] = !allSelected;
    });

    setPermissions((prev) => ({
      ...prev,
      [module]: newModulePerms,
    }));
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      view: "Visualizar",
      create: "Criar",
      edit: "Editar",
      delete: "Excluir",
      export: "Exportar",
      invite: "Convidar",
      manage: "Gerenciar",
    };
    return labels[action] || action;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Permissões</DialogTitle>
          <DialogDescription className="text-gray-400">
            Editar permissões de {member.name} ({member.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Role */}
          <div>
            <Label htmlFor="role" className="text-white">
              Função
            </Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger id="role" className="bg-gray-800 border-gray-700 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="owner">Proprietário</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="viewer">Funcionário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-gray-700" />

          {/* Permissions */}
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-semibold mb-2">Permissões Personalizadas</h3>
              <p className="text-sm text-gray-400">
                Ajuste as permissões específicas para este membro
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(permissions) as Array<keyof TeamPermissions>).map((module) => {
                const ModuleIcon = getModuleIcon(module);
                const allModuleSelected = areAllModulePermissionsSelected(module);
                return (
                  <Card 
                    key={module} 
                    className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-black/30 transition-all duration-300 relative"
                    style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ModuleIcon className="h-4 w-4 text-gray-400" />
                          <CardTitle className="text-sm text-white">{getModuleLabel(module)}</CardTitle>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleModulePermissions(module)}
                          className="text-gray-400 hover:text-white transition-colors p-1"
                          title={allModuleSelected ? "Desmarcar todas as permissões" : "Marcar todas as permissões"}
                        >
                          {allModuleSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {getModuleActions(module, role).map((action) => {
                        const modulePerms = permissions[module] as any;
                        const isChecked = modulePerms?.[action] === true;
                        return (
                          <div key={action} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${module}-${action}`}
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module, action, checked === true)
                              }
                              className="border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <Label
                              htmlFor={`${module}-${action}`}
                              className="text-sm text-gray-300 cursor-pointer"
                            >
                              {getActionLabel(action)}
                            </Label>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="bg-gray-800 border-gray-700 text-gray-300">
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

