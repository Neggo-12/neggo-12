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
3. **npm audit**: bajó de 13 a 9 (commit `107d24a`, 24 jul) — cerradas postcss, sharp y la cadena wrangler/workerd/miniflare sin breaking changes. Quedan 9 abiertas, las 3 requieren salto de versión mayor, ninguna aplicada todavía: esbuild/vite (→ vite@8.1.5), react-router (serie 6.x completa vulnerable, fix real es v7.x), brace-expansion anidado en @typescript-eslint (→ eslint@10). No afectan producción hoy. Cada una necesita su propia sesión de evaluación de breaking changes — no resolver a la ligera.

## Completado (sesión 24 jul 2026, continuación)
- Bug de no-determinismo (ORDER BY periodo_vigente_desde sin desempate) en tarifas de bancos — mismo patrón ya corregido para comercios (resolver_cpl_comercio). Cerrado en 2 lugares: `consolidar_facturacion_mensual` (backend, desempate `updated_at DESC`) y `fetchTarifasBancoOrganizacion` (frontend, mismo desempate) — el pendiente original solo nombraba el segundo, pero ambos compartían el mismo hueco sobre `tarifas_bancos_por_organizacion`.

## Notas e ideas sueltas (sin priorizar todavía)
Cualquier idea/nota que Jhey mencione al pasar se anota acá en el momento, con una lectura rápida de prioridad, para no perderla ni desviar la tarea principal en curso.

- **n8n (automatización):** en pausa. Requiere servidor propio (self-host con costo de hosting, o n8n Cloud pago) — no es "conectar y listo". Los dos casos de uso identificados hoy (seguimiento a comercios sin responder, recordatorio de facturas vencidas) se pueden cubrir con tareas programadas de Cowork sin costo adicional. Revisar de nuevo si aparece un caso de uso que Cowork no pueda cubrir.
- **Stripe (cobro real de comisiones):** cuenta gratis de crear, cobra por transacción. Prioridad media — hoy `facturas_ledger` solo registra internamente, no hay evidencia de cobro real automático a tarjeta. Antes de conectar: definir con Jhey el alcance exacto (qué cobra, a quién, cuándo) como proyecto aparte, con modo test primero — es dinero real de comercios/bancos.
- **Perplexity:** no tiene conector directo en Claude. La búsqueda web ya integrada cubre research general. Solo relevante si se arma un flujo en n8n más adelante (tiene nodo nativo).

## Sistema de Puntos — Fases futuras (ver docs/sistema-puntos-neggo.md)
- Fase 2: Campañas (doble/triple puntos, happy hour, etc.)
- Fase 3: Paquete de Bienvenida multi-aliado (compras grandes tipo vivienda)
- Transferencia de puntos entre clientes (pendiente de condiciones anti-fraude)
- Valor de conversión punto→peso — aún sin definir formalmente
- Quién financia el fondo de pagos a comercios (Opción A: Neggo aparta % de comisión / Opción B: comercio emisor asume el costo) — pendiente de decisión de negocio

## Decisiones de negocio pendientes (no técnicas, bloquean features específicas)
- Modelo de tarifas de puntos por comercio (Estándar/Plus/Premium — valores aún sin definir)
- Presupuesto de puntos para compras de alto valor (% de comisión real de Neggo)

## Diseño visual pendiente (mejora, no bug)
- Sistema de Campañas (CampanasListPanel, tarjetas de campaña en OfertasView, mini-CRM por campaña) funciona correctamente pero el diseño visual es plano — necesita una pasada de diseño más cuidada en la próxima sesión (mismo nivel de pulido que el resto del sistema de diseño "fintech premium" ya usado en el resto de Neggo).

## Regla permanente — Auditoría de seguridad/arquitectura
Pendiente disparar cuando el usuario lo indique explícitamente ("toca la arquitectura"), no automático: auditoría enfocada en prevenir accesos indebidos y fuga de datos de clientes, con foco en cumplimiento de la Ley 1581 (protección de datos personales). Referencia: `docs/seguridad-infraestructura-futura.md` y el patrón ya usado en la auditoría del 24 jul (RLS, linter, MFA, hardening de funciones).

## Completado (sesión 24 jul 2026, continuación 2)
- Rediseño del home/landing y login por claridad de mensaje (ver `docs/landing-rediseno.md`, sección "Ronda 2") — motivado por feedback real de 15+ personas que no entendían qué hace Neggo.
- Agregada guía de arquitectura de contenido ("dónde va cada cosa") en `docs/landing-rediseno.md` para futuras rondas de copy.
