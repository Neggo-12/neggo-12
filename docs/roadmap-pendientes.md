# Roadmap y Pendientes — Neggo

Última actualización: 25 de julio de 2026.

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
2. ~~**Estadísticas más completas del Admin**~~ — completado (commit `c7530f9`, 24 jul): activos/inactivos (30d), top ciudades, tendencia de registros, uso real (Meta/solicitud/puntos) en Clientes; nuevo panel Estadísticas con ranking de campañas por leads y de negocios B2B por ingresos reales. Pendiente: comercios más buscados y secciones más usadas por clientes — requieren conectar PostHog (ya integrado en producción), no hay tracking de eso en Supabase hoy. Seguridad revisada: PostHog es SOC 2 Type II y GDPR-compliant (hosting EU disponible), plan gratis sin tarjeta (1M eventos/mes) — evaluar cuando se decida conectar.
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

## Completado (sesión 24 jul 2026, continuación 5) — Diseño visual de Campañas
- `CampanasListPanel.tsx` (lista de campañas propias, bancos/comercios): rediseñada al mismo nivel que `CampanaOfferCard` (OfertasView) — icono por tipo (banco/comercio), chips de segmentación en vez de texto plano, badge de modo de lanzamiento, grid de 2 columnas, hover/selected más marcados. Las tarjetas de OfertasView ya estaban en ese nivel (no necesitaron cambios).
- Empty-state "Selecciona una campaña" en `MisCampanasTab.tsx` y `CampanasTab.tsx`: mismo lenguaje visual (icono en chip de color, borde punteado).
- Mini-CRM por campaña (`SolicitudesTab.tsx`, bancos/comercios) queda fuera de este pase — es un CRM funcional con pipeline/búsqueda, no una tarjeta plana; si se quiere pulir necesita su propia sesión de diseño.

## Completado (sesión 24 jul 2026, continuación 6) — Auditoría de seguridad/arquitectura
Disparada explícitamente por Jhey. Verificado con evidencia real (consultas SQL directas, no supuestos):
- **RLS**: las 31 tablas de `public` tienen RLS habilitado — ninguna tabla expuesta sin RLS.
- **Funciones sensibles (dinero/estado)**: revisadas 7 funciones SECURITY DEFINER que mueven plata o cambian estado (`canjear_puntos`, `confirmar_pago_factura`, `emitir_puntos_por_compra`, `registrar_cierre_lead`, `registrar_compra_oferta`, `reportar_pago_factura`, `responder_oferta_comercio`) — todas tienen guarda de autorización real (auth.uid()/membership/is_platform_admin()) y `SET search_path`, no dependen solo de RLS.
- **Tabla `users`**: política SELECT acotada (fila propia, Admin, o relación B2B puntual vía función) — sin fuga de datos personales a cualquier autenticado.
- **Storage**: un solo bucket (`facturas-clientes`), privado, con RLS por carpeta=dueño + relación de compra — sin bucket público con documentos personales.
- **Secretos**: sin claves ni service role hardcodeadas en `web/src` (grep verificado).
- **MFA**: `MFA_ENFORCEMENT_ENABLED = true` en config de la app (confirmado en código).
- Cerrado en esta sesión: 4 funciones de trigger sin `search_path` fijo (`update_updated_at`, `set_codigo_verificacion`, `generar_codigo_verificacion`, `set_codigo_verificacion_me_interesa`) — riesgo bajo (no eran SECURITY DEFINER) pero gratis de cerrar. Migración `20260724_hardening_search_path_triggers.sql`, verificado con `proconfig` después de aplicar.
- Revisado y descartado como falso positivo: `busquedas_sin_match` y `fallos_app` tienen INSERT abierto (`WITH CHECK true`) pero su SELECT es admin-only — son canales de escritura ciega (telemetría), no fuga de datos.

### Pendiente de acción (no técnica / requiere decisión)
- **Leaked Password Protection deshabilitado** en Supabase Auth — revisa contraseñas contra HaveIBeenPwned. **Corrección:** no es gratis, requiere plan Pro de Supabase ($25/mes) — mismo plan pago ya postergado antes por el timeout de sesión. No se puede activar por SQL/MCP. Ruta correcta en el dashboard: Authentication → Sign In / Providers → Email (NO Database → Policies, que es RLS, una sección distinta). Queda pendiente de decisión — no urge en el plan gratis actual.
- **`audit_log` existe pero no se usa de verdad**: 1 sola fila, la más reciente del 2 de julio, y ninguna función del esquema le escribe hoy. Para un fintech bajo Ley 1581, un rastro de auditoría real (quién accedió/modificó qué) es relevante para trazabilidad y respuesta a incidentes — hoy es una tabla de papel. No se construyó en esta sesión (es un feature aparte, no un fix rápido) — queda como decisión pendiente de prioridad.
- **`pg_net` instalado en schema `public`**: cosmético/lint, moverlo requiere revisar si algo depende de esa ubicación (ej. webhooks) — no se tocó por precaución, bajo impacto.

