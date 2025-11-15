import { useQuery } from "@tanstack/react-query";
import { useCurrentOperation } from "./use-current-operation";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

interface OperationPermissions {
  dashboard?: { view?: boolean; export?: boolean };
  hub?: { view?: boolean; export?: boolean };
  orders?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  products?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  ads?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  integrations?: { view?: boolean; edit?: boolean };
  settings?: { view?: boolean; edit?: boolean };
  team?: { view?: boolean; invite?: boolean; manage?: boolean };
}

interface UserOperationAccess {
  role: string;
  permissions: OperationPermissions | null;
}

/**
 * Hook to get current user's permissions for the selected operation
 */
export function useOperationPermissions() {
  const { selectedOperation } = useCurrentOperation();
  const { user } = useAuth();

  // Fetch team data to get current user's permissions
  const { data: teamData, isLoading } = useQuery<{
    ownerId: string | null;
    members: Array<{
      id: string;
      role: string;
      permissions: OperationPermissions | null;
    }>;
    invitations: any[];
  }>({
    queryKey: ['/api/operations', selectedOperation, 'team'],
    enabled: !!selectedOperation && !!user,
    retry: false,
  });

  // Find current user's access in the team members
  let currentUserAccess = teamData?.members.find(
    (member) => member.id === user?.id
  );

  // CRITICAL: Se o usuário não foi encontrado na lista de membros, verificar se é o owner
  // através do ownerId retornado pela API. Permissões de equipe não se aplicam ao proprietário.
  const isOwnerById = teamData?.ownerId && user?.id && teamData.ownerId === user.id;
  
  if (!currentUserAccess && isOwnerById) {
    // Se o usuário é o owner mas não está na lista de membros, criar objeto de acesso
    // O owner tem todas as permissões por padrão
    currentUserAccess = {
      id: user.id,
      role: 'owner',
      permissions: {
        dashboard: { view: true, export: true },
        hub: { view: true, export: true },
        orders: { view: true, create: true, edit: true, delete: true },
        products: { view: true, create: true, edit: true, delete: true },
        ads: { view: true, create: true, edit: true, delete: true },
        integrations: { view: true, edit: true },
        settings: { view: true, edit: true },
        team: { view: true, invite: true, manage: true },
      },
    };
  }

  // Helper functions
  const hasPermission = (module: keyof OperationPermissions, action: string): boolean => {
    // Se o usuário é owner por ID mas não está na lista de membros
    if (isOwnerById && !currentUserAccess) {
      return true; // Owner tem todas as permissões
    }

    if (!currentUserAccess) {
      return false;
    }
    
    // CRITICAL: Owners têm todas as permissões, independente das configurações na tabela
    // Permissões de equipe não se aplicam ao proprietário
    if (currentUserAccess.role === 'owner' || isOwnerById) {
      return true;
    }
    
    // Admins também têm todas as permissões
    if (currentUserAccess.role === 'admin') {
      return true;
    }

    // CRITICAL: For viewers/employees, they need explicit permission for manage/invite
    // If no permissions object exists, they only have view access
    if (!currentUserAccess.permissions) {
      return action === 'view';
    }

    // Check granular permissions
    const modulePermissions = currentUserAccess.permissions[module];
    if (!modulePermissions) {
      // Employee/viewer role without specific permissions has view-only access
      return action === 'view';
    }

    // CRITICAL: For team module, viewers need explicit permission for manage/invite actions
    if (module === 'team' && currentUserAccess.role === 'viewer') {
      // Viewers can only view by default, need explicit permission for manage/invite
      if (action === 'view') {
        return true; // Viewers can always view team
      }
      // For manage/invite, must have explicit permission set to true
      // Check if the property exists and is explicitly true
      const actionValue = modulePermissions[action as keyof typeof modulePermissions];
      return actionValue === true;
    }

    // For other modules or roles, check if permission is explicitly true
    return modulePermissions[action as keyof typeof modulePermissions] === true;
  };

  const canView = (module: keyof OperationPermissions) => hasPermission(module, 'view');
  const canCreate = (module: keyof OperationPermissions) => hasPermission(module, 'create');
  const canEdit = (module: keyof OperationPermissions) => hasPermission(module, 'edit');
  const canDelete = (module: keyof OperationPermissions) => hasPermission(module, 'delete');
  const canManageTeam = () => hasPermission('team', 'manage');
  const canInviteTeam = () => hasPermission('team', 'invite');

  return {
    isLoading,
    permissions: currentUserAccess?.permissions || null,
    role: currentUserAccess?.role || (isOwnerById ? 'owner' : null),
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManageTeam,
    canInviteTeam,
    isOwner: currentUserAccess?.role === 'owner' || isOwnerById || false,
    isAdmin: currentUserAccess?.role === 'admin' || false,
    isViewer: currentUserAccess?.role === 'viewer' || false,
  };
}

