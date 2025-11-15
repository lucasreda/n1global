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
import { User, Phone, Mail, Camera, X, Loader2, Key, Globe } from "lucide-react";
import { ChangePasswordDialog } from "@/components/dashboard/change-password-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import { changeLanguage } from "@/lib/i18n";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage?: string | null;
}

export default function Profile() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { t, currentLanguage } = useTranslation();
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
          let errorMessage = `${t('profile.errorFetchingProfile')}: ${res.status}`;
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
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdatedDescription'),
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || t('profile.errorUpdatingDescription');
      toast({
        title: t('profile.errorUpdating'),
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
        throw new Error(error.message || t('profile.errorUploadingDescription'));
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: t('profile.photoUpdated'),
        description: t('profile.photoUpdatedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('profile.errorUploading'),
        description: error?.message || t('profile.errorUploadingDescription'),
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
        title: t('profile.photoRemoved'),
        description: t('profile.photoRemovedDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('profile.errorRemoving'),
        description: t('profile.errorRemovingDescription'),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      toast({
        title: t('profile.invalidName'),
        description: t('profile.invalidNameDescription'),
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
        title: t('profile.invalidFormat'),
        description: t('profile.invalidFormatDescription'),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('profile.fileTooLarge'),
        description: t('profile.fileTooLargeDescription'),
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    uploadAvatarMutation.mutate(file);
  };

  const handleRemoveAvatar = () => {
    if (confirm(t('profile.confirmRemovePhoto'))) {
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
        <p className="text-red-400">{t('profile.errorLoadingProfile')}</p>
        <p className="text-gray-400 text-sm">
          {profileError instanceof Error ? profileError.message : t('profile.unknownError')}
        </p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] })}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {t('profile.tryAgain')}
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-white">{t('profile.profileNotFound')}</p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] })}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {t('profile.reload')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={t('profile.title')} 
        subtitle={t('profile.subtitle')} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Section */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">{t('profile.profilePhoto')}</CardTitle>
            <CardDescription className="text-gray-400">
              {t('profile.addPhotoDescription')}
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
                  {isUploadingAvatar ? t('profile.uploading') : t('profile.changePhoto')}
                </Button>
                
                {profile.avatarUrl && (
                  <Button
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar || removeAvatarMutation.isPending}
                    className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30"
                    variant="outline"
                  >
                    <X className="mr-2 h-4 w-4" />
                    {t('profile.removePhoto')}
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                {t('profile.acceptedFormats')}<br />
                {t('profile.maxSize')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="lg:col-span-2 bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">{t('profile.personalInfo')}</CardTitle>
            <CardDescription className="text-gray-400">
              {t('profile.updateContactInfo')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300 flex items-center">
                <User className="mr-2 h-4 w-4" />
                {t('profile.fullName')}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                placeholder={t('profile.fullNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                {t('profile.email')}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                placeholder={t('profile.emailPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300 flex items-center">
                <Phone className="mr-2 h-4 w-4" />
                {t('profile.phone')}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                placeholder={t('profile.phonePlaceholder')}
              />
              <p className="text-xs text-gray-400">
                {t('profile.phoneFormatHint')}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t('profile.editInfo')}
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
                        {t('profile.saving')}
                      </>
                    ) : (
                      t('profile.saveChanges')
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={updateProfileMutation.isPending}
                    variant="outline"
                    className="border-white/10 text-gray-300 hover:bg-white/10"
                  >
                    {t('profile.cancel')}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Language Preference Section */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('profile.languagePreference')}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t('profile.selectLanguage')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <LanguageSelector 
            currentLanguage={profile?.preferredLanguage || currentLanguage || 'pt-BR'} 
            onLanguageChange={(lang) => {
              // Update will be handled by the component
            }}
          />
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">{t('profile.security')}</CardTitle>
          <CardDescription className="text-gray-400">
            {t('profile.securityDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowChangePasswordDialog(true)}
            variant="outline"
            className="border-white/10 text-gray-300 hover:bg-white/10"
          >
            <Key className="mr-2 h-4 w-4" />
            {t('profile.changePasswordButton')}
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

// Language Selector Component
function LanguageSelector({ 
  currentLanguage, 
  onLanguageChange 
}: { 
  currentLanguage: string; 
  onLanguageChange?: (lang: string) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const languages = [
    { code: 'pt-BR', label: t('language.portuguese') },
    { code: 'en', label: t('language.english') },
    { code: 'es', label: t('language.spanish') },
  ];

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === currentLanguage) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch('/api/user/preferred-language', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          preferredLanguage: newLanguage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update language preference';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Update i18n immediately
      changeLanguage(newLanguage as 'pt-BR' | 'en' | 'es');

      // Update user in localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.preferredLanguage = newLanguage;
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      toast({
        title: t('common.success'),
        description: result.message || t('language.changeLanguage'),
      });

      onLanguageChange?.(newLanguage);
    } catch (error: any) {
      console.error('Error updating language:', error);
      const errorMessage = error?.message || 'Failed to update language preference';
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Ensure currentLanguage is valid
  const validLanguage = currentLanguage && ['pt-BR', 'en', 'es'].includes(currentLanguage) 
    ? currentLanguage 
    : 'pt-BR';

  return (
    <div className="space-y-2">
      <Label htmlFor="language" className="text-gray-300 flex items-center">
        <Globe className="mr-2 h-4 w-4" />
        {t('language.select')}
      </Label>
      <Select
        value={validLanguage}
        onValueChange={handleLanguageChange}
        disabled={isUpdating}
      >
        <SelectTrigger 
          id="language"
          className="bg-black/20 border-white/10 text-white"
        >
          <SelectValue placeholder={t('language.select')} />
        </SelectTrigger>
        <SelectContent className="bg-black/95 border-white/10">
          {languages.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              className="text-white hover:bg-white/10"
            >
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isUpdating && (
        <p className="text-xs text-gray-400 flex items-center">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          {t('common.loading')}
        </p>
      )}
    </div>
  );
}