## Regla permanente — Auditoría de seguridad/arquitectura
Pendiente disparar cuando el usuario lo indique explícitamente ("toca la arquitectura"), no automático: auditoría enfocada en prevenir accesos indebidos y fuga de datos de clientes, con foco en cumplimiento de la Ley 1581 (protección de datos personales). Referencia: `docs/seguridad-infraestructura-futura.md` y el patrón ya usado en la auditoría del 24 jul (RLS, linter, MFA, hardening de funciones).

## Completado (sesión 24 jul 2026, continuación 2)
- Rediseño del home/landing y login por claridad de mensaje (ver `docs/landing-rediseno.md`, sección "Ronda 2") — motivado por feedback real de 15+ personas que no entendían qué hace Neggo.
- Agregada guía de arquitectura de contenido ("dónde va cada cosa") en `docs/landing-rediseno.md` para futuras rondas de copy.

## Completado (sesión 24 jul 2026, continuación 3) — Sello de Confianza, suscripción mensual
Motivado por 3 comercios reales esperando confirmación de precio. Sistema nuevo, separado del CPL/comisión existente:
- Franjas automáticas por ingreso mensual declarado: <$300.000 → $5.000 · $300.000–$10.000.000 → $20.000 · $10.000.001–$20.000.000 → $28.000 · >$20.000.000 → $40.000 (esta última, propuesta mía siguiendo la tendencia de las 2 franjas que dio Jhey — **falta confirmación explícita**).
- Sin prorrateo — el primer cobro sale completo en el primer ciclo mensual donde el comercio ya tenga el ingreso declarado.
- `organizations.ingresos_mensuales_declarados` (+ quién y cuándo lo declaró) — se pide progresivo, no todo junto: el comercio lo declara la primera vez que entra ya aprobado (tarjeta en "Lo que le debes a Neggo"), o el Admin lo corrobora/asigna antes desde el panel de Tarifas del Sello.
- `tarifas_sello_negociadas` (append-only, mismo patrón que `tarifas_comercio_negociadas`) — el Admin puede pisar el valor automático por comercio, incluido ponerlo en $0 para regalar el Sello a algunos clientes sí y a otros no (la promesa "primeros 50 gratis" del landing se resuelve así: decisión manual por comercio, no automática para todos).
- El cobro entra como línea propia en el ledger (`concepto = 'Sello de Confianza — Suscripción mensual'`), separado de CPL/comisión, dentro de la misma factura mensual — sin ciclo de facturación nuevo.
- Migración: `supabase/migrations/20260724_sello_confianza_suscripcion.sql`. Verificado con evidencia real (franjas probadas contra los límites exactos, incluido el caso $10.000.001 → $28.000).
- **Pendiente de confirmación de Jhey:** el valor de la franja >$20.000.000/mes ($40.000, propuesto por mí, no confirmado explícitamente).

## Completado (sesión 24 jul 2026, continuación 4) — Consolidación de Tarifas y Planes
Motivado por confusión real: la lista de Comercios tenía un selector "Asignar plantilla..." que modificaba la tarifa CPL/comisión desde ahí mismo, duplicando la capacidad de edición que ya existía en el panel de Tarifas Negociadas — dos lugares para tocar lo mismo. Se consolidó a un solo lugar editable:
- Lista de Comercios: las columnas "Tarifa Vigente" y "Sello" ahora son de solo lectura (plan/valor/si es negociada) con click que navega directo al comercio correcto en Tarifas y Planes — ya no se modifica nada desde la lista.
- Panel de Tarifas Negociadas (CPL/comisión): se agregó un selector "Aplicar plantilla" dentro del único formulario de asignación — prellena los valores, pero se pueden seguir editando a mano (queda como "Personalizado" en el historial si se edita).
- Panel del Sello: mismo tratamiento — selector de franja estándar que prellena el valor mensual, editable, con puente de preselección desde la lista de Comercios (igual que ya existía para CPL).
- Nueva función `fetchTarifasSelloVigentesPorComercios` (bulk, sin N+1) para resolver el valor del Sello de toda la lista de una sola vez.

