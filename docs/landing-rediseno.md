# Rediseño LandingHub — plan aprobado, pendiente de ejecución

Diagnóstico hecho el 2026-07-17 sobre `web/src/pages/LandingHub.tsx` (home público de Neggo). Puntos 1 y 2 ya implementados y probados (`tsc`/tests/lint limpios); 3 y 4 quedan pendientes para la próxima sesión.

## 1. Agregar la 4ta tarjeta faltante: "Soy un Comercio" — ✅ COMPLETADO

`LandingHub.tsx` solo mostraba 3 `AudienceCard` en "Elige tu perfil" (Banco, Constructora, Cliente). Existe una 4ta vertical real con dashboard y landing propios (`CorporativoComercios.tsx` en `/corporativo/comercios`) que quedaba huérfana — no estaba enlazada ni en "Elige tu perfil" ni en el footer del Hub.

Implementado: 4ta `AudienceCard` ("Soy un Comercio", ícono `Store`, acento `purple`, tag "Aliado") entre Constructora y Cliente — agrupa las 3 verticales B2B antes del B2C. Grid pasó de `lg:grid-cols-3` fijo a `sm:grid-cols-2 lg:grid-cols-4` responsive. Link agregado en el footer junto a los otros 3.

## 2. Reemplazar el Trust bar genérico — ✅ COMPLETADO

Antes (`LandingHub.tsx`, sección Trust bar): "Cumplimiento 100%", "Latencia <50ms", "Precisión 99.7%", "Bancos 6+" — números de marketing sin ninguna fuente real detrás.

Implementado (mismo patrón visual: ícono + valor en mono + label + descripción):
- MFA — "TOTP obligatorio en cuentas B2B".
- 24 — "Tablas con RLS, 37 políticas de seguridad auditadas".
- Realtime — "Eventos entregados al instante" (notificaciones).
- Ley 1581 — "Registro validado, protección de datos personales".

## 3. Reemplazar beneficios genéricos por diferenciadores reales, por vertical — PENDIENTE

**Bancos:**
- Scoring Datacrédito real (no simulado).
- Success Fee 2.25% versionado por tarifa (histórico de cambios, nunca se pisa una tarifa vieja).
- Pipeline con estados reales (`solicitudes_banca`), no una demo.

**Constructoras:**
- Algoritmo de equidad 40-30-20-10 para distribución de leads entre proyectos.
- Matching por capacidad de compra real del cliente, no un formulario genérico.

**Comercios:**
- Sello de Confianza Neggo (verificación real, emitido por Admin — no autodeclarado).
- Comisión transparente por plan de negociación (`planes_comercio`).
- Notificación en tiempo real (Realtime) al responder una oferta — el comercio se entera al instante, sin recargar.

**Clientes:**
- Bóveda del Cliente (facturas reales asociadas a sus compras).
- Ofertas comparadas de múltiples bancos/comercios en un solo lugar.
- Código anti-phishing único por sesión, derivado del id real del cliente (no compartido entre usuarios).
- Banca privada con selector de bancos aprobados real (vía RPC `bancos_aprobados_publicos`, no un listado hardcodeado).

## 4. Decisión sobre el hero: quitar el conteo mock — PENDIENTE

El hero hoy calcula sus `AnimatedStat` (`totalLeads`, `avgScore`, `activeCampaigns + activeProjects`) desde `leads`, `campaigns`, `proyectos`, `leadsInmobiliarios` importados de `@/data/mock` — datos ficticios, no reales. Decisión: **quitar el conteo**, no inventar una cifra ni conectar una fuente real todavía (no existe hoy una vista/RPC pública agregada para esto). Reemplazar por copy cualitativo en su lugar — mismo criterio de honestidad ya aplicado en el resto de la auditoría (portal de clientes, badges de navegación, RLS).

## 5. Sistema de diseño — reutilizar, no crear nada nuevo

Confirmado que ya existe y está listo para usar sin librerías nuevas:
- Tokens de Tailwind (`tailwind.config.ts`) vía variables CSS HSL — tema dark-only ya definido en `index.css`.
- Paleta "fintech premium": verde esmeralda como primario (`--primary: 160 84% 39%`), acentos amber/rose/slate, utilidades `.glow-green`/`.glow-amber`.
- Tipografía Inter (texto) + JetBrains Mono (cifras).
- 49 componentes base de shadcn/ui ya instalados en `components/ui/`.

El rediseño debe apoyarse enteramente en esto — es el mismo lenguaje visual que ya usan los dashboards internos (Banco/Constructora/Comercio/Admin).
