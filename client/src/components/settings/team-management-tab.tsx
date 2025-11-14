import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useOperationPermissions } from "@/hooks/use-operation-permissions";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, Mail, Clock, Edit, Trash2, RefreshCw, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale/pt";
import { InviteMemberModal } from "./invite-member-modal";
import { EditMemberPermissionsModal } from "./edit-member-permissions-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  permissions: any;
  invitedAt?: string | null;
  invitedBy?: string | null;
  isOwner?: boolean; // Indica se é o proprietário criador da operação
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  permissions: any;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy?: string;
}

export function TeamManagementTab() {
  const { selectedOperation } = useCurrentOperation();
  const { user } = useAuth();
  const { canManageTeam, canInviteTeam } = useOperationPermissions();
  const { toast } = useToast();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Query for team data - must be at the top level, not conditional
  const { data: teamData, isLoading, error: teamError } = useQuery<{
    ownerId: string | null;
    members: TeamMember[];
    invitations: PendingInvitation[];
  }>({
    queryKey: ['/api/operations', selectedOperation, 'team'],
    enabled: !!selectedOperation && selectedOperation !== '',
    retry: false,
  });

  // All mutations must be declared before any conditional returns
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!selectedOperation) throw new Error("Operação não selecionada");
      const res = await apiRequest(
        `/api/operations/${selectedOperation}/team/invite/${invitationId}/resend`,
        'POST'
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Convite reenviado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations', selectedOperation, 'team'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao reenviar convite",
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!selectedOperation) throw new Error("Operação não selecionada");
      const res = await apiRequest(
        `/api/operations/${selectedOperation}/team/invite/${invitationId}`,
        'DELETE'
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Convite cancelado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations', selectedOperation, 'team'] });
      setInvitationToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar convite",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedOperation) throw new Error("Operação não selecionada");
      const res = await apiRequest(
        `/api/operations/${selectedOperation}/team/${userId}`,
        'DELETE'
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Membro removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations', selectedOperation, 'team'] });
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover membro",
        variant: "destructive",
      });
    },
  });

  // Early return after all hooks are called
  if (!selectedOperation || selectedOperation === '') {
    return (
      <div className="text-center py-12 w-full">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Selecione uma operação</h3>
        <p className="text-gray-400">Por favor, selecione uma operação para gerenciar a equipe</p>
      </div>
    );
  }

  if (teamError) {
    console.error('Erro ao carregar equipe:', teamError);
    const errorMessage = teamError instanceof Error 
      ? teamError.message 
      : typeof teamError === 'string' 
        ? teamError 
        : 'Erro desconhecido ao carregar equipe';
    
    return (
      <div className="text-center py-12 w-full">
        <Users className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar equipe</h3>
        <p className="text-gray-400 mb-4">{errorMessage}</p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/operations', selectedOperation, 'team'] })}
          variant="outline"
          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      owner: { label: "Proprietário", variant: "default" },
      admin: { label: "Administrador", variant: "default" },
      viewer: { label: "Visualizador", variant: "secondary" },
    };
    const roleInfo = roleMap[role] || { label: role, variant: "secondary" as const };
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Data inválida';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      const locale = pt;
      return formatDistanceToNow(date, { addSuffix: true, locale });
    } catch {
      return 'Data inválida';
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 w-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando membros da equipe...</p>
        </div>
      </div>
    );
  }

  // Ensure we always have data structure
  const members = Array.isArray(teamData?.members) ? teamData.members : [];
  const invitations = Array.isArray(teamData?.invitations) ? teamData.invitations : [];

  return (
    <div className="space-y-6 w-full">
      {/* Header with Invite Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Membros da Equipe</h2>
          <p className="text-gray-400 mt-1">
            Gerencie quem tem acesso a esta operação
          </p>
        </div>
        {canInviteTeam() && (
          <Button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Membro
          </Button>
        )}
      </div>

      {/* Team Members */}
      <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros ({members.length})
          </CardTitle>
          <CardDescription className="text-gray-400">
            Pessoas com acesso a esta operação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-black/10 border border-white/5 rounded-lg hover:bg-black/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">{member.name || 'Nome não disponível'}</p>
                      <p className="text-sm text-gray-400">{member.email || 'Email não disponível'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getRoleBadge(member.role)}
                    {member.isOwner && (
                      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                        Criador
                      </Badge>
                    )}
                    <div className="flex items-center gap-2">
                      {canManageTeam() && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMemberToEdit(member);
                              setShowEditModal(true);
                            }}
                            disabled={member.isOwner || (member.id === user?.id && !canManageTeam())}
                            className="text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                            title={
                              member.isOwner
                                ? "O proprietário criador da operação não pode ser editado"
                                : member.id === user?.id
                                ? "Você não tem permissão para editar seu próprio acesso"
                                : "Editar membro"
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!member.isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberToRemove(member)}
                              className="text-red-400 hover:text-red-500"
                              title="Remover membro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {member.isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="text-gray-600 cursor-not-allowed"
                              title="O proprietário criador da operação não pode ser removido"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {!canManageTeam() && (
                        <span className="text-xs text-gray-500">Sem permissão para gerenciar</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum membro encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Convites Pendentes ({invitations.length})
          </CardTitle>
          <CardDescription className="text-gray-400">
            Convites aguardando aceitação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 bg-black/10 border border-white/5 rounded-lg hover:bg-black/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{invitation.email || 'Email não disponível'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(invitation.role || 'viewer')}
                        {invitation.invitedBy && (
                          <span className="text-xs text-gray-400">
                            Convidado por {invitation.invitedBy}
                          </span>
                        )}
                      </div>
                      {(invitation.createdAt || invitation.expiresAt) && (
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {invitation.createdAt && `Enviado ${formatDate(invitation.createdAt)}`}
                            {invitation.createdAt && invitation.expiresAt && ' • '}
                            {invitation.expiresAt && `Expira ${formatDate(invitation.expiresAt)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resendInvitationMutation.mutate(invitation.id)}
                      disabled={resendInvitationMutation.isPending}
                      className="text-gray-400 hover:text-white"
                    >
                      <RefreshCw className={`h-4 w-4 ${resendInvitationMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInvitationToDelete(invitation.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum convite pendente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          operationId={selectedOperation!}
        />
      )}

      {/* Edit Member Permissions Modal */}
      {showEditModal && memberToEdit && (
        <EditMemberPermissionsModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setMemberToEdit(null);
          }}
          member={memberToEdit}
          operationId={selectedOperation!}
        />
      )}

      {/* Delete Invitation Dialog */}
      <AlertDialog open={!!invitationToDelete} onOpenChange={(open) => !open && setInvitationToDelete(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cancelar Convite</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja cancelar este convite? O usuário não poderá mais aceitá-lo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (invitationToDelete) {
                  cancelInvitationMutation.mutate(invitationToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancelar Convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remover Membro</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja remover {memberToRemove?.name} desta operação? Ele perderá todo acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (memberToRemove) {
                  removeMemberMutation.mutate(memberToRemove.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

