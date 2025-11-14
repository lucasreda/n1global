import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch invitation details
  const { data: invitationData, isLoading, error } = useQuery({
    queryKey: [`/api/invitations/${token}`],
    queryFn: async () => {
      const res = await apiRequest(`/api/invitations/${token}`, 'GET');
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const invitation = invitationData?.invitation;

  // Check if user is already logged in and email matches
  useEffect(() => {
    if (isAuthenticated && user && invitation?.email === user.email) {
      // User is logged in and email matches, can accept directly
    }
  }, [isAuthenticated, user, invitation]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!invitation) throw new Error("Convite não encontrado");

      // If user is not logged in, need name and password
      if (!isAuthenticated) {
        if (!name || !password) {
          throw new Error("Nome e senha são obrigatórios");
        }
        if (password !== confirmPassword) {
          throw new Error("As senhas não coincidem");
        }
        if (password.length < 6) {
          throw new Error("A senha deve ter pelo menos 6 caracteres");
        }
      }

      const res = await apiRequest(`/api/invitations/${token}/accept`, 'POST', {
        name: isAuthenticated ? undefined : name,
        password: isAuthenticated ? undefined : password,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso",
        description: "Convite aceito com sucesso!",
      });

      if (data.isNewUser) {
        // New user created, redirect to login
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Existing user, redirect to dashboard
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aceitar convite",
        variant: "destructive",
      });
    },
  });

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      owner: { label: "Proprietário", variant: "default" },
      admin: { label: "Administrador", variant: "default" },
      viewer: { label: "Visualizador", variant: "secondary" },
    };
    const roleInfo = roleMap[role] || { label: role, variant: "secondary" as const };
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-400">Carregando convite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Convite Inválido</h2>
              <p className="text-gray-400 text-center mb-6">
                Este convite não foi encontrado ou já expirou.
              </p>
              <Button onClick={() => navigate('/login')} className="bg-blue-600 hover:bg-blue-700">
                Ir para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(invitation.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Convite Expirado</h2>
              <p className="text-gray-400 text-center">
                Este convite expirou. Entre em contato com o administrador para receber um novo convite.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <Mail className="h-12 w-12 text-blue-500" />
          </div>
          <CardTitle className="text-center text-white text-2xl">
            Convite para Equipe
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            Você foi convidado para participar da operação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 space-y-3">
            <div>
              <Label className="text-gray-400 text-sm">Operação</Label>
              <p className="text-white font-semibold">{invitation.operationName}</p>
            </div>
            <div>
              <Label className="text-gray-400 text-sm">Email</Label>
              <p className="text-white">{invitation.email}</p>
            </div>
            <div>
              <Label className="text-gray-400 text-sm">Função</Label>
              <div className="mt-1">{getRoleBadge(invitation.role)}</div>
            </div>
          </div>

          {/* Form for new users */}
          {!isAuthenticated && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white">
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-white">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-white">
                  Confirmar Senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
            </div>
          )}

          {/* Info for logged in users */}
          {isAuthenticated && user && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                Você está logado como <strong>{user.email}</strong>. Ao aceitar, você será adicionado à operação.
              </p>
            </div>
          )}

          {/* Accept Button */}
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending || (!isAuthenticated && (!name || !password || password !== confirmPassword))}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aceitando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aceitar Convite
              </>
            )}
          </Button>

          {!isAuthenticated && (
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-gray-400 hover:text-white"
              >
                Já tem uma conta? Faça login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
