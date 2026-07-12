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