## Completado (sesión 25 jul 2026, continuación) — "SIEM-lite" (sin servidor nuevo)
Jhey pidió activar el SIEM que quedó pendiente en la auditoría del 24 jul. Antes de construir nada se le explicó que Wazuh (la opción anotada como "gratis") en realidad necesita un servidor propio 24/7 (~$12-24 USD/mes) y no encaja con la arquitectura serverless de Neggo (Cloudflare Workers + Supabase, sin servidores propios). Jhey eligió consolidar la telemetría ya existente en vez de levantar infraestructura nueva. Ver corrección completa en `docs/seguridad-infraestructura-futura.md`.
- **Fase 1 — `audit_log` activo de verdad:** helper `_log_audit()` + INSERT agregado a las 7 funciones SECURITY DEFINER sensibles ya auditadas (`canjear_puntos`, `confirmar_pago_factura`, `emitir_puntos_por_compra`, `registrar_cierre_lead`, `registrar_compra_oferta`, `reportar_pago_factura`, `responder_oferta_comercio`) — registra quién hizo qué, cuándo, sobre qué organización. Antes la tabla existía pero nada le escribía (1 sola fila huérfana del 2 de julio). Migración `20260725_activar_audit_log.sql`.
  - Hallazgo propio durante la verificación (no venía de los advisors): `_log_audit` quedó con EXECUTE abierto a `anon`/`authenticated` por el comportamiento default de Postgres — cualquier usuario autenticado podía llamarlo directo por RPC y forjar entradas de auditoría falsas. Corregido con `REVOKE EXECUTE` en `20260725_restringir_ejecucion_log_audit.sql`, verificado con `role_routine_grants` (solo quedan `postgres`/`service_role`).
  - Verificado con evidencia real: INSERT de prueba vía `_log_audit`, confirmado en la tabla y borrado después; `get_advisors` corrido antes y después, sin hallazgos nuevos.
- **Fase 2 — Panel "Auditoría" en el Admin:** tabla nueva `seguridad_advisors_snapshot` (RLS: solo Admin lee, sin política de escritura para el cliente — la alimenta exclusivamente la tarea programada de Fase 3) con un snapshot inicial real de los 42 hallazgos actuales de advisors (agrupados y ya revisados). Panel `AuditoriaPanel.tsx` nuevo (sidebar "Auditoría", separado del panel "Seguridad" existente que es MFA personal, y de "Salud del Sistema" que ya cubre `fallos_app` — no se duplicó nada) muestra el último snapshot de advisors + las últimas 50 entradas de `audit_log`.
- **Fase 3 — Revisión semanal automática:** tarea programada `revision-seguridad-neggo` (lunes 8am) — corre `get_advisors`, compara contra el snapshot anterior para detectar hallazgos nuevos o que empeoraron, cuenta actividad semanal de `audit_log`/`fallos_app`, guarda un snapshot nuevo, y solo genera alarma si hay algo realmente nuevo (evita ruido en un piloto de bajo tráfico, criterio explícito de Jhey).
- `integrations/supabase/types.ts` sincronizado con `seguridad_advisors_snapshot`. `tsc`/`eslint` limpios.

## Completado (sesión 25 jul 2026) — Validación de correo/celular en registro
Motivado por registros de prueba con datos claramente falsos (ej. `correoheg@heico`, celulares tipo `1111111111`). Alcance: SOLO el flujo de registro nuevo — login/restoreSession no se tocaron, las cuentas de prueba ya existentes de Jhey no se ven afectadas.
- SMS OTP para confirmar el celular real quedó pausado explícitamente por decisión de Jhey — requiere proveedor pago (Twilio, ~$0.02–0.05 USD/mensaje), no hay opción gratuita para SMS real a Colombia. Puede retomarse más adelante como sesión aparte.
- `validateEmail(email, contexto)` y `validatePhone(phone)` nuevas en `web/src/core/db/supabaseClient.ts`, mismo patrón que `validatePassword`/`PasswordValidation`.
  - Correo: formato general (`local@dominio.tld`); contexto `'corporativo'` (Bancos/Constructoras) además rechaza webmail genérico (gmail.com, hotmail.com, outlook.com, etc.) — deben usar el dominio real de su entidad (ej. `gerente@bancolombia.co`). Contexto `'general'` (Comercios/Clientes B2C) solo exige formato válido.
  - Celular: 10 dígitos, debe iniciar en 3 (móvil colombiano), acepta y limpia prefijo +57/57, rechaza secuencias de dígito repetido (ej. `1111111111`, `3333333333`).
- Wireado en `LoginEcosistema.tsx`: `B2BRegister` (correo con contexto corporativo solo para sector banca/constructora, general para comercio; teléfono siempre validado) y `B2CRegister` (correo general, celular validado) — feedback inline igual al patrón ya usado para confirmación de contraseña, gatea `canSubmit`.
- Defensa en profundidad server-side: migración `20260725_validacion_email_celular_registro.sql` — helpers `_validar_formato_email`/`_validar_celular_co` (mismas reglas, `SET search_path`) llamados desde `registrar_b2b_completo`/`registrar_b2c_completo` antes de cualquier INSERT. Verificado con evidencia real: consulta SQL directa contra los 2 helpers con 7 casos (correo sin TLD, correo válido, celular `1111111111`, celular válido, celular con prefijo +57, celular repetido `3333333333`, celular corto) — los 7 resultados coincidieron con lo esperado. Revisado `get_advisors` (security) post-migración: sin hallazgos nuevos, solo los ya conocidos de auditorías previas.
