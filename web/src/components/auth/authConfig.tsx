import { Landmark, Home, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

export type B2BSector = "banca" | "constructora" | "comercio";
export type AuthMode = "login" | "register";
export type SubmitState = "idle" | "loading" | "done";
export type AccentColor = "emerald" | "blue" | "amber" | "cyan";

// ─── Bank product taxonomy for B2C registration ────────────────

export const BANK_PRODUCTS: readonly { value: string; label: string }[] = [
  { value: "cuenta_ahorros", label: "Cuenta de Ahorros" },
  { value: "cuenta_corriente", label: "Cuenta Corriente" },
  { value: "tarjeta_credito", label: "Tarjeta de Crédito" },
  { value: "cdt", label: "CDT" },
  { value: "credito_hipotecario", label: "Crédito Hipotecario" },
  { value: "credito_libre_inversion", label: "Crédito de Libre Inversión" },
] as const;

// ─── ID types ──────────────────────────────────────────────────

export const ID_TYPES: readonly { id: string; label: string }[] = [
  { id: "cc", label: "Cédula de Ciudadanía" },
  { id: "ce", label: "Cédula de Extranjería" },
  { id: "nit", label: "NIT" },
  { id: "pasaporte", label: "Pasaporte" },
] as const;

// ─── B2B Sector config ─────────────────────────────────────────

export interface B2BSectorConfig {
  id: B2BSector;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  placeholder: string;
  roleValue: string;
  themeColor: AccentColor;
}

export const B2B_SECTORS: readonly B2BSectorConfig[] = [
  {
    id: "banca",
    label: "Bancos",
    icon: Landmark,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    placeholder: "Ej: Bancolombia S.A.",
    roleValue: "Banco",
    themeColor: "emerald",
  },
  {
    id: "constructora",
    label: "Constructoras",
    icon: Home,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    placeholder: "Ej: Marval S.A.",
    roleValue: "Constructora",
    themeColor: "blue",
  },
  {
    id: "comercio",
    label: "Comercios",
    icon: Store,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    placeholder: "Ej: AutoMercado Premium S.A.",
    roleValue: "Comercio",
    themeColor: "amber",
  },
] as const;

export function getSectorConfig(sector: B2BSector): B2BSectorConfig {
  return B2B_SECTORS.find((s) => s.id === sector)!;
}

// ─── Theme system ──────────────────────────────────────────────

export interface ThemeConfig {
  button: string;
  accent: string;
  accentHover: string;
  indicator: string;
  indicatorGlow: string;
  iconBg: string;
  iconBorder: string;
  recoveryBg: string;
  recoveryBorder: string;
  recoveryAccent: string;
  recoveryButton: string;
  recoveryIconColor: string;
  glowClass: string;
}

export const THEMES: Record<AccentColor, ThemeConfig> = {
  emerald: {
    button: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20",
    accent: "text-emerald-400",
    accentHover: "hover:text-emerald-300",
    indicator: "bg-emerald-500",
    indicatorGlow: "shadow-[0_0_6px_hsl(160_84%_39%/0.4)]",
    iconBg: "bg-emerald-500/10",
    iconBorder: "border-emerald-500/20",
    recoveryBg: "bg-emerald-500/10",
    recoveryBorder: "border-emerald-500/20",
    recoveryAccent: "text-emerald-400 hover:text-emerald-300",
    recoveryButton: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20",
    recoveryIconColor: "text-emerald-400",
    glowClass: "glow-green",
  },
  blue: {
    button: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20",
    accent: "text-blue-400",
    accentHover: "hover:text-blue-300",
    indicator: "bg-blue-500",
    indicatorGlow: "shadow-[0_0_6px_hsl(217_91%_60%/0.4)]",
    iconBg: "bg-blue-500/10",
    iconBorder: "border-blue-500/20",
    recoveryBg: "bg-blue-500/10",
    recoveryBorder: "border-blue-500/20",
    recoveryAccent: "text-blue-400 hover:text-blue-300",
    recoveryButton: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20",
    recoveryIconColor: "text-blue-400",
    glowClass: "glow-blue",
  },
  amber: {
    button: "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20",
    accent: "text-amber-400",
    accentHover: "hover:text-amber-300",
    indicator: "bg-amber-500",
    indicatorGlow: "shadow-[0_0_6px_hsl(38_92%_50%/0.4)]",
    iconBg: "bg-amber-500/10",
    iconBorder: "border-amber-500/20",
    recoveryBg: "bg-amber-500/10",
    recoveryBorder: "border-amber-500/20",
    recoveryAccent: "text-amber-400 hover:text-amber-300",
    recoveryButton: "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20",
    recoveryIconColor: "text-amber-400",
    glowClass: "glow-amber",
  },
  cyan: {
    button: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20",
    accent: "text-cyan-400",
    accentHover: "hover:text-cyan-300",
    indicator: "bg-cyan-500",
    indicatorGlow: "shadow-[0_0_6px_hsl(189_94%_43%/0.4)]",
    iconBg: "bg-cyan-500/10",
    iconBorder: "border-cyan-500/20",
    recoveryBg: "bg-cyan-500/10",
    recoveryBorder: "border-cyan-500/20",
    recoveryAccent: "text-cyan-400 hover:text-cyan-300",
    recoveryButton: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20",
    recoveryIconColor: "text-cyan-400",
    glowClass: "",
  },
};

export function getTheme(color: AccentColor): ThemeConfig {
  return THEMES[color];
}
