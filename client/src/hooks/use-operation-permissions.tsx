import { useQuery } from "@tanstack/react-query";
import { useCurrentOperation } from "./use-current-operation";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

interface OperationPermissions {
  dashboard?: { view?: boolean; export?: boolean };
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
  const currentUserAccess = teamData?.members.find(
    (member) => member.id === user?.id
  );

  // Helper functions
  const hasPermission = (module: keyof OperationPermissions, action: string): boolean => {
    if (!currentUserAccess) return false;
    
    // Owners and admins have all permissions
    if (currentUserAccess.role === 'owner' || currentUserAccess.role === 'admin') {
      return true;
    }

    // Check granular permissions
    const modulePermissions = currentUserAccess.permissions?.[module];
    if (!modulePermissions) {
      // Viewer role without specific permissions has view-only access
      return action === 'view';
    }

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
    role: currentUserAccess?.role || null,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManageTeam,
    canInviteTeam,
    isOwner: currentUserAccess?.role === 'owner',
    isAdmin: currentUserAccess?.role === 'admin',
    isViewer: currentUserAccess?.role === 'viewer',
  };
}

