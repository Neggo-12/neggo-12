# Neggo — Módulo "Me Interesa" + Sistema de Metas/IFC

Este documento define el diseño de negocio acordado para dos sistemas relacionados pero
distintos del Portal de Clientes. Es la fuente de verdad — cualquier implementación debe
seguir esto al pie de la letra, no inventar variantes.

## 1. Los dos mecanismos de generación de leads (NO deben mezclarse)

| | **Me Interesa** | **Metas + IFC** |
|---|---|---|
| Naturaleza | Activa — el cliente pide contacto ya | Pasiva — mercado anónimo de ofertas |
| Qué genera | Un lead real en la pestaña "Solicitudes" del negocio | Una "oportunidad" en el feed del negocio, que compite con propuestas |
| Visibilidad del cliente | El negocio ve nombre/teléfono de inmediato | 100% anónimo hasta que el cliente diga "Me interesa" en una propuesta |

Nunca deben duplicarse ni confundirse entre sí — viven en pestañas separadas del dashboard del negocio.

## 2. "Me Interesa" — antes llamado "Banca Privada"

Sección renombrada en el Portal de Clientes. Contiene 3 botones: **Bancos**, **Constructoras**, **Comercios**.

### 2.1 Bancos
Flujo ya existente: el cliente selecciona banco(s) + tipo de producto (compra de cartera,
crédito hipotecario, tarjeta, libre inversión). El lead llega directo a esos bancos.
**Corrección pendiente:** debe usar el `organization_id` real del banco (no el nombre de
texto parseado del usuario, mecanismo actual frágil).

### 2.2 Constructoras
Onboarding **distinto** al de Bancos, porque el cliente no conoce nombres de constructoras:
- Tipo de vivienda: Casa / Apartamento
- Ubicación: comuna del Área Metropolitana de Medellín (16 comunas + corregimientos +
  municipios: Envigado, Itagüí, Sabaneta, Bello, La Estrella, Copacabana, Girardota, Barbosa,
  Caldas) — granularidad por **comuna**, no barrio específico.
- Estrato: rango (1 a 6)
- Presupuesto: rango (desde – hasta)
- Ciudad

**Motor de matching:** el lead llega a **todas** las constructoras cuyos proyectos coincidan
en ciudad + estrato + rango de presupuesto — no solo a una.

**Toggle "¿Necesitas financiación / crédito hipotecario?":** si se activa, se crea **una sola
solicitud** con **dos grupos de destinatarios**: las constructoras que hagan match, y los
bancos que ofrezcan crédito hipotecario. Es un único registro ligado al mismo cliente/evento,
nunca dos leads desconectados.

### 2.3 Comercios
El cliente elige categoría/subcategoría (misma taxonomía que Metas, ver sección 3). El lead
llega únicamente a comercios de esa categoría exacta — nunca a categorías no relacionadas.

## 3. Taxonomía de categorías/subcategorías (compartida entre Metas y Me Interesa)

Debe ser una única fuente de verdad — Metas y Me Interesa → Comercios usan exactamente
la misma lista.

| Categoría | Subcategorías |
|---|---|
| Celular | iPhone, Android |
| Viaje | Nacional, Internacional (+ cantidad de personas) |
| Vivienda | Apartamento, Casa, Apartaestudio |
| Carro | Híbrido, Eléctrico, Gasolina |
| Moto | Bajo Cilindraje, Medio Cilindraje, Alto Cilindraje |
| Computador | Mac/Apple, Windows/PC |
| Remodelación | Cocina, Baño, Integral/Todo el Hogar |
| Salud y Estética | Odontología/Diseño de Sonrisa, Cirugía Estética, Dermatología |
| Educación | Idiomas, Universidad/Posgrado, Cursos Cortos |
| Moda y Accesorios | Ropa, Calzado, Joyería |
| Deporte y Gimnasio | Membresía Gym, Equipos Deportivos |
| Mascotas | Veterinaria, Accesorios/Alimento |
| Eventos | Matrimonio, Fiestas/Celebraciones |
| Muebles y Decoración | Muebles, Decoración/Hogar |
| Belleza y Spa | Spa/Relajación, Peluquería/Estética |

**Caso especial — Meta de categoría "Vivienda" con IFC activo:**
- Si el cliente **sí tiene el dinero** (compra directa) → la oportunidad va a **constructoras**.
- Si el cliente **necesita financiación** → va a **ambos** (constructoras y bancos), como una
  sola oportunidad con dos grupos de destinatarios (mismo principio de la sección 2.2).

## 4. Algoritmo de distribución — 40/30/20/10

Aplica tanto a Metas/IFC como a Me Interesa. Determina qué propuestas/leads se activan
primero y en qué orden se rellena la cola.

- **40% Calidad** — qué tan bien coincide la oferta con lo pedido (monto, condiciones) +
  reputación histórica del negocio (ver sección 6).
