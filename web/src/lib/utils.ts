import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Quita tildes/diacríticos y normaliza a minúsculas — para comparar ciudad como texto libre sin exigir coincidencia exacta de mayúsculas/acentos. */
export function normalizeCiudad(ciudad: string): string {
  return ciudad
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .trim()
    .toLowerCase();
}

/** Formato canónico de pesos colombianos, sin decimales — montos exactos (facturas, tarifas, KPIs). */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formato abreviado (M/MMM) para montos grandes en tarjetas donde el espacio es limitado — no usar para montos exactos. */
export function formatCOPCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}MMM`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toLocaleString('es-CO')}`;
}
