import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { changeLanguage } from '@/lib/i18n';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

const languages = [
  {
    code: 'pt-BR' as const,
    name: 'Português (Brasil)',
    flag: '🇧🇷',
    nativeName: 'Português',
  },
  {
    code: 'en' as const,
    name: 'English',
    flag: '🇺🇸',
    nativeName: 'English',
  },
  {
    code: 'es' as const,
    name: 'Español',
    flag: '🇪🇸',
    nativeName: 'Español',
  },
];

export default function LanguageSelection() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<'pt-BR' | 'en' | 'es' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageSelect = async (langCode: 'pt-BR' | 'en' | 'es') => {
    if (isSaving) return;
    
    setSelectedLanguage(langCode);
    setIsSaving(true);

    try {
      // Change language immediately in i18n
      changeLanguage(langCode);

      // Save to backend
      const response = await apiRequest('/api/user/preferred-language', 'PUT', {
        preferredLanguage: langCode,
      });

      if (!response.ok) {
        throw new Error('Failed to save language preference');
      }

      // Update user in localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.preferredLanguage = langCode;
        localStorage.setItem('user', JSON.stringify(user));
      }

      toast({
        title: t('common.success'),
        description: t('language.select'),
      });

      // Redirect to onboarding or dashboard
      // Check if user needs onboarding
      const onboardingStatus = await apiRequest('/api/user/onboarding-status', 'GET');
      const onboardingData = await onboardingStatus.json();
      
      if (!onboardingData.onboardingCompleted && user?.role !== 'supplier' && user?.role !== 'super_admin') {
        setLocation('/onboarding');
      } else {
        // Redirect based on role
        if (user?.role === 'super_admin') {
          setLocation('/inside');
        } else if (user?.role === 'supplier') {
          setLocation('/supplier');
        } else {
          setLocation('/');
        }
      }
    } catch (error) {
      console.error('Error saving language preference:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to save language preference. Please try again.',
        variant: 'destructive',
      });
      setIsSaving(false);
      setSelectedLanguage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020817] via-[#0a1120] to-[#020817] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t('language.title')}
          </h1>
          <p className="text-gray-400 text-lg">
            {t('language.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {languages.map((lang) => (
            <Card
              key={lang.code}
              className={`bg-black/40 border-2 transition-all cursor-pointer hover:scale-105 hover:border-blue-500 ${
                selectedLanguage === lang.code
                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                  : 'border-white/10'
              } ${isSaving && selectedLanguage !== lang.code ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => handleLanguageSelect(lang.code)}
            >
              <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="text-6xl mb-2">{lang.flag}</div>
                <h3 className="text-2xl font-bold text-white">{lang.nativeName}</h3>
                <p className="text-gray-400">{lang.name}</p>
                {selectedLanguage === lang.code && isSaving && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedLanguage && !isSaving && (
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              {t('language.select')}: <span className="text-white font-semibold">
                {languages.find(l => l.code === selectedLanguage)?.nativeName}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}



