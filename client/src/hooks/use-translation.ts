import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

export function useTranslation(namespace?: string) {
  const { t, i18n } = useI18nTranslation(namespace);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language as 'pt-BR' | 'en' | 'es');
  
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng as 'pt-BR' | 'en' | 'es');
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  return {
    t,
    i18n,
    currentLanguage,
  };
}

