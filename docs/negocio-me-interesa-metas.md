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
- Se muestra como una pestaña "Alertas de Conversión" dentro del panel "Clientes en Espera" (sección 9.5), extendiendo el ya existente sistema de Métricas de Rechazo — no es una tabla/sistema nuevo desde cero, reutiliza datos que ya se capturan.

**Código de confirmación de venta — degradado a opcional, no crítico:**
El código de 6 dígitos que el cliente genera y le da al comercio para confirmar una venta se mantiene como funcionalidad opcional: si se usa, la venta queda marcada "Vendido — Verificado" (un sello de confianza extra para el negocio, útil para su reputación), pero no es requisito ni el mecanismo anti-fraude central.

**Bancos:** mantiene su propio código de 6 dígitos (ya diseñado desde el inicio del proyecto, nunca conectado), generado por el asesor y confirmado por el cliente en la llamada — su propósito es distinto: verificar identidad del asesor, no verificar una venta.

**Constructoras:** usa el mecanismo ya diseñado en el documento original — cliente sube promesa de compraventa/escritura y recibe un Bono Neggo por hacerlo. No usa código ni encuesta, dado que el proceso de cierre (fiducias, bancos, tiempos largos) no tiene un momento único claro de verificación.

### 9.3 Señales de interés (negocios no registrados)
- El selector de Me Interesa (Bancos/Constructoras/Comercios) muestra la lista completa: negocios registrados + una lista curada de negocios grandes conocidos aunque no estén en la plataforma.
- Si el negocio elegido SÍ está registrado → flujo actual sin cambios (lead real).
- Si el negocio elegido NO está registrado → se crea una "señal de interés": tabla nueva, guarda datos completos del cliente (nombre, teléfono, categoría/producto, ciudad, negocio deseado), SIN organization_id (el negocio no existe en el sistema todavía). El cliente ve un mensaje honesto: "Registramos tu interés en [Negocio]. Te avisaremos apenas se una a Neggo." — nunca "tu solicitud fue enviada", porque sería falso.
- Cuando el negocio finalmente se registre, Neggo puede conectar manualmente esas señales de interés acumuladas con datos completos del cliente.

### 9.4 Lista curada de negocios conocidos
- Constante o tabla con bancos/constructoras/comercios grandes de Colombia conocidos, para poblar el selector ampliado de 9.3 incluso sin registro.

### 9.5 Panel "Clientes en Espera" (Admin)
- Agrega, por sector (Bancos/Constructoras/Comercios), las señales de interés acumuladas — permite ver qué categorías/negocios tienen más demanda represada, para priorizar a quién reclutar.

### 9.6 Sello de Confianza — pago específico
- Hoy se otorga automático y gratis al completar el onboarding de Comercio (Fase 1). Debe convertirse en un pago específico, separado de los planes Básico/Premium existentes.
