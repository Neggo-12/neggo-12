# Rediseño LandingHub — ✅ COMPLETADO

Diagnóstico hecho el 2026-07-17 sobre `web/src/pages/LandingHub.tsx` (home público de Neggo). Los 4 puntos del plan quedaron implementados y probados (`tsc`/tests/lint limpios en cada ronda). El H1 del hero también se actualizó para reflejar las 4 verticales (Comercios había quedado fuera al agregar su tarjeta).

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

## 3. Reemplazar beneficios genéricos por diferenciadores reales, por vertical — ✅ COMPLETADO

**Bancos** (3 bullets):
- Scoring Datacrédito real, ya integrado.
- Tarifas por banco versionadas por periodo.
- Pipeline con estados reales (`solicitudes_banca`).

**Constructoras** (3 bullets):
- Success Fee 2.25% sobre cierre, en producción.
- Algoritmo de equidad 40-30-20-10 en la distribución de leads.
- Matching por capacidad de compra real del cliente.

**Comercios** (4 bullets — ya estaban consistentes en tono, sin cambios):
- Sello de Confianza Neggo verificado por Admin.
- Comisión transparente según tu plan de negociación.
- Notificación en tiempo real al responder una oferta.
- Conexión directa con clientes del ecosistema.

**Clientes** (4 bullets):
- Bóveda del Cliente con historial de compras.
- Ofertas comparadas de múltiples comercios.
- Código anti-phishing único por sesión.
- Banca privada con selector real de bancos aprobados.

## 4. Decisión sobre el hero: quitar el conteo mock — ✅ COMPLETADO

El hero calculaba `AnimatedStat` (`totalLeads`, `avgScore`, `activeCampaigns + activeProjects`) desde `leads`, `campaigns`, `proyectos`, `leadsInmobiliarios` importados de `@/data/mock` — datos ficticios, no reales.

Implementado: se quitó el conteo por completo (sin inventar cifra ni conectar una fuente real todavía — no existe hoy una vista/RPC pública agregada para esto), junto con `useAnimatedValue`, `AnimatedStat`, el import de `@/data/mock` y `useState`/`useEffect` (quedaron sin otro uso en el archivo). Reemplazado por 3 afirmaciones cualitativas cortas ("Un solo ecosistema, cuatro sectores conectados", "Seguridad de nivel bancario, auditada", "Match en tiempo real entre oferta y demanda") — mismo criterio de honestidad ya aplicado en el resto de la auditoría (portal de clientes, badges de navegación, RLS).

Además, se actualizó el H1 del hero ("El sistema operativo que conecta bancos, constructoras, comercios y clientes") — había quedado desactualizado sin mencionar Comercios desde que se agregó esa vertical en el punto 1.

## 5. Sistema de diseño — reutilizar, no crear nada nuevo

Confirmado que ya existe y está listo para usar sin librerías nuevas:
- Tokens de Tailwind (`tailwind.config.ts`) vía variables CSS HSL — tema dark-only ya definido en `index.css`.
- Paleta "fintech premium": verde esmeralda como primario (`--primary: 160 84% 39%`), acentos amber/rose/slate, utilidades `.glow-green`/`.glow-amber`.
- Tipografía Inter (texto) + JetBrains Mono (cifras).
- 49 componentes base de shadcn/ui ya instalados en `components/ui/`.

El rediseño debe apoyarse enteramente en esto — es el mismo lenguaje visual que ya usan los dashboards internos (Banco/Constructora/Comercio/Admin).

## Ronda 2 — Reordenamiento por claridad de mensaje (24 jul 2026)

Disparador: 15+ personas contactadas por fuera del equipo dijeron no entender qué hace Neggo al ver el sitio.

**Diagnóstico:** el problema no era falta de contenido — era orden y lenguaje. El hero lideraba con arquitectura interna ("sistema operativo", "enterprise", "RLS", "pipeline inteligente") en vez de con el problema humano que resuelve. Forzaba elegir entre 4 perfiles antes de dar una razón para quedarse. Los mensajes por audiencia que ya estaban validados en `marketing-neggo.md` (tabla sección 2) nunca habían llegado al sitio real.

**Cambios en `LandingHub.tsx`:**
- Hero: promesa centrada en el usuario ("Conseguí lo que buscás en Medellín sin caer en una estafa en el camino") + 3 pasos simples (Decís qué buscás → Verificamos → Te conectamos), reemplazando el value-props strip abstracto.
- Trust bar: mismos hechos reales (MFA, 24 tablas / 37 políticas, Ley 1581) traducidos a lenguaje humano, sin tocar ni una cifra.
- 4 `AudienceCard`: subtítulos reemplazados por los mensajes ya validados en `marketing-neggo.md` sección 2; tags cambiados de categorías vacías ("Enterprise"/"Growth"/"Aliado"/"Personal") a ganchos concretos ("Sin fraude", "Pagás solo si cierras", "Primeros 50 gratis", "Protegido siempre").
- Header/footer: quitada la jerga "Fintech OS" / "sistema operativo financiero enterprise" del branding secundario.

**Cambios en `LoginEcosistema.tsx`:**
- Aviso de tiempo de aprobación B2B (24-48h) movido *antes* de empezar el formulario, no como sorpresa al final.
- B2C: intro reescrita con el mensaje de audiencia validado ("Tu aliado financiero — te protegemos de estafas...").
- Urgencia "primeros 50 comercios con Sello de Confianza gratis" (ya decidida en `marketing-neggo.md` sección 4, nunca usada en el sitio) agregada al registro de sector Comercio.

Solo copy/JSX de texto — sin cambios de lógica, esquema ni componentes nuevos. `tsc` y `eslint` limpios.

## Guía de arquitectura de contenido — dónde va cada cosa

Referencia para futuras rondas de copy en el home/login, para no repetir el error de la Ronda 1:

1. **Hero (arriba de todo):** una sola promesa en lenguaje humano — qué gana el visitante, nunca cómo está construido el sistema. Cero jerga interna (nada de "sistema operativo", "pipeline", "RLS", "enterprise").
2. **Pasos / cómo funciona:** justo debajo del hero, 3 pasos máximo, antes de pedir cualquier decisión (elegir perfil, registrarse).
3. **Prueba de que es real, no una promesa:** capacidades ya construidas y en producción (ver `marketing-neggo.md` sección 5) — refuerza autoridad sin inventar cifras ni testimonios.
4. **Trust bar / cifras de seguridad:** solo hechos verificables y ya auditados, traducidos a lenguaje humano. Nunca un número sin fuente real detrás (regla ya aplicada desde la Ronda 1).
5. **Segmentación por audiencia ("¿Qué buscás hoy?"):** recién acá, después de que el visitante ya entendió el valor general. Subtítulos = mensajes de la tabla en `marketing-neggo.md` sección 2, nunca texto técnico nuevo.
6. **Objeciones/FAQ:** respuestas ya validadas en `marketing-neggo.md` sección 8 — se usan tal cual, no se inventan variantes nuevas.
7. **Urgencia/incentivos:** solo los ya decididos en `marketing-neggo.md` sección 4 (ej. primeros 50 comercios). Nunca urgencia inflada o inventada.
8. **CTA final + Login/Registro:** expectativas claras antes de que el usuario empiece a llenar campos (tiempos de aprobación, qué pasa después), no como sorpresa a mitad de formulario.

Cualquier copy nuevo para el home debe poder trazarse a algo ya escrito en `marketing-neggo.md` o `estrategia-adquisicion-clientes-neggo.md` — si no existe todavía, se valida ahí primero y después se lleva al código.
