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
