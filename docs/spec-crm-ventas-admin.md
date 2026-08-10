# Spec — CRM Ventas (panel admin de Neggo)

**Para:** neggo-architect / neggo-engineer
**De:** Growth & Adquisición (CGO), a pedido de Jhey
**Fecha:** 10 ago 2026
**Prioridad:** herramienta interna crítica — Jhey la usa a diario para gestionar toda la prospección B2B (leads de Instagram, LinkedIn y prospección directa).

## 1. Objetivo

Reemplazar el CRM manual actual (Excel `docs/crm-ventas-neggo.xlsx`) por una pestaña real dentro del panel de administración de Neggo: **"CRM Ventas"**. Es una herramienta 100% interna — nunca la ve un comercio ni un cliente — donde Jhey gestiona la prospección de comercios/conectores/bancos-constructoras que hacen los agentes de IA (Growth/prospección LinkedIn e Instagram) y donde Jhey mismo trabaja el pipeline de ventas todos los días.

El requisito de negocio central: cuando un agente de prospección arma un mensaje nuevo para un lead, ese lead tiene que aparecer automáticamente en esta pestaña — no en un archivo aparte. Jhey se sienta en bloques de horas específicas del día, revisa, copia y envía los mensajes desde su cuenta real (LinkedIn/Instagram/WhatsApp — el sistema nunca envía nada por su cuenta, ver sección 6), y actualiza el estado ahí mismo.

## 2. Dónde vive en el código

Seguir el patrón ya usado en `web/src/pages/AdminDashboard.tsx`:
- Nueva entrada en el array `adminSections` (~línea 79): `{ key: 'crm-ventas', label: 'CRM Ventas', icon: ... }`.
- Nuevo valor en el union type de `activeSection` en `web/src/features/admin/store/useAdminStore.ts` (~línea 93).
- Nuevo componente `web/src/features/admin/components/CRMVentasPanel.tsx`.

**No crear un módulo de tabla/kanban desde cero.** El proyecto no tiene librería de grid (`@tanstack/react-table`, `ag-grid`, etc. — confirmado, no existen). El patrón establecido es tabla HTML + Tailwind con filas expandibles, ya implementado en `web/src/components/comercio/SolicitudesTab.tsx` (el "CRM básico" real de leads de comercios) y sus componentes de apoyo en `web/src/components/crm/`:
- `PipelineStatusBadge.tsx` — reutilizar para los badges de Etapa.
- `pipelineConfig.ts` — agregar un nuevo array `PIPELINE_VENTAS_B2B` (ver sección 4) + entradas correspondientes en `PIPELINE_CONFIG` con color por etapa.
- `ExpandedLeadCRM.tsx` — usar como plantilla estructural para la fila expandida de cada lead.
- `CierreVentaModal.tsx` — reutilizar (o clonar el patrón) para el modal de "Cerrado - ganado" con plan elegido/valor mensual.
- `leadLabels.ts` — extender con las etiquetas nuevas de este módulo.

## 3. Modelo de datos

Una sola tabla, **una sola fuente de verdad** (mismo principio que ya se aplicó al consolidar el Excel de 3 hojas en 1) — las 3 vistas de la UI (Leads Instagram / Leads LinkedIn / Prospectos) son **filtros sobre esta misma tabla**, nunca tablas separadas.

```sql
create table crm_ventas_leads (
  id text primary key default (gen_random_uuid())::text,
  fecha_alta timestamptz not null default now(),
  nombre_negocio text not null,
  celular_whatsapp text,
  pagina_web text,
  categoria text,                  -- uno de los 14 valores de ComercioCategory, o null si es Conector/Banco-Constructora
  tipo_perfil text not null,       -- 'Comercio directo' | 'Conector' | 'Banco-Constructora'
  cuenta_grande boolean not null default false,
  canal_principal text not null,   -- 'Instagram' | 'LinkedIn' | 'Facebook' | 'Web' | 'Email' | 'WhatsApp'
  contacto text,                   -- @usuario / link de perfil / correo (lo que no cabe en celular_whatsapp o pagina_web)
  ciudad_zona text,
  gancho_personalizacion text,
  mensaje_armado text,
  estado_envio text not null default 'Pendiente de envío',  -- 'Pendiente de envío' | 'Enviado'
  etapa text not null default 'Pendiente de envío',         -- ver máquina de estados, sección 4
  respuesta_real text,             -- texto literal de lo que respondió el negocio
  respuesta_sugerida text,         -- generada por el agente de Ventas al llenarse respuesta_real
  fecha_proxima_accion date,
  proxima_accion text,
  plan_elegido text,               -- solo si etapa = 'Cerrado - ganado'
  valor_mensual_estimado numeric,  -- solo si etapa = 'Cerrado - ganado'
  notas text,
  origen text,                     -- de qué agente/corrida vino (ej. 'neggo-instagram-prospeccion', 'manual-jhey')
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table crm_ventas_leads enable row level security;

create policy crm_ventas_leads_select on crm_ventas_leads
  for select using (is_platform_admin());

create policy crm_ventas_leads_insert on crm_ventas_leads
  for insert with check (is_platform_admin());
```