- **30% Velocidad de respuesta** — favorece rapidez, pero no es el único factor.
- **20% Rotación** — evita que el mismo negocio gane siempre solo por ser rápido.
- **10% Sorteo** — aleatoriedad pequeña para dar oportunidad a negocios nuevos/chicos.

## 5. Sistema de cola anti-saturación (Metas/IFC)

- Máximo 3 propuestas visibles al cliente en el carrusel (`estado: 'activa'`); el resto en
  `estado: 'en_cola'`, ordenadas por score del algoritmo 40/30/20/10.
- Cliente rechaza una propuesta + dispara feedback estructurado → esa propuesta pasa a
  `'rechazada'`. El sistema activa automáticamente la de mayor score en la cola.
- Cliente acepta una propuesta ("Me interesa") → la Meta pasa a `estado: 'finalizada'` →
  trigger en Supabase marca todas las demás (`'en_cola'` y `'activa'`) como
  `'cancelada_por_cierre'`.
- **Protección para negocios:** si una propuesta nunca llegó a mostrarse antes del cierre,
  su estado final debe ser `'expirada_sin_mostrarse'`, distinto de `'cancelada_por_cierre'`
  — para que el negocio sepa que no perdió compitiendo, simplemente no le tocó turno.
- Solo cuando el cliente marca "Me interesa" en una propuesta se libera su información real
  (nombre, teléfono) al negocio — antes de eso, todo es anónimo.

## 6. Reputación por feedback (separada del Sello de Confianza)

Dos señales de confianza distintas, no deben mezclarse:

- **Sello de Confianza Neggo** (ya existente): verificación legal estática (NIT válido,
  origen legal). Es un sí/no que no cambia con el tiempo.
- **Reputación por Calidad** (nueva): score dinámico que sube/baja según feedback real de
  clientes. Alimenta el 40% de "Calidad" del algoritmo (sección 4).

**Implementación:** extender el wizard de Feedback ya existente (Paso 1: sector → Paso 2:
empresa → Paso 3: mensaje), reutilizando los 4 tipos de mensaje ya existentes en el
código (`felicitacion`, `problema`, `sugerencia`, `mala-atencion` — no se introduce una
taxonomía nueva de 3 tipos). Cada mensaje queda ligado al negocio específico y se agrega
en el tiempo a su score de reputación visible para Neggo (y potencialmente para el
cliente al ver propuestas).

**Fórmula de reputación (definitiva):**

| Evento | Puntos |
|---|---|
| Felicitación | +5 |
| Sugerencia | 0 |
| Problema | −3 |
| Mala atención | −8 |
| El negocio responde al feedback | +2 extra |
| Cliente satisfecho con la respuesta | +5 extra |
| Cliente insatisfecho con la respuesta | −2 extra |

- Piso en 0 — el score nunca es negativo.
- Sin decaimiento en el tiempo por ahora (todo el historial pesa igual).
- Requiere un campo nuevo en la tabla `feedback`: `satisfaccion_respuesta`
  (`'satisfecho' | 'insatisfecho' | null` — `null` mientras el cliente no haya calificado
  la respuesta del negocio).

## 7. Principio de gobernanza de datos (heredado del documento original del MVP)

- Cada negocio recibe solo datos de clientes que lo seleccionaron a él.
- Un negocio nunca debe enterarse de qué otros negocios seleccionó el mismo cliente
  (excepto en el caso explícito del toggle de financiación, sección 2.2, donde es
  intencional que ambos sepan que están conectados al mismo cliente/evento).
- No hay venta de bases de datos; toda entrega de datos de contacto requiere una acción
  explícita del cliente (crear la solicitud en Me Interesa, o decir "Me interesa" en una
  propuesta de Metas/IFC).

## 8. Registro de clientes B2C — relación banco-producto real

