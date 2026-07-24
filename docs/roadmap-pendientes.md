# Roadmap y Pendientes — Neggo

Última actualización: 24 de julio de 2026.

## Completado (sesión 24 jul 2026)
- Auditoría de seguridad completa (RLS, linter, MFA, hardening de funciones)
- Despliegue a producción real: neggo.co vía Cloudflare Workers
- Flujo completo de recuperación de contraseña (incluido caso con MFA)
- 4 landing pages con contenido real (sin precios/stats inventados)
- Buscador de comercios con código de verificación anti-fraude por solicitud
- PostHog integrado (analítica de comportamiento en producción)
- Bug last_login_at (nunca se actualizaba — void sin await)
- Vista de Clientes en el Admin
- Responsive general (6 puntos)
- Tarifas negociadas por comercio (historial append-only) + cierre de bug crítico de no-determinismo en el cobro real
- Sistema de Puntos Nivel 1 completo (emisión, saldo, canje cruzado, liquidación, vista Admin)
- Hueco de comisión en la Bóveda del Cliente cerrado (nunca cobraba desde el 14 de julio)
- Sincronización de estado_pago en facturación mensual (bug de 12 días de antigüedad)
- Separación "Lo que le debes a Neggo" / "Mis Ventas" en dashboard de Comercio

## Pendientes activos (por prioridad)
1. **Timeout de sesión a 15 min** — bloqueado por plan gratis de Supabase, requiere activar Pro ($25/mes).
2. **Estadísticas más completas del Admin** — hoy solo 3 KPIs básicos de Clientes; falta desglose más profundo (a definir qué exactamente).
3. **npm audit**: 2 vulnerabilidades de dev server (Vite/esbuild) — no afectan producción, resolver con calma (posible upgrade a Vite 8, breaking change).

## Completado (sesión 24 jul 2026, continuación)
- Bug de no-determinismo (ORDER BY periodo_vigente_desde sin desempate) en tarifas de bancos — mismo patrón ya corregido para comercios (resolver_cpl_comercio). Cerrado en 2 lugares: `consolidar_facturacion_mensual` (backend, desempate `updated_at DESC`) y `fetchTarifasBancoOrganizacion` (frontend, mismo desempate) — el pendiente original solo nombraba el segundo, pero ambos compartían el mismo hueco sobre `tarifas_bancos_por_organizacion`.

## Sistema de Puntos — Fases futuras (ver docs/sistema-puntos-neggo.md)
- Fase 2: Campañas (doble/triple puntos, happy hour, etc.)
- Fase 3: Paquete de Bienvenida multi-aliado (compras grandes tipo vivienda)
- Transferencia de puntos entre clientes (pendiente de condiciones anti-fraude)
- Valor de conversión punto→peso — aún sin definir formalmente
- Quién financia el fondo de pagos a comercios (Opción A: Neggo aparta % de comisión / Opción B: comercio emisor asume el costo) — pendiente de decisión de negocio

## Decisiones de negocio pendientes (no técnicas, bloquean features específicas)
- Modelo de tarifas de puntos por comercio (Estándar/Plus/Premium — valores aún sin definir)
- Presupuesto de puntos para compras de alto valor (% de comisión real de Neggo)
