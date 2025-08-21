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

export function formatCurrencyBRL(value: number): string {
  return formatCurrency(value, 'BRL', 'pt-BR')
}

export function formatCurrencyEUR(value: number): string {
  return formatCurrency(value, 'EUR', 'pt-BR')
}
