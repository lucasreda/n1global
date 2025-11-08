import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Mail, Camera, X, Loader2, Key } from "lucide-react";
import { ChangePasswordDialog } from "@/components/dashboard/change-password-dialog";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
}

export default function Profile() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Fetch user profile
  const { data: profile, isLoading, error: profileError } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/user/profile", "GET");
        
        // Log response status
        console.log("📋 Response status:", res.status);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Erro na resposta:", res.status, errorText);
          let errorMessage = `Erro ao buscar perfil: ${res.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const data = await res.json();
        console.log("✅ Dados do perfil recebidos:", data);
        return data;
      } catch (error) {
        console.error("❌ Erro ao buscar perfil:", error);
        throw error;
      }
    },
    enabled: !!authUser,
    retry: false, // Desabilitar retry para ver erro imediatamente
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string; phone?: string }) => {
      const res = await apiRequest("/api/user/profile", "PATCH", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditing(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Erro ao atualizar perfil";
      toast({
        title: "Erro ao atualizar",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao fazer upload");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer upload",
        description: error?.message || "Falha ao fazer upload da imagem.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  // Remove avatar mutation
  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/user/avatar", "DELETE");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Foto removida",
        description: "Sua foto de perfil foi removida.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover",
        description: "Falha ao remover a foto de perfil.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      toast({
        title: "Nome inválido",
        description: "O nome deve ter pelo menos 2 caracteres.",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
    });
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
    setIsEditing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Apenas imagens JPG, PNG e WEBP são permitidas.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    uploadAvatarMutation.mutate(file);
  };

  const handleRemoveAvatar = () => {
    if (confirm("Tem certeza que deseja remover sua foto de perfil?")) {
      removeAvatarMutation.mutate();
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-red-400">Erro ao carregar perfil</p>
        <p className="text-gray-400 text-sm">
          {profileError instanceof Error ? profileError.message : "Erro desconhecido"}
        </p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] })}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-white">Perfil não encontrado</p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] })}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Recarregar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Minha Conta" 
        subtitle="Gerencie suas informações pessoais e preferências" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Section */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Foto de Perfil</CardTitle>
            <CardDescription className="text-gray-400">
              Adicione uma foto para personalizar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              {/* Avatar Display */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden border-4 border-white/10">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {getUserInitials(profile.name)}
                    </span>
                  )}
                </div>
                
                {/* Upload Overlay */}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Upload Buttons */}
              <div className="flex flex-col gap-2 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  variant="default"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {isUploadingAvatar ? "Enviando..." : "Alterar Foto"}
                </Button>
                
                {profile.avatarUrl && (
                  <Button
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar || removeAvatarMutation.isPending}
                    className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30"
                    variant="outline"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remover Foto
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Formatos aceitos: JPG, PNG, WEBP<br />
                Tamanho máximo: 5MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="lg:col-span-2 bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Informações Pessoais</CardTitle>
            <CardDescription className="text-gray-400">
              Atualize suas informações de contato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300 flex items-center">
                <User className="mr-2 h-4 w-4" />
                Nome Completo
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300 flex items-center">
                <Phone className="mr-2 h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                placeholder="+55 11 99999-9999"
              />
              <p className="text-xs text-gray-400">
                Formato internacional opcional (ex: +55 11 99999-9999)
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Editar Informações
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={updateProfileMutation.isPending}
                    variant="outline"
                    className="border-white/10 text-gray-300 hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Section */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Segurança</CardTitle>
          <CardDescription className="text-gray-400">
            Gerencie sua senha e configurações de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowChangePasswordDialog(true)}
            variant="outline"
            className="border-white/10 text-gray-300 hover:bg-white/10"
          >
            <Key className="mr-2 h-4 w-4" />
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}
      />
    </div>
  );
}

