import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';
import es from '../locales/es.json';

// Map language codes
const languageMap: Record<string, string> = {
  'pt': 'pt-BR',
  'pt-BR': 'pt-BR',
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'es': 'es',
  'es-ES': 'es',
  'es-MX': 'es',
};

// Normalize language code
function normalizeLanguage(lang: string | null): string {
  if (!lang) return 'en';
  const normalized = languageMap[lang] || lang.split('-')[0];
  return languageMap[normalized] || 'en';
}

// Get language from localStorage or browser
function getInitialLanguage(): string {
  // First, check if user has saved preference in localStorage (from i18n)
  const savedLanguage = localStorage.getItem('preferred_language');
  if (savedLanguage && ['pt-BR', 'en', 'es'].includes(savedLanguage)) {
    return savedLanguage;
  }

  // Second, check if user object has preferredLanguage (user is authenticated)
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.preferredLanguage && ['pt-BR', 'en', 'es'].includes(user.preferredLanguage)) {
        // Also save it to preferred_language for i18n
        localStorage.setItem('preferred_language', user.preferredLanguage);
        return user.preferredLanguage;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }

  // If user is not authenticated, detect from browser
  // Check if user is authenticated
  const userData = localStorage.getItem('user');
  const isAuthenticated = !!userData;
  
  if (!isAuthenticated) {
    // Detect browser language for non-authenticated users
    const browserLang = navigator.language || (navigator as any).userLanguage;
    const normalized = normalizeLanguage(browserLang);
    
    // Only return if it's a supported language, otherwise default to English
    if (['pt-BR', 'en', 'es'].includes(normalized)) {
      return normalized;
    }
    // Default to English for unsupported languages
    return 'en';
  }

  // For authenticated users without preference, default to pt-BR (existing behavior)
  return 'pt-BR';
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': {
        translation: ptBR,
      },
      'en': {
        translation: en,
      },
      'es': {
        translation: es,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    supportedLngs: ['pt-BR', 'en', 'es'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred_language',
    },
  });

// Function to change language
export function changeLanguage(lang: 'pt-BR' | 'en' | 'es') {
  i18n.changeLanguage(lang);
  localStorage.setItem('preferred_language', lang);
}

export default i18n;