Hoy el registro B2C permite seleccionar bancos con checkboxes simples ("bancos con
productos activos"), sin registrar qué producto tiene el cliente en cada uno. Eso no
alcanza para que un banco confíe en el badge "Cliente Banco" de su dashboard — hoy esa
señal no tiene respaldo real en la base de datos.

**Requisito:**
- El cliente selecciona sus bancos (puede ser más de uno).
- Por cada banco seleccionado, indica qué producto(s) tiene ahí: cuenta de ahorros,
  cuenta corriente, tarjeta de crédito, CDT, crédito hipotecario, crédito de libre
  inversión (lista abierta a crecer, igual que las demás taxonomías del documento).
- Esta relación debe modelarse como cliente–banco–producto, ligada al `organization_id`
  real del banco (no a un nombre de texto) — el mismo principio de corrección que la
  sección 2.1 aplica a las solicitudes de Me Interesa.
- El badge "Cliente Banco" en el dashboard bancario deja de ser una coincidencia de
  nombres y pasa a ser una consulta real: ¿existe al menos una fila para este cliente y
  este `organization_id`?

## Pendiente prioritario — Navegación de ComerciosDashboard.tsx

Las pestañas "Oportunidades IFC", "Suscripción", "Feedback Clientes" y "Métricas
Rechazo" del sidebar de Comercios son decorativas — todo su contenido se muestra junto
en una sola pantalla bajo "Dashboard", sin importar cuál esté seleccionada. Solo
"Dashboard" y la nueva "Solicitudes (Me Interesa)" están realmente conectadas. Hay que
separar el contenido en secciones reales, cada una bajo su propia pestaña — mismo
patrón que ya se usa en BankDashboard.tsx y ConstructorasDashboard.tsx.

## 9. Monetización — Fase de Facturación (roadmap aprobado)

### 9.1 CRM real en las pestañas de Solicitudes (Bancos/Constructoras/Comercios) — PRIORIDAD 1
Hoy SolicitudesTab.tsx (los 3, de bancos/constructoras/comercios) solo muestra nombre, teléfono, estado binario (pendiente/contactado) y fecha. Debe ampliarse a un CRM real:
- Mostrar score Datacrédito (users.score_estimado) e ingresos estimados (users.rango_ingresos) — datos que ya existen pero no se muestran.
- Prioridad automática calculada desde el score.
- Pipeline de estados real (reemplaza el booleano contactado): Pendiente → Contactado → En Proceso → Documentación → Viable → Aprobado → Desembolsado → Perdido.
- Acciones rápidas por fila: Llamar, WhatsApp, Mover Pipeline, Marcar Seguimiento.
- Vista expandible por fila con información financiera/operativa completa.
- Este pipeline es REQUISITO TÉCNICO de 9.2 — el estado "Desembolsado"/venta cerrada es el evento que dispara el success fee.

**Estado de implementación (actualizado 2026-07-10):**
- Migración `supabase/migrations/20260710_crm_pipeline_estado.sql` lista (agrega `estado_pipeline`, `proxima_gestion_at`, backfill, índice). RLS de UPDATE ya cubierta por la policy existente `me_interesa_destinatarios_update_own` (row-level, no requirió SQL nuevo — verificado también contra `information_schema.column_privileges`, sin GRANTs column-level restrictivos).
- `repositories.ts` ya expone `estadoPipeline`, `proximaGestionAt`, `scoreEstimado`, `rangoIngresos` en `MeInteresaLeadDisplay`, más `updateMeInteresaPipelineEstado` y `updateMeInteresaProximaGestion`.
- **Pendiente — hardening column-level:** hoy cualquier columna de una fila propia es editable a nivel de RLS/GRANT (row-level, no column-level); el código de la app solo escribe `estado_pipeline`/`proxima_gestion_at`, pero no hay bloqueo a nivel DB que impida que alguien con la API key de Supabase intente escribir otras columnas (ej. `organization_id`) directo. Fase futura: `GRANT UPDATE (estado_pipeline, proxima_gestion_at)` explícito al rol `authenticated`, o un trigger `BEFORE UPDATE` que revierta cambios a columnas protegidas.
- Pendiente: UI de los 3 `SolicitudesTab.tsx` (badge de pipeline, fila expandible, acciones rápidas), y la fórmula rango de ingresos → `score_estimado` en el registro B2C (bloqueada hasta agregar el campo al formulario).

### 9.2 Capa de facturación (facturas_ledger)
- CPL automático: cada lead real entregado (fila nueva en me_interesa_destinatarios) genera un cargo de $30.000 COP en facturas_ledger para el negocio destinatario.
- Success fee: 2.25% para Constructoras, se dispara cuando un lead en el pipeline de 9.1 pasa a estado "Desembolsado"/venta cerrada.
- Panel "Facturación Ecosistema" en Admin: ver cuánto le debe cada negocio a Neggo.

### 9.2.1 Anti-fraude — diseño corregido tras discusión

**"Vendido" queda 100% manual/libre, sin fricción.** El negocio marca vendido y se factura directo — un negocio no tiene incentivo económico para mentir aquí (marcar "vendido" le genera un costo, no un beneficio).

**El riesgo real está en el lado contrario:** un negocio podría marcar "No Interesado"/"Perdido" en una venta que sí ocurrió, para evadir la comisión. La defensa NO es verificar cada rechazo con el cliente (demasiada fricción) — es un sistema de alertas agregadas para Admin.

**Sistema de alertas de conversión (Admin):**
- Por cada negocio, calcular tasa de conversión (Vendido / Total leads recibidos).
- Comparar contra el promedio del mismo sector/categoría (ej. si "Diseño de Sonrisa" convierte 30% en promedio y un comercio específico convierte 2%, se marca para revisión).
- Se muestra como una pestaña "Alertas de Conversión" dentro del panel "Clientes en Espera" (sección 9.3.5), extendiendo el ya existente sistema de Métricas de Rechazo — no es una tabla/sistema nuevo desde cero, reutiliza datos que ya se capturan.

**Código de confirmación de venta — degradado a opcional, no crítico:**
El código de 6 dígitos que el cliente genera y le da al comercio para confirmar una venta se mantiene como funcionalidad opcional: si se usa, la venta queda marcada "Vendido — Verificado" (un sello de confianza extra para el negocio, útil para su reputación), pero no es requisito ni el mecanismo anti-fraude central.

**Bancos:** mantiene su propio código de 6 dígitos (ya diseñado desde el inicio del proyecto, nunca conectado), generado por el asesor y confirmado por el cliente en la llamada — su propósito es distinto: verificar identidad del asesor, no verificar una venta.

**Constructoras:** usa el mecanismo ya diseñado en el documento original — cliente sube promesa de compraventa/escritura y recibe un Bono Neggo por hacerlo. No usa código ni encuesta, dado que el proceso de cierre (fiducias, bancos, tiempos largos) no tiene un momento único claro de verificación.

### 9.3 Señales de interés (negocios no registrados) — CERRADO E IMPLEMENTADO

**Objetivo:** cuando un cliente busca un banco/constructora/comercio que no está en Neggo (o que no tuvo match automático), en vez de un callejón sin salida se registra su interés — dato honesto, sin pretender que hay un lead real, y acumulable para priorizar reclutamiento comercial.

#### 9.3.1 Esquema

Dos tablas nuevas (migración `supabase/migrations/20260711_senales_interes.sql`, aplicada y verificada con `pg_policies`; más una migración de ajuste `supabase/migrations/20260712_senal_interes_negocio_opcional.sql`, ver 9.3.6):

**`negocios_curados`** — lo que la UI muestra como "Negocios de Interés": lista editable desde Admin de negocios grandes conocidos que aún no se han unido a Neggo. (El nombre de tabla/identificadores internos sigue siendo `negocios_curados`/`NegocioCuradoRow` — solo el texto visible para el usuario se renombró a "Negocios de Interés".)
```sql
CREATE TABLE negocios_curados (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sector text NOT NULL CHECK (sector IN ('banco', 'constructora', 'comercio')),
  nombre text NOT NULL,
  ciudad text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sector, nombre)
);
```
- `activo` es soft-delete: si Admin "quita" un Negocio de Interés (ej. porque se registró de verdad), las señales de interés viejas que ya lo referencian por nombre siguen intactas.
- `ciudad` es nullable a nivel de esquema — la obligatoriedad para constructora/comercio se valida en el formulario de Admin (sección 9.3.5), no en la base de datos, porque los bancos sí pueden ser nacionales.
- RLS: lectura abierta a cualquier `authenticated` (el cliente la necesita para armar el selector); escritura (insert/update) solo `is_platform_admin()`. Sin policy de DELETE — el soft-delete vía `activo` es el único mecanismo de baja.

**`senales_interes`** — lo que se crea cuando un cliente elige un Negocio de Interés (no registrado) en vez de uno real, o registra interés genérico sin nombrar uno específico.
```sql
CREATE TABLE senales_interes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id text NOT NULL REFERENCES users(id),
  cliente_nombre text NOT NULL,
  cliente_telefono text NOT NULL,
  sector text NOT NULL CHECK (sector IN ('banco', 'constructora', 'comercio')),
  negocio_deseado text,               -- nullable desde 9.3.6: obligatorio solo para sector='banco'
  producto_bancario text,
  tipo_vivienda text,
  categoria text,
  subcategoria text,
  ciudad text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
- Sin `organization_id` — el negocio no existe en el sistema; es una tabla de "demanda represada", no de leads.
- `cliente_nombre`/`cliente_telefono` se guardan como snapshot (no join a `users`) porque son los datos que se necesitan para el reclutamiento comercial futuro, independientemente de cambios posteriores en el registro del cliente.
- RLS: el cliente inserta solo su propia señal (`cliente_id = auth.uid()::text`); SELECT es del propio cliente o de `is_platform_admin()` (para el panel de Admin).

#### 9.3.2 Flujo Bancos — selector combinado

`SolicitudBancoDialog` (`MeInteresaView.tsx`) carga en paralelo `fetchBancosAprobados()` (reales) y `fetchNegociosCuradosBySector('banco')` (Negocios de Interés), y los muestra como un único selector de chips. Cada Negocio de Interés lleva un badge visual "No registrado" para que el cliente sepa que no es un lead real. Internamente, cada entrada seleccionada se identifica por id (`banco.id`) o por id prefijado `curated:${negocioCurado.id}` — el prefijo es lo único que distingue ambos tipos en el estado del componente, sin duplicar un sistema de tipos paralelo. Para banco, `negocioDeseado` sigue siendo obligatorio (ver 9.3.6) — siempre se elige una entidad real o un Negocio de Interés por nombre.

Al enviar: los ids sin prefijo van al flujo real (`addSolicitudBanco`, sin cambios); cada id `curated:` dispara una llamada independiente a `addSenalInteres` (una por negocio curado elegido). Es posible enviar una combinación de ambos en un solo submit — ej. 2 bancos reales + 1 curado — y el cliente ve un solo mensaje de confirmación agregando ambos conteos.

#### 9.3.3 Flujo Constructoras/Comercios — fallback en 0 resultados

El matching automático (`fetchProyectosMatch`/`fetchComerciosMatch`, ya existente) no cambia. La solicitud real siempre se guarda, incluso si no hay match (queda en historial con estado "Sin destinatarios disponibles" — comportamiento preexistente).

Lo nuevo: si el resultado del matching automático es 0, el diálogo pasa a un estado de fallback — muestra el mensaje "No encontramos [constructoras/comercios] que hagan match. ¿Te interesa alguno de estos?" y un selector de `fetchNegociosCuradosBySector(sector)` filtrado client-side por ciudad usando `normalizeCiudad()` (`@/lib/utils`, ver 9.3.6) — un Negocio de Interés con `ciudad: null` se ofrece en cualquier ciudad (negocio nacional); uno con ciudad específica se ofrece si coincide con la ciudad elegida por el cliente ignorando tildes y mayúsculas/minúsculas. Elegir uno dispara `addSenalInteres` como una acción separada de la solicitud real ya guardada — así el historial refleja fielmente que hubo un intento real sin match, más (opcionalmente) una señal de interés adicional.

Si no hay ningún Negocio de Interés que coincida con la ciudad (`curados.length === 0`), el cliente ya no se queda en un callejón sin salida: puede registrar la señal igual, sin elegir nombre — botón "Registrar interés de todas formas", que llama `addSenalInteres` con `negocioDeseado` sin definir (ver 9.3.6).

No se agregó un selector manual de negocios reales para Constructoras/Comercios (a diferencia de Bancos) — el matching automático sigue siendo la única vía de conexión con negocios reales en estos dos sectores; los Negocios de Interés son solo fallback, nunca alternativa a un match real disponible.

#### 9.3.4 Historial del cliente — 4ª variante

`SolicitudCliente` (`usePortalStore.ts`) es una unión discriminada por `origen`; se agregó una 4ª variante `SolicitudSenalInteresCliente` (`origen: 'senal-interes'`) junto a `banco`/`constructora`/`comercio`. `hydrateSolicitudes()` combina en paralelo `fetchMeInteresaSolicitudesByCliente` (leads reales) y `fetchSenalesInteresByCliente` (señales propias), y los fusiona en un solo historial ordenado por fecha — el cliente ve todo en una sola línea de tiempo, sin sección separada.

Mensaje honesto en el historial (nunca "solicitud enviada", porque sería falso): **"Interés registrado en [negocio] — Te avisaremos cuando se una a Neggo"**, con ícono (`Bell`) y badge (violeta) visualmente distintos del pipeline normal — para que quede claro que es un estado de espera, no un lead en proceso. Cuando la señal es genérica (`negocioDeseado` null, ver 9.3.6), el mensaje cae a un texto derivado de `categoria`/`tipoVivienda` en vez del nombre del negocio (ej. "Interés registrado en vivienda tipo Apartamento — Te avisaremos...").

#### 9.3.5 Panel Admin "Clientes en Espera"

Nueva sección del sidebar de `AdminDashboard.tsx`, con dos bloques:

1. **Gestión de Negocios de Interés** — formulario (sector, nombre, ciudad) + tabla de existentes con toggle activo/inactivo (soft-delete vía `activo`). La ciudad es obligatoria en el formulario si el sector es constructora o comercio (casi siempre locales); opcional si es banco (puede ser nacional) — validación en la UI del formulario, deshabilita el botón "Agregar" si falta, sin cambio de esquema (`ciudad` ya es nullable en la tabla).
2. **Agregación de señales de interés** — `fetchTodasLasSenalesInteres()` (todas, sin filtro por cliente — permitido solo a Admin por RLS), agrupadas client-side por sector y luego por un label derivado (`negocio_deseado` si existe; si es null, categoría/tipo de vivienda + ciudad — ver 9.3.6), ordenadas de mayor a menor volumen. Cada grupo es expandible: al hacer clic muestra la lista de clientes detrás del conteo (`clienteNombre`/`clienteTelefono`, snapshot guardado en la señal), para que Admin pueda contactarlos directamente al reclutar el negocio. Agregación client-side (no vista SQL) porque el volumen esperado es bajo por ahora — mismo criterio ya aplicado en el resto del proyecto; se difiere a una vista/materialización cuando haya evidencia real de que hace falta.

Este panel es también donde eventualmente vivirá la pestaña "Alertas de Conversión" mencionada en la sección 9.2.1 (anti-fraude) — no construida todavía, solo referenciada ahí.

#### 9.3.6 Ajustes posteriores al cierre — negocio_deseado opcional + normalizeCiudad + clientes visibles

Tres correcciones aplicadas después del cierre inicial de la sección (migración `supabase/migrations/20260712_senal_interes_negocio_opcional.sql`):

1. **`negocio_deseado` pasa a nullable**, con un CHECK que lo sigue exigiendo solo para `sector='banco'`:
   ```sql
   ALTER TABLE senales_interes ALTER COLUMN negocio_deseado DROP NOT NULL;
   ALTER TABLE senales_interes
     ADD CONSTRAINT senales_interes_negocio_deseado_banco_check
     CHECK (sector <> 'banco' OR negocio_deseado IS NOT NULL);
   ```
   Motivo: para constructora/comercio, exigir que el cliente elija un Negocio de Interés específico obligaba a Admin a poblar cientos de entradas solo para no bloquear el flujo. Ahora el cliente puede registrar interés genérico (solo categoría/tipo de vivienda + ciudad) sin nombrar un negocio — sigue siendo el centro del flujo para banco, donde el selector siempre exige elegir una entidad.

2. **`normalizeCiudad()`** (`web/src/lib/utils.ts`) — quita tildes/diacríticos (vía `.normalize('NFD').replace(/\p{Mn}/gu, '')`) y pasa a minúsculas. Se usa en el filtro de Negocios de Interés por ciudad en los diálogos de fallback (Constructoras/Comercios). Motivo: el campo `ciudad` de `negocios_curados` se captura con un `<Input>` de texto libre en el panel Admin (no un `<Select>` de la constante `CIUDADES`, a diferencia de todos los demás puntos donde se captura ciudad en la app), así que Admin podía escribir "medellin" mientras el cliente elige "Medellín" en su dropdown y el filtro exacto anterior los perdía. Se revisó `fetchComerciosMatch`, `fetchProyectosMatch` y `ComercioOnboarding.tsx`: en los tres, ambos lados de la comparación de ciudad se originan siempre en el mismo `<Select>` de `CIUDADES` — sin riesgo real de mismatch — así que no se tocaron.

3. **Botón "Registrar interés de todas formas"** en el estado vacío (`curados.length === 0`) de los diálogos de fallback de Constructoras/Comercios — antes ese estado solo mostraba texto informativo y un botón de cerrar; ahora permite registrar la señal genérica sin negocio específico, en vez de terminar en un callejón sin salida.

### 9.6 Sello de Confianza — pago específico
- Hoy se otorga automático y gratis al completar el onboarding de Comercio (Fase 1). Debe convertirse en un pago específico, separado de los planes Básico/Premium existentes.

## 10. Checklist de confianza para negociar con Bancos — pendiente de cierre

Antes de acercarse formalmente a un banco grande, esto es lo que un negocio serio evalúa antes de confiar/conectarse:

1. **Control de acceso real (RLS)** — ✅ Ya construido, trabajado extensamente en esta sesión.
2. **Cifrado en tránsito y en reposo** — ✅ Ya lo provee Supabase por defecto (TLS + cifrado en reposo).
3. **Registro de auditoría** — ⚠️ Existe la tabla audit_log, pero falta confirmar qué tan completa es su cobertura hoy (qué eventos realmente registra).
4. **Certificaciones de cumplimiento** — ⚠️ Supabase tiene certificación SOC 2 Type II; verificar su estado actual antes de citarla formalmente ante un banco.
5. **Ley de protección de datos colombiana (Habeas Data, Ley 1581 de 2012)** — ❌ Pendiente: confirmar la región donde vive el proyecto de Supabase, y redactar una política de tratamiento de datos documentada.
6. **Autenticación multifactor (MFA) para cuentas Admin** — ❌ No implementado hoy. Estándar mínimo esperado por cualquier banco.
7. **Auditoría de seguridad externa (pentest)** — ❌ No realizado. Antes de una reunión comercial con un banco grande, tener un informe de un tercero pesa mucho más que cualquier explicación arquitectónica propia.

**Recomendación:** dedicar una sesión completa de auditoría de seguridad (repasando todo lo construido en las 3+ sesiones hasta ahora, más lo nuevo) y evaluar contratar un pentest externo económico, antes de la primera reunión comercial formal con un banco.

## 11. Ruta hacia una auditoría de seguridad 8-9/10 — pendiente prioritario

Auditoría honesta actual: 6.5/10. Para llegar a 8-9/10, se necesitan 3 pilares que hoy no existen:

1. **MFA (Autenticación Multifactor)** para cuentas de Admin y, eventualmente, cuentas B2B — segundo factor de verificación al iniciar sesión, más allá de la contraseña.
2. **Pentest externo** — contratar una auditoría de penetración por un tercero independiente antes de negociar con bancos grandes.
3. **Tests automatizados** — cobertura de pruebas automáticas (al menos en flujos críticos: autenticación, RLS, cálculo de facturación) para evitar regresiones cuando se agregan features nuevas.

Ninguno de los 3 está implementado hoy. Se recomienda abordarlos en una sesión dedicada, separada del desarrollo de features nuevas.

## 12. Pendientes futuros — Fase 9.3 (Facturación mensual + tarifas por banco)

- **Roles internos por negocio (admin maestro vs. empleados):** hoy cada negocio (banco/constructora/comercio) opera con un solo nivel de acceso vía membership — no hay distinción entre un "admin maestro" de la organización y empleados con permisos limitados (ej. alguien que puede gestionar leads pero no ver/reportar facturación, o no cambiar tarifas). No se construye en la Fase 9.3 — queda documentado como pendiente para una fase posterior de gestión de equipos/permisos internos por organización.

## 13. Corrección de proceso — verificación de TypeScript

Durante gran parte de esta sesión, el comando de verificación usado (`npx tsc --noEmit -p .`) no revisaba ningún archivo real — el tsconfig.json raíz es "solution-style" (`files: []` + `references`), y sin la flag `--build` no compila ni verifica nada. Cada "0 errores" reportado durante ese período era una verificación vacía, no una confirmación real.

Se descubrió al investigar un bug real reportado por el usuario (`Loader2 is not defined` en producción, un error que `tsc` debería haber atrapado). Al corregir el comando a `npx tsc --noEmit -p tsconfig.app.json`, aparecieron 19 errores reales acumulados — todos del mismo patrón ya conocido (columnas/funciones RPC aplicadas en Supabase pero nunca sincronizadas en integrations/supabase/types.ts), sin ningún error de lógica de negocio nuevo.

**Corrección permanente:** usar siempre `npx tsc --noEmit -p tsconfig.app.json` para cualquier verificación de tipos futura en este proyecto — nunca `-p .` (el comando raíz).

**Lección:** las pruebas reales en el navegador con evidencia de base de datos siguen siendo la fuente de verdad final — fueron esas pruebas, no la verificación automática, las que dieron confianza real en el sistema durante toda la sesión.

## 14. Auditoría de UPDATEs silenciosos + Sentry + causa raíz del bug de "falabella"

### 14.1 Bug de los toggles en "Clientes en Espera" — causa raíz confirmada

Al togglear `activo` en un Negocio de Interés (caso concreto: "falabella"/"falabella1"), el cambio no se aplicaba en la base de datos sin que la UI mostrara ningún error. Investigación:

- **Causa raíz confirmada con SQL real:** no es un problema de RLS ni de la cuenta Admin — se verificó que la cuenta Admin real está correctamente vinculada (`users.id` = `auth.uid()`, `rol='Admin'`) y que `is_platform_admin()` responde `true` para esa sesión.
- El origen real es el **"Modo Demo" del `ProfileSwitcher`** (`web/src/components/ProfileSwitcher.tsx` → `switchProfile()` en `useAuthStore.ts`): el botón "Modo Admin Neggo" pone un usuario mock (`USUARIOS_DEMO.admin`) en el store de Zustand y explícitamente `session: null` — **no pasa por `supabase.auth.signInWithPassword`**, así que no garantiza que exista un JWT real cargado en el cliente de Supabase. Si se navega al panel Admin vía este atajo de demo en vez de un login real, el `auth.uid()` que Postgres ve en cada request puede no ser el esperado (o ser nulo), y cualquier UPDATE protegido por RLS se bloquea en silencio — exactamente el síntoma observado.
- El bug NO estaba en el diseño de RLS ni en la lógica de negocio — estaba en confundir "estar en modo demo Admin en la UI" con "tener una sesión real autenticada".

### 14.2 Auditoría completa — verificación de filas afectadas en UPDATEs

Se revisaron las 12 funciones de `repositories.ts` que hacen `.update(...)`. Antes de esta ronda, 2 de las 12 no verificaban cuántas filas afectó el UPDATE (`setMetaIFC` y `toggleNegocioCuradoActivo`) — un UPDATE bloqueado por RLS no lanza error de Postgres, solo afecta 0 filas silenciosamente, y sin este chequeo la app no tiene forma de distinguir "se actualizó" de "RLS lo bloqueó sin avisar".

**Estado actual: las 12 ahora verifican filas afectadas** (`.select('id')` + `if (!data || data.length === 0) return { error: ... }`), siguiendo el patrón ya establecido por `updateOrganizationCiudad`: `setMetaIFC`, `updateUserStatus`, `updateOrganizationStatus`, `updateOrganizationMetadata`, `updateOrganizationTrustSeal`, `updateOrganizationCiudad`, `updateTarifaBanco`, `updatePlanComercio`, `updateOrganizationPlanNegociacion`, `toggleNegocioCuradoActivo`, `updateMeInteresaPipelineEstado`, `updateMeInteresaProximaGestion`.

### 14.3 Sentry — monitoreo de errores en producción

Se implementó `@sentry/react` para capturar errores reales sin depender de que un usuario reporte manualmente que algo falló:

- `core/infrastructure/env.ts` — `SENTRY_DSN`/`isSentryConfigured`, mismo patrón que `isSupabaseEnvConfigured`.
- `core/infrastructure/sentry.ts` (nuevo) — `initSentry()` (llamada una vez en `main.tsx`, antes del render) y `reportDbError()`.
- `repositories.ts` — `errMessage()` (el único punto por el que pasan todos los errores reales de Supabase/Postgres) reporta a Sentry automáticamente; los 12 sitios de "0 filas afectadas" de la sección 14.2 pasan por un nuevo helper `noRowsError()` que hace lo mismo, preservando el mensaje visible al usuario sin cambios.
- **Activación condicionada:** `initSentry()` es no-op si no hay `VITE_SENTRY_DSN` configurado O si no se corre en producción (`import.meta.env.PROD`) — en `npm run dev` local nunca reporta nada, para no ensuciar la cuenta de Sentry con ruido de desarrollo.

**Pendiente de validar con evidencia real:** esto no se ha probado de punta a punta todavía — requiere un build de producción real (`npm run build` + deploy) para confirmar que un error efectivamente aparece en el dashboard de Sentry. Hasta que eso no se verifique con evidencia real, esta implementación se considera "aplicada pero no confirmada en producción" — mismo criterio de verificación que el resto de esta sesión.

### 14.4 Nuevo pendiente en el backlog

Considerar remover o etiquetar de forma mucho más visible el "Modo Demo" del `ProfileSwitcher` (sección "Módulo de Pruebas y Simulación — Modo Demo" en `AdminDashboard.tsx` y las demás vistas) — hoy es fácil entrar en modo demo sin darse cuenta de que no es una sesión real, y eso fue la causa raíz confirmada del bug de 14.1. No se ha decidido todavía si la solución es un badge visual más agresivo, restringirlo a un build de desarrollo únicamente, o remover el atajo por completo en producción.

## 15. Metas/IFC → Leads reales de Comercios (en diseño)

Conecta el sistema de Metas/IFC (hoy real en su creación/persistencia, pero sin ningún puente hacia negocios reales) con comercios registrados que califiquen por categoría — alcance de esta fase: **solo Comercios**, sin Bancos/Constructoras todavía. Diseño confirmado, pendiente de aplicar SQL y código.

### 15.1 Aclaración de diseño — `ofertas_comercios.comercio_id` es un `users.id`, no un `organization_id` (intencional, no deuda técnica)

Durante el diseño de esta fase se identificó que `ofertas_comercios.comercio_id` almacena el id del **usuario** que envía la propuesta, no el `organization_id` del negocio — una asimetría frente al resto del proyecto (Me Interesa, facturación) donde todo se referencia por `organization_id`. **Esto no es un bug a corregir: es comportamiento de negocio intencional**, adelantado a la futura fase de roles internos por negocio (admin maestro + empleados, ya documentada como pendiente en la sección 12) — cuando exista, cada empleado de un mismo comercio podrá competir con su propio margen de negociación por el mismo cliente/meta, y eso es deseable, no un error a prevenir.

Lo que sí revela esta asimetría es el problema real pendiente: con muchos negocios y, eventualmente, muchos empleados por negocio compitiendo, un cliente podría llegar a ver cientos de ofertas para una sola meta — inmanejable. La solución a esto **ya estaba diseñada desde el documento original del proyecto** y nunca se construyó: el **algoritmo de distribución 40/30/20/10** (Calidad + Respuesta + Rotación + Sorteo, sección 4) combinado con el **sistema de cola anti-saturación** (máximo 3-5 ofertas visibles simultáneamente, el resto en cola, sección 5). Esa es la pieza que debe curar/limitar cuántas propuestas ve un cliente por meta — no una restricción artificial sobre quién puede enviar una propuesta.

**Implicación para el roadmap:** antes o junto con la fase de roles internos por negocio, hace falta implementar el algoritmo 40/30/20/10 + cola anti-saturación aplicado a `ofertas_comercios` (hoy ese algoritmo solo existe documentado en las secciones 4 y 5, sin implementación real en ningún flujo del proyecto). No se construye en la fase actual (Comercios-only, sin roles internos).

### 15.2 Pendiente descubierto — "Facturación Automática" / "Bóveda del Cliente" es 100% desconectado

Diagnóstico honesto: `ofertas_comercios.facturacion_automatica` se escribe (el switch en `EnviarPropuestaDialog.tsx` sí persiste el booleano) pero nunca se lee en ningún lugar del código ni de las migraciones — es una columna write-only. `FacturasView.tsx` (la "Bóveda Digital" del cliente) es 100% mock, renderiza `MOCK_INVOICES` estático sin ningún fetch a la base de datos. El banner que promete depósito automático de facturas usando el "ID Único IFC" describe un mecanismo que no existe en ningún punto del sistema.

Para construir esto de verdad hace falta, como mínimo:
1. Un estado real de "oferta aceptada por el cliente" en `ofertas_comercios` (hoy no existe ningún flujo donde el cliente acepte/rechace una propuesta — depende de la pieza pendiente "cliente ve y responde ofertas reales", Fase 15 punto #5 original).
2. Definir qué evento cuenta como "compra concretada" — no existe hoy ningún estado de "compra confirmada".
3. Tabla real de facturas del cliente + conectar `FacturasView.tsx` a datos reales en vez de `MOCK_INVOICES`.

No se construye en esta sesión — queda documentado como el siguiente gran capítulo pendiente, que depende primero de que el cliente pueda ver/responder ofertas reales (Fase 15.3, next).
