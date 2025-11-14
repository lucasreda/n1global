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
  const { user, isAuthenticated, login, checkAuth } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch invitation details - não requer autenticação
  const { data: invitationData, isLoading, error, isError } = useQuery({
    queryKey: [`/api/invitations/${token}`],
    queryFn: async () => {
      if (!token) {
        throw new Error('Token do convite não fornecido');
      }

      console.log('[Accept Invitation] Iniciando busca de convite com token:', token.substring(0, 20) + '...');
      
      // Criar um AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

      try {
        const url = `/api/invitations/${encodeURIComponent(token)}`;
        console.log('[Accept Invitation] URL da requisição:', url);
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        console.log('[Accept Invitation] Resposta recebida:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        });
        
        if (!res.ok) {
          let errorData: any = {};
          try {
            const text = await res.text();
            errorData = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error('[Accept Invitation] Erro ao parsear resposta de erro:', parseError);
          }
          
          console.error('[Accept Invitation] Erro na resposta:', {
            status: res.status,
            statusText: res.statusText,
            errorData
          });
          
          throw new Error(errorData.message || `Erro ao carregar convite: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('[Accept Invitation] Dados do convite recebidos:', data);
        
        if (!data || !data.invitation) {
          throw new Error('Resposta inválida do servidor: convite não encontrado nos dados');
        }
        
        return data;
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        if (err.name === 'AbortError') {
          console.error('[Accept Invitation] Requisição cancelada por timeout');
          throw new Error('Tempo de espera esgotado. Tente novamente.');
        }
        
        console.error('[Accept Invitation] Erro ao buscar convite:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
        
        throw err;
      }
    },
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
    gcTime: 0,
  });

  const invitation = invitationData?.invitation;

  // Verificar se usuário logado tem email diferente do convite
  useEffect(() => {
    if (isAuthenticated && user && invitation?.email && user.email !== invitation.email) {
      toast({
        title: "Email diferente",
        description: `Este convite é para ${invitation.email}, mas você está logado como ${user.email}. Faça logout para aceitar este convite.`,
        variant: "destructive",
      });
    }
  }, [isAuthenticated, user, invitation, toast]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!invitation) throw new Error("Convite não encontrado");

      // Se usuário está logado mas email não corresponde, não permitir aceitar
      if (isAuthenticated && user && user.email !== invitation.email) {
        throw new Error("Este convite é para outro email. Faça logout para aceitar este convite.");
      }

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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao aceitar convite');
      }

      return res.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Sucesso",
        description: "Convite aceito com sucesso!",
      });

      if (data.isNewUser && data.token) {
        // Nova conta criada - fazer login automático
        try {
          // Salvar token e fazer login usando o mesmo formato do authService
          localStorage.setItem('auth_token', data.token);
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          
          // Atualizar estado de autenticação
          checkAuth();
          
          // Redirecionar para dashboard após um breve delay
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } catch (loginError) {
          console.error('Erro ao fazer login automático:', loginError);
          // Se falhar o login automático, redirecionar para login
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else if (data.isNewUser && !data.token) {
        // Nova conta criada mas sem token - redirecionar para login
        toast({
          title: "Conta criada",
          description: "Por favor, faça login para continuar.",
        });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Usuário existente - recarregar autenticação e redirecionar
        checkAuth();
        setTimeout(() => {
          navigate('/');
        }, 1000);
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

  // Debug logs
  useEffect(() => {
    console.log('[Accept Invitation] Estado da query:', {
      isLoading,
      isError,
      error: error?.message,
      hasData: !!invitationData,
      hasInvitation: !!invitation,
      token: token?.substring(0, 20) + '...'
    });
  }, [isLoading, isError, error, invitationData, invitation, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-400">Carregando convite...</p>
              <p className="text-gray-500 text-sm mt-2">Aguarde enquanto buscamos as informações do convite</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || error || !invitationData || !invitation) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Accept Invitation] Exibindo tela de erro:', {
      isError,
      error: errorMessage,
      hasData: !!invitationData,
      hasInvitation: !!invitation
    });

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Convite Inválido</h2>
              <p className="text-gray-400 text-center mb-4">
                {errorMessage || 'Este convite não foi encontrado ou já expirou.'}
              </p>
              {process.env.NODE_ENV === 'development' && error && (
                <p className="text-gray-500 text-xs text-center mb-4 font-mono">
                  {errorMessage}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()} variant="outline" className="border-gray-600">
                  Tentar Novamente
                </Button>
                <Button onClick={() => navigate('/login')} className="bg-blue-600 hover:bg-blue-700">
                  Ir para Login
                </Button>
              </div>
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
            <div className={`rounded-lg p-4 ${
              user.email === invitation?.email 
                ? 'bg-blue-500/10 border border-blue-500/20' 
                : 'bg-yellow-500/10 border border-yellow-500/20'
            }`}>
              <p className={`text-sm ${
                user.email === invitation?.email ? 'text-blue-300' : 'text-yellow-300'
              }`}>
                {user.email === invitation?.email ? (
                  <>Você está logado como <strong>{user.email}</strong>. Ao aceitar, você será adicionado à operação.</>
                ) : (
                  <>Este convite é para <strong>{invitation?.email}</strong>, mas você está logado como <strong>{user.email}</strong>. Faça logout para aceitar este convite.</>
                )}
              </p>
            </div>
          )}

          {/* Accept Button */}
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={
              acceptMutation.isPending || 
              (!isAuthenticated && (!name || !password || password !== confirmPassword)) ||
              (isAuthenticated && user ? user.email !== invitation?.email : false)
            }
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
