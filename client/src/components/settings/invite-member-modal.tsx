import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
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

export function InviteMemberModal({ open, onClose, operationId }: InviteMemberModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "admin" | "viewer">("viewer");
  const [permissions, setPermissions] = useState<TeamPermissions>(DEFAULT_PERMISSIONS_BY_ROLE.viewer);
  const [userExists, setUserExists] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/operations/${operationId}/team/invite`, "POST", {
        email,
        role,
        permissions,
        userExists,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Convite enviado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations', operationId, 'team'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar convite",
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
    setEmail("");
    setRole("viewer");
    setPermissions(DEFAULT_PERMISSIONS_BY_ROLE.viewer);
    setUserExists(false);
    onClose();
  };

  const getModuleActions = (module: keyof TeamPermissions): string[] => {
    const modulePerms = permissions[module];
    if (!modulePerms) return [];
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
          <DialogTitle className="text-white">Convidar Membro</DialogTitle>
          <DialogDescription className="text-gray-400">
            Envie um convite para alguém participar desta operação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email and Role */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

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
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="userExists"
                checked={userExists}
                onCheckedChange={(checked) => setUserExists(checked === true)}
              />
              <Label htmlFor="userExists" className="text-gray-300 cursor-pointer">
                Usuário já existe no sistema
              </Label>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Permissions */}
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-semibold mb-2">Permissões Personalizadas</h3>
              <p className="text-sm text-gray-400 mb-4">
                Ajuste as permissões específicas para este membro (opcional)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(permissions) as Array<keyof TeamPermissions>).map((module) => (
                <Card key={module} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white">{getModuleLabel(module)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getModuleActions(module).map((action) => {
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
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="bg-gray-800 border-gray-700 text-gray-300">
            Cancelar
          </Button>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!email || inviteMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {inviteMutation.isPending ? "Enviando..." : "Enviar Convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

