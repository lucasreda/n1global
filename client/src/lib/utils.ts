import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency: string = 'EUR', locale: string = 'pt-BR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Map currencies to their appropriate locales
const currencyLocaleMap: Record<string, string> = {
  'BRL': 'pt-BR',  // Brazil
  'EUR': 'de-DE',  // Europe (Germany format is standard)
  'USD': 'en-US',  // United States
  'GBP': 'en-GB',  // United Kingdom
  'PLN': 'pl-PL',  // Poland
  'CZK': 'cs-CZ',  // Czech Republic
  'CHF': 'de-CH',  // Switzerland
  'SEK': 'sv-SE',  // Sweden
  'NOK': 'nb-NO',  // Norway
  'DKK': 'da-DK',  // Denmark
  'RON': 'ro-RO',  // Romania
  'HUF': 'hu-HU',  // Hungary
  'BGN': 'bg-BG',  // Bulgaria
  'TRY': 'tr-TR',  // Turkey
  'SAR': 'ar-SA',  // Saudi Arabia
  'AED': 'ar-AE',  // United Arab Emirates
};

// Formata valor baseado na moeda da operação (usa locale nativo da moeda)
export function formatOperationCurrency(value: number, currency: string = 'EUR'): string {
  const locale = currencyLocaleMap[currency] || 'en-US';
  return formatCurrency(value, currency, locale);
}