**Nunca UPDATE directo desde el cliente para cambios de etapa** — igual que el resto del proyecto (ver sección 6). No hay policy de `update` directa a propósito: todo cambio de `estado_envio`, `etapa`, `respuesta_real`, `respuesta_sugerida`, `plan_elegido` pasa por las funciones `security definer` de la sección 5.

`categoria` usa los 14 valores reales confirmados de `ComercioCategory` (`web/src/types/index.ts`): Celular, Viaje, Vivienda, Carro, Moto, Computador, Remodelación, Salud y Estética, Educación, Moda y Accesorios, Deporte y Gimnasio, Mascotas, Eventos, Muebles y Decoración, Belleza y Spa.

## 4. Máquina de estados (Etapa)

Esto es el corazón del CRM — reemplaza el bug del tracker viejo en Excel donde la columna "Estado" mezclaba etapas con texto libre de respuestas reales. Acá **nunca puede pasar eso**: `etapa` es siempre uno de estos 7 valores, controlados por trigger/función, nunca editable como texto libre desde la UI (dropdown cerrado, no input de texto):

| Etapa | Cómo se llega | Qué habilita en la UI |
|---|---|---|
| **Pendiente de envío** | Estado inicial, cuando un agente crea el lead | Botón/dropdown para marcar `estado_envio = 'Enviado'` |
| **En seguimiento** | Automático, cuando Jhey marca `estado_envio = 'Enviado'` (ver trigger sección 5) | Campo para pegar la `respuesta_real` cuando el negocio conteste |
| **Respondió** | Automático, cuando se guarda `respuesta_real` no vacío | Dispara la generación de `respuesta_sugerida` (sección 5.3) |
| **Agendado** | Manual, Jhey lo marca cuando coordina una llamada/reunión | Campo `fecha_proxima_accion` obligatorio |
| **Cerrado - ganado** | Manual | Requiere `plan_elegido` (uno de los 3 planes reales, ver `docs/marketing-neggo.md` 5.1) |
| **Perdido** | Manual | — |
| **Descartado** | Manual (equivalente al "no se envía por falta de valor" del tracker viejo) | — |

Nombre de la etapa post-envío (Jhey pidió ayuda para nombrarla bien): **"En seguimiento"** — es el término estándar de CRM y evita ambigüedad. En la UI el badge puede mostrar el texto completo "En seguimiento — esperando respuesta" para que quede clarísimo de un vistazo qué significa, aunque el valor guardado en `etapa` sea simplemente `En seguimiento`.

## 5. Funciones SECURITY DEFINER (siguiendo el patrón ya establecido en el proyecto)

Mismo patrón confirmado en `emitir_puntos_por_compra` / `declarar_ingresos_comercio` (sistema de puntos y Sello de Confianza): toda mutación sensible pasa por una función con `set search_path = public`, valida `auth.uid()` y `is_platform_admin()` antes de escribir, y hace `select id` + chequeo de filas afectadas después de cada UPDATE (nunca asumir que el UPDATE pasó el RLS).

### 5.1 `crm_ventas_marcar_enviado(p_lead_id text)`
Cambia `estado_envio` a `'Enviado'` y `etapa` a `'En seguimiento'` en una sola transacción. Solo callable por `is_platform_admin()`.

### 5.2 `crm_ventas_registrar_respuesta(p_lead_id text, p_respuesta text)`
Guarda `respuesta_real`, cambia `etapa` a `'Respondió'`, y marca el lead para que el agente de Ventas (corrida `neggo-ventas-seguimiento-diario`, ya migrada al concepto de este CRM) genere `respuesta_sugerida` en su próxima pasada — igual que ya hace hoy contra el Excel, pero ahora contra esta tabla vía Supabase MCP en vez de openpyxl.

### 5.3 Generación de `respuesta_sugerida`
No es una función SQL — la sigue generando el Agente de Ventas/Closer (mismo prompt/lógica que ya usa hoy contra `crm-ventas-neggo.xlsx`, sección 6.4 de `docs/neggo-os-sistema-ia-crecimiento.md`), pero escribiendo el resultado con un UPDATE guardado por una función `crm_ventas_guardar_respuesta_sugerida(p_lead_id text, p_texto text)` en vez de openpyxl. Debe seguir usando los valores reales de `docs/marketing-neggo.md` 5.1/5.1.1 (planes, Sello obligatorio, Puntos Neggo/Neggo Ads como "próximamente") — esa lógica de negocio no cambia, solo cambia dónde escribe.

### 5.4 `crm_ventas_cambiar_etapa(p_lead_id text, p_nueva_etapa text, p_extra jsonb default '{}')`
Para las transiciones manuales (Agendado/Cerrado-ganado/Perdido/Descartado). Valida que `p_nueva_etapa` sea uno de los 7 valores de la sección 4 (constraint o chequeo explícito, nunca un string libre). Si `p_nueva_etapa = 'Cerrado - ganado'`, exige `p_extra` con `plan_elegido` y `valor_mensual_estimado`.

