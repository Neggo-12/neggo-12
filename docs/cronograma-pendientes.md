# Cronograma — Pendientes de Neggo

Última actualización: 25 de julio de 2026. Compilado desde `docs/roadmap-pendientes.md` — este documento es la vista "qué falta y cuándo", el otro sigue siendo el registro detallado de lo ya hecho.

## Ahora / esta sesión
- **Deploy del fix del sidebar de Admin** (commit `1124e02`) — pendiente de correr `npm run build && npx wrangler deploy` y verificar en vivo.
- **Vigilancia de "Salud del Sistema"** — en definición ahora mismo (ver más abajo).
- **Arranque de marketing** — en definición ahora mismo.

## Corto plazo (próximas sesiones, sin bloqueo de plata ni de decisión de negocio)
1. npm audit — 2 vulnerabilidades restantes (paso a ya resuelto), ninguna con exploit activo conocido en producción hoy. Plan de ejecución: una por sesión, de menor a mayor riesgo:
   - ~~a. eslint chain (brace-expansion anidado) → eslint 10~~ — **hecho (25 jul)**. eslint-plugin-react-hooks 7.1.1 cambió su `recommended` a incluir por defecto reglas de React Compiler (que Neggo no usa) — generaron 63 errores falsos de alcance ajeno al fix; se fijaron explícitamente solo `rules-of-hooks` + `exhaustive-deps` (mismo comportamiento que antes) en `eslint.config.js`. tsc y lint limpios, 0 vulnerabilidades de esta cadena.
   - **b. esbuild/vite → vite 8** — afecta solo el dev server, no el bundle final. Riesgo medio: hay que verificar que `dist/` no cambie de comportamiento tras el bump.
   - **c. react-router-dom 6→7** — el único que corre en producción real. Cambios de API que rompen (breaking). Requiere sesión dedicada con regresión manual completa (todas las rutas, todos los roles) vía Claude Code terminal, porque `vitest` no corre en este sandbox (bug arm64 conocido).
2. Transferencia de puntos entre clientes — necesita definir condiciones anti-fraude antes de construirse.
3. Sistema de Puntos Fase 2 (campañas: doble/triple puntos, happy hour) — ver `docs/sistema-puntos-neggo.md`.
4. Sistema de Puntos Fase 3 (Paquete de Bienvenida multi-aliado, compras grandes tipo vivienda).

## Bloqueado por decisión de negocio (no técnico — Jhey decide, no requiere código)
- Confirmar el valor de la franja del Sello de Confianza para ingresos >$20.000.000/mes (hoy $40.000, propuesto por Claude, nunca confirmado explícitamente).
- Valor de conversión punto → peso (Sistema de Puntos).
- Quién financia el fondo de pagos a comercios por puntos: Opción A (Neggo aparta % de su comisión) vs Opción B (el comercio emisor asume el costo).
- Modelo de tarifas de puntos por comercio (planes Estándar/Plus/Premium — valores sin definir).
- Presupuesto de puntos para compras de alto valor (% de la comisión real de Neggo).

## Bloqueado por plan pago (requiere presupuesto, no esfuerzo técnico)
- Timeout de sesión a 15 min — requiere Supabase Pro ($25/mes).
- Leaked Password Protection (HaveIBeenPwned) — mismo Supabase Pro.
- SMS OTP para verificar celular real — requiere proveedor pago (Twilio, ~$0.02–0.05 USD/mensaje). Pausado por decisión explícita de Jhey.
- Cobro real de comisiones vía Stripe — hoy `facturas_ledger` solo registra internamente, no cobra de verdad a tarjeta. Proyecto aparte, con modo test primero antes de tocar dinero real.

## Sin timing definido (bajo impacto o depende de que cambie el contexto)
- Mover `pg_net` fuera del schema `public` — cosmético, bajo impacto, no se toca por precaución.
- n8n — en pausa, cubierto hoy por tareas programadas de Cowork sin costo extra. Revisar solo si aparece un caso de uso que Cowork no cubra.
- Wazuh / SIEM real con servidor propio — solo tiene sentido si Neggo llega a operar servidores propios (poco probable dado el rumbo serverless). Hoy cubierto por el "SIEM-lite" (audit_log + panel Auditoría + revisión semanal).

## Completado recientemente (para contexto, detalle completo en roadmap-pendientes.md)
- Comercios más buscados / secciones más usadas en Estadísticas Admin — analítica propia en Supabase (no PostHog, decisión de arquitectura explícita), commiteado, pendiente de deploy (25 jul).
- Fix "Failed to fetch dynamically imported module" — deployado (version `886423d9-ec13-48ba-ae1a-c00a20c84f90`) y verificado en vivo cargando el bundle real de neggo.co en el navegador (25 jul).
- SIEM-lite: audit_log activo, panel Auditoría, revisión semanal automática (25 jul).
- Validación de correo/celular en registro B2B/B2C (25 jul).
- Sello de Confianza — suscripción mensual por franja de ingresos (24 jul).
- Consolidación de Tarifas y Planes en un solo punto de edición (24 jul).
- Rediseño visual de Campañas (24 jul).
- Auditoría de seguridad/arquitectura completa (24 jul).
