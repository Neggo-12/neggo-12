# Seguridad de Infraestructura — SIEM, DoS/DDoS, Nodos de Control

## Corrección (25 jul 2026)
La primera versión de este doc proponía Wazuh como "SIEM gratis" para cuando el volumen lo justificara. Eso era impreciso: el software es gratis, pero Wazuh necesita un servidor propio corriendo 24/7 (mínimo ~4GB RAM, ~$12-24 USD/mes de VPS) y está diseñado para monitorear servidores reales (agentes de host, integridad de archivos). Neggo no tiene servidores propios — el frontend corre en Cloudflare Workers y el backend es Supabase, ambos administrados — así que Wazuh no encaja con la arquitectura actual, y no es realmente "gratis" una vez que se cuenta el hosting.

**Decisión tomada:** en vez de Wazuh, se implementó un "SIEM-lite" consolidando la telemetría que ya existía, sin servidor nuevo — ver sección siguiente. Wazuh (o un SIEM pago tipo Datadog Security) queda como opción real solo si en el futuro Neggo llega a operar servidores propios (poco probable dado el rumbo serverless actual).

## Estado actual (verificado, sin inflar)
- Observabilidad de APLICACIÓN: fallos_app (fallos de escritura, panel "Salud del Sistema" en Admin), Sentry (errores JS no manejados), PostHog (comportamiento), **audit_log activo desde el 25 jul** — registra quién hizo qué en las 7 funciones que mueven dinero o cambian estado sensible (antes existía la tabla pero nada le escribía).
- **SIEM-lite (25 jul 2026):** tabla `seguridad_advisors_snapshot` + tarea programada semanal (`revision-seguridad-neggo`, lunes 8am) que revisa los advisors de seguridad de Supabase, compara contra la revisión anterior, cuenta actividad de `audit_log`/`fallos_app` de la semana, guarda un snapshot, y solo avisa a Jhey si hay algo nuevo (evita ruido en un piloto de bajo tráfico). Panel "Auditoría" nuevo en el Admin (`AuditoriaPanel.tsx`) muestra el último snapshot + las últimas 50 entradas de audit_log.
- Protección DDoS de RED: Cloudflare (donde vive neggo.co) incluye protección DDoS básica nativa en su capa — cubre el escenario más común de "múltiples solicitudes tumbando el servidor" sin configuración adicional.
- NO se tiene: un SIEM tradicional con nodos de red (TCP/IP, UDP) — no aplica mientras no haya servidores propios que monitorear.

## Recomendación de fases
- Fase actual (piloto): Cloudflare DDoS + audit_log + fallos_app + Sentry + PostHog + revisión semanal de advisors — cubre observabilidad de aplicación y trazabilidad de acciones sensibles, sin costo de infraestructura nuevo.
- Fase futura (si Neggo llega a operar servidores propios): recién ahí evaluar Wazuh u otro SIEM con nodos de red reales, dimensionados al tráfico medido.

## Registro de trabajo de seguridad — sesión 25 jul 2026
Todo lo tocado en materia de seguridad en esta sesión, en un solo lugar:

- **Validación de registro (defensa en profundidad):** `validateEmail`/`validatePhone` nuevos en `web/src/core/db/supabaseClient.ts`. Correo exige formato válido siempre; para Bancos/Constructoras además exige dominio corporativo real (rechaza gmail/hotmail/outlook/etc.). Celular exige 10 dígitos, móvil colombiano (inicia en 3), rechaza secuencias repetidas (`1111111111`). Replicado server-side dentro de `registrar_b2b_completo`/`registrar_b2c_completo` (funciones `_validar_formato_email`/`_validar_celular_co`) para que no se pueda saltar por RPC directo — migración `supabase/migrations/20260725_validacion_email_celular_registro.sql`. Alcance: solo registro nuevo, no afecta cuentas existentes ni login.
- **Corrección propia:** se había dicho que "Leaked Password Protection" de Supabase Auth era gratis — es incorrecto, requiere plan Pro ($25/mes). Ruta real en el dashboard cuando se active: Authentication → Sign In/Providers → Email (no Database → Policies).
- **SIEM-lite (ver secciones arriba):**
  - `supabase/migrations/20260725_activar_audit_log.sql` — helper `_log_audit()` + activación en las 7 funciones sensibles.
  - `supabase/migrations/20260725_restringir_ejecucion_log_audit.sql` — fix de un hallazgo propio: `_log_audit` quedó ejecutable por `anon`/`authenticated` vía RPC directo (permitía forjar auditoría), revocado a solo uso interno.
  - `supabase/migrations/20260725_seguridad_advisors_snapshot.sql` — tabla de snapshots + RLS admin-only.
  - `web/src/features/admin/components/AuditoriaPanel.tsx` — panel nuevo en el Admin.
  - Tarea programada `revision-seguridad-neggo` (Cowork, lunes 8am) — revisión semanal automática con bajo ruido.
- **Deploy:** todo lo anterior está confirmado en producción (`neggo.co`, commit `b260606`, verificado en el dashboard de Cloudflare) — ver `docs/roadmap-pendientes.md` para el detalle del deploy. El panel de Admin no reflejaba el cambio en el navegador de Jhey pese al deploy correcto; en investigación (ver roadmap).