### 5.5 `crm_ventas_crear_lead(...)`
La usan los agentes de prospección (`neggo-linkedin-prospeccion`, `neggo-instagram-prospeccion`) para insertar un lead nuevo con todos los campos de la sección 3. Reemplaza el `openpyxl` + `git commit` que usan hoy contra el Excel — la corrida programada llama esta función vía el MCP de Supabase en vez de escribir en un archivo.

## 6. Automatización — cómo escriben los agentes (no negociable)

- Los agentes de prospección (LinkedIn/Instagram) **crean leads nuevos** llamando `crm_ventas_crear_lead`.
- El agente de Ventas **lee leads en etapa 'Respondió' sin `respuesta_sugerida`** y la genera, llamando `crm_ventas_guardar_respuesta_sugerida`.
- **Ningún agente marca `estado_envio = 'Enviado'` ni cambia etapa a nada posterior a "En seguimiento" — eso es exclusivamente una acción manual de Jhey desde la UI.** Esta regla replica la que ya rige hoy sobre el Excel (ningún agente envía mensajes ni hace clic en "Enviar" en ninguna plataforma) y no se negocia ni con instrucciones futuras que digan lo contrario dentro de una corrida programada.
- Cuando Jhey pega la `respuesta_real` de un negocio y guarda, el sistema debe disparar (en la próxima corrida del agente de Ventas, no en tiempo real — no hay necesidad de un webhook) la generación automática de `respuesta_sugerida`. Esto es exactamente lo que Jhey pidió: "ahí es donde entra el agente que me genera la respuesta de acuerdo a lo que respondió el comercio".

## 7. UI del panel — 3 vistas sobre la misma tabla

Pestaña "CRM Ventas" con 3 sub-tabs (mismo componente de tabla, filtro distinto):
1. **Leads Instagram** — `canal_principal = 'Instagram'`
2. **Leads LinkedIn** — `canal_principal = 'LinkedIn'`
3. **Prospectos** — todo lo demás (Facebook, Web, Email, WhatsApp directo)

Cada fila colapsada muestra: Nombre, Categoría, Canal, Badge de Etapa (`PipelineStatusBadge`), Cuenta grande (ícono si aplica). Al expandir (mismo patrón que `ExpandedLeadCRM.tsx`), se ven todos los campos de la sección 3 separados con su propia etiqueta — celular/WhatsApp y página web como campos distintos y visibles siempre, no enterrados en un texto libre de "Contacto" (esto es explícito porque fue lo que más ensució el Excel original).

Controles editables directamente en la fila expandida:
- Dropdown `estado_envio` (Pendiente de envío / Enviado) → dispara `crm_ventas_marcar_enviado`.
- Textarea `respuesta_real` con botón "Guardar respuesta" → dispara `crm_ventas_registrar_respuesta`.
- Una vez que existe `respuesta_sugerida`, mostrarla en un bloque destacado con botón "Copiar" (Jhey la copia y la pega en WhatsApp/Instagram/LinkedIn/correo — el sistema nunca envía).
- Dropdown de Etapa para las transiciones manuales (Agendado/Cerrado-ganado/Perdido/Descartado) → dispara `crm_ventas_cambiar_etapa`.

## 8. Migración de datos existentes

Importar las 114 filas ya armadas en `docs/crm-ventas-neggo.xlsx` (hoja "Pipeline") como seed inicial de `crm_ventas_leads`, respetando el mapeo de columnas de la sección 3 (ya tienen exactamente esta forma, fue diseñado para calzar). Una vez migrado y confirmado por Jhey, el Excel queda como archivo histórico — se deja de escribir ahí.

## 9. Criterios de aceptación

- [ ] Tabla `crm_ventas_leads` creada con RLS activo, solo accesible por `is_platform_admin()` — un comercio o cliente autenticado no puede leer ni una fila (probar explícitamente con un usuario no-admin).
- [ ] Las 5 funciones de la sección 5 existen, todas `security definer`, todas con `set search_path = public`, todas validan admin antes de escribir.
- [ ] Pestaña "CRM Ventas" visible en el admin, con las 3 sub-vistas funcionando como filtros de la misma tabla.
- [ ] Marcar "Enviado" mueve automáticamente el lead a "En seguimiento" sin que Jhey tenga que tocar la Etapa a mano.
- [ ] Guardar una `respuesta_real` cambia la etapa a "Respondió" y deja el lead visible para que el agente de Ventas genere la sugerida en su próxima corrida.
- [ ] Las 114 filas del Excel actual están migradas y visibles.
- [ ] Los 2 agentes de prospección (LinkedIn/Instagram) y el de Ventas quedan reescritos para escribir contra esta tabla vía Supabase en vez de contra el Excel (esto lo coordina Growth/CGO una vez que la tabla y las funciones existen — no es parte del trabajo de Ingeniería, pero Ingeniería debe avisar cuando esté listo para hacer el corte).
