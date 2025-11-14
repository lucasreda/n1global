import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentOperation } from "./use-current-operation";
import { useAuth } from "./use-auth";

export interface Permissions {
  dashboard?: { view?: boolean; export?: boolean };
  orders?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  products?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  ads?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  integrations?: { view?: boolean; edit?: boolean };
  settings?: { view?: boolean; edit?: boolean };
  team?: { view?: boolean; invite?: boolean; manage?: boolean };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'viewer';
  permissions?: Permissions;
  invitedAt?: string;
  invitedBy?: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  permissions?: Permissions;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy?: string;
}

export interface TeamData {
  members: TeamMember[];
  invitations: PendingInvitation[];
}

export function useTeamData() {
  const { selectedOperation } = useCurrentOperation();

  return useQuery<TeamData>({
    queryKey: ['/api/operations', selectedOperation, 'team'],
    queryFn: async () => {
      if (!selectedOperation) {
        throw new Error("Nenhuma operação selecionada");
      }
      return apiRequest(`/api/operations/${selectedOperation}/team`, 'GET');
    },
    enabled: !!selectedOperation,
  });
}

export function useHasPermission(module: string, action: string): boolean {
  const { data: teamData } = useTeamData();
  const { user } = useAuth(); // Assuming useAuth exists
  
  // For now, return true if user is owner or admin
  // In a real implementation, you'd check the user's permissions from teamData
  if (!teamData) return false;
  
  const member = teamData.members.find(m => m.id === user?.id);
  if (!member) return false;
  
  if (member.role === 'owner' || member.role === 'admin') {
    return true;
  }
  
  // Check granular permissions
  const modulePermissions = member.permissions?.[module as keyof Permissions];
  return modulePermissions?.[action as keyof typeof modulePermissions] === true;
}

// Helper to check if user can manage team
export function useCanManageTeam(): boolean {
  const { data: teamData } = useTeamData();
  const { user } = useAuth();
  
  if (!teamData || !user) return false;
  
  const member = teamData.members.find(m => m.id === user.id);
  return member?.role === 'owner' || member?.role === 'admin';
}
