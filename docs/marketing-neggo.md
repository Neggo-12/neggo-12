# Estrategia de Marketing — Neggo

## 1. Posicionamiento — "Un motor, varias caras"

No presentarse como "otro marketplace" — genera poco interés real tanto en negocios como en clientes. En cambio, un solo motor tecnológico (Neggo) con un discurso completamente distinto para cada audiencia, igual que hacen los grupos empresariales grandes (Grupo Bolívar, Grupo Sura).

## 2. Mensajes por audiencia

| Audiencia | Mensaje NO usar | Mensaje SÍ usar |
|---|---|---|
| Bancos | "Marketplace de leads" | "Infraestructura de adquisición de clientes verificados, con anti-fraude incorporado" |
| Comercios | "Publica tu negocio" | "Tu canal de crecimiento — clientes ya calificados, listos para comprar" |
| Constructoras | "Otro portal inmobiliario" | "Tu equipo de captación digital — leads reales con score financiero, sin pautar" |
| Clientes finales | "Encuentra ofertas" | "Tu aliado financiero — te protegemos de estafas y te conseguimos las mejores condiciones" |

## 3. Diferenciador único — Confianza y anti-fraude

No es "conseguimos leads" — es el código de verificación de identidad del asesor (anti-phishing), el Sello de Confianza, y la protección real contra estafas telefónicas. Esta es la historia que ningún otro agregador cuenta.

**Elevator Pitch:**
"Neggo te trae clientes ya verificados, con score financiero real y protegidos contra fraude — sin que tu equipo comercial tenga que salir a buscarlos. Pagas solo por resultados reales entregados, no por publicidad genérica que no sabes si funciona."

## 4. Estrategias de crecimiento agresivo (referencias reales)

- Loop de referidos (PayPal/Dropbox): cliente refiere cliente, ambos ganan algo.
- "Land and expand" ciudad por ciudad (Uber): dominar Medellín completamente antes de expandir, con casos de éxito medibles como argumento de venta.
- Ventas directas fundador-a-fundador para B2B (bancos/constructoras) — no se consiguen con pauta digital.
- Escasez/exclusividad: "Solo los primeros 50 comercios de Medellín obtienen el Sello de Confianza gratis."
- Incentivo al primer uso: beneficio especial en la primera solicitud de Me Interesa, comisión reducida para el primer lote de comercios.

### Métricas objetivo — ejemplo de referencia (ajustar según capacidad real)
- Q1: 20-30 comercios activos en Medellín, 3-5 constructoras, primer banco piloto.
- Q1: 500+ clientes B2C registrados en Medellín.
- Meta de conversión: al menos 1 venta cerrada por cada 10 leads entregados a un comercio (10% — ajustar con datos reales una vez haya volumen).
- Revisar y ajustar estas metas cada trimestre con datos reales del negocio, no mantenerlas fijas.

## 5. Capacidades reales de la plataforma como argumento de venta

Ya no son promesas — son funcionalidades reales, probadas: CRM con pipeline por sector, facturación automática mensual con conciliación, Metas con IFC conectadas a comercios reales. Esto es evidencia concreta para mostrarle a un banco grande, no una idea en papel.

**Corrección 4 ago:** "tarifas negociables por banco" describía solo el mecanismo de Bancos — los Comercios tienen su propio sistema de tarifas, distinto y ya construido (verificado en la base de datos real, tabla `planes_comercio`, 4 ago). No mezclar ambos en contenido dirigido a comercios.

### 5.1 Cómo pagan los Comercios — lógica de los 3 planes (corregido 4 ago, a pedido de Jhey)

Tres planes (`planes_comercio`), todos negociables caso por caso vía `tarifas_comercio_negociadas`. **La lógica correcta del negocio** (no usar las cifras que había en la tabla `planes_comercio` de la base de datos hasta el 4 ago — Jhey las revisó y no reflejaban el modelo real; están pendientes de que Ingeniería las corrija en la BD, ver nota abajo):

| Plan | Cómo paga el comercio |
|---|---|
| Solo Pauta | Paga por cada lead que Neggo le envía (tarifa negociable, abierta — nunca fijar un número sin confirmarlo con Jhey). El cierre de la venta lo hace el comercio con su propio proceso comercial. |
| Balanceado | Paga un valor de lead más bajo que Solo Pauta, más una comisión — pero la comisión solo aplica si ese cliente efectivamente toma el servicio/compra. |
| Solo Resultados | No paga nada por adelantado. Paga solo si un cliente compra o toma su servicio a través de Neggo. |

**Pendiente real (flag para Ingeniería/Arquitectura, no lo resuelve Marketing):** al verificar `planes_comercio` en la base de datos el 4 ago, los valores cargados (`solo_pauta`: cpl 3.000/1%, `balanceado`: cpl 5.000/5%, `solo_resultados`: cpl 0/3%) no siguen la lógica de arriba — ej. Balanceado tenía el cpl más alto de los tres, cuando debería ser más bajo que Solo Pauta. No usar esas cifras en ningún contenido hasta que se reconcilien con `neggo-architect`/`neggo-engineer`. Mientras tanto, todo contenido dirigido a comercios describe la LÓGICA de cada plan (tabla de arriba), nunca un número fijo de COP o %.

Aparte de esto, **Sello de Confianza** es una suscripción mensual recurrente aparte del plan (tabla `tarifas_sello_negociadas` + franjas automáticas por ingreso mensual declarado): <$300.000 → $5.000/mes; hasta $10.000.000 → $20.000/mes; hasta $20.000.000 → $28.000/mes; más de $20.000.000 → $40.000/mes. Los primeros 50 comercios lo tienen gratis (sección 4). Esta cifra sí está verificada y no tiene la inconsistencia de los planes.

### 5.2 Cómo le llega la demanda a un comercio (para no describirlo mal)

Dos mecanismos separados, nunca mezclarlos en el copy:
- **Me Interesa** (activo): el cliente pide contacto ya en una categoría — llega directo a la pestaña "Solicitudes" del negocio con nombre/teléfono visibles de inmediato.
- **Metas/IFC** (pasivo): el cliente define una meta en su categoría (ej. un procedimiento, un viaje, un mueble — nunca hardcodear un solo ejemplo en piezas que van a varias categorías) → aparece como oportunidad anónima en el feed del negocio → el negocio envía una propuesta/oferta con sus condiciones → el cliente la ve en un carrusel (máx. 3 activas) y decide "Me interesa" → recién ahí se libera el contacto real.

### 5.3 Reputación por Calidad (distinta del Sello de Confianza)

Score dinámico que sube/baja con feedback real de clientes (felicitación +5, sugerencia 0, problema −3, mala atención −8, nunca baja de 0) — se sostiene con evidencia real, no es lo mismo que el Sello de Confianza (que es verificación legal estática, sí/no). Usar esta, no "score financiero", cuando el contenido es para comercios — el score financiero es un dato relevante para Bancos/Constructoras sobre el cliente final, no algo que un comercio de estética/gimnasio/etc. necesite ver en un portafolio dirigido a él.

## 6. Sobre el nombre "Neggo"

Se mantiene por ahora — el intento anterior tuvo exposición pública mínima, así que no hay daño de reputación real que evitar. Cambio de nombre queda abierto como decisión futura, de bajo costo técnico si se decide más adelante.

## 7. Pendiente de definir en una próxima sesión

- Guion de primera llamada/reunión con un banco.
- Landing pages específicas por audiencia (hoy son genéricas).

## 8. Objeciones comunes y cómo responderlas

**"¿Por qué no construimos esto nosotros mismos con nuestro propio equipo?"**
- Construir un motor de leads con CRM, facturación automática, sistema de tarifas negociables y anti-fraude toma meses/años de desarrollo especializado — Neggo ya lo tiene construido y probado.
- Un banco construyendo solo empieza con demanda cero — Neggo ya agrega demanda real de múltiples canales (Me Interesa, Metas/IFC) desde el día uno.
- Costo de un equipo de desarrollo dedicado + mantenimiento continuo generalmente supera el modelo de CPL + comisión por resultado.

**"¿Cómo sé que los leads son reales y no basura?"**
- Score financiero estimado visible por cada cliente (rango de ingresos declarado).
- Sistema de alertas de conversión: si un negocio tiene una tasa de conversión anormalmente baja comparada con el promedio del sector, se marca para revisión — protege a ambos lados.

**"¿Qué pasa si no nos gusta después de probar?"**
- Sin permanencia obligatoria — el modelo de pago por resultado (CPL + éxito) significa que si no genera valor, simplemente se deja de usar, sin contrato de salida costoso.

## 9. Fórmula de copy — miedo real primero, solución concreta después (agregado 4 ago, a pedido de Jhey)

Regla no negociable para TODA pieza de contenido y TODA respuesta de ventas/prospección
(Growth, Ventas, Contenido): nunca empezar por "conseguimos leads" o "pagas por CPL" como
mensaje principal — eso es el mecanismo, no el motivo por el que a alguien le importa.
Empezar siempre nombrando un miedo o problema real de la audiencia, y recién después
conectar con lo que Neggo construyó en concreto para resolver eso.

**Estructura:**
1. Nombrar el miedo/problema real (con evidencia razonable, nunca una cifra inventada —
   "hemos visto que...", "es común que...", no "el 73% de...").
2. Conectar con la capacidad real de Neggo que resuelve justo eso (verificación previa,
   Sello de Confianza, código anti-phishing, Metas con comercios aliados) — nunca quedarse
   en "te traemos clientes".
3. Cierre de baja fricción (pregunta corta, nunca presión).

**Ejemplos de piezas para clientes finales (B2C):**

*Miedo a estafas / desconfianza de negocios online:*
"¿Te da desconfianza comprarle a un negocio que no conocés? En Neggo vemos seguido que la
gente deja pasar una compra por miedo a caer en una estafa. Por eso verificamos cada
negocio, banco o constructora ANTES de conectarte con ellos — y te garantizamos que quien
te contacta es real, con Sello de Confianza y código anti-phishing para que sepas que no es
un fraude. Consultá primero en Neggo, después decidí con seguridad."

*Meta financiera que se siente lejana (usa la funcionalidad real de Metas/GoalCategory ya
construida — viaje, vivienda, carro, remodelación, etc.):*
"¿Tenés una meta —un viaje, un carro, remodelar tu casa— y sentís que falta mucho para
lograrla? En Neggo conectamos tu meta con comercios reales que te pueden ayudar a
alcanzarla en mucho menos tiempo del que pensás. No esperes años para algo que podés
lograr en meses. Contanos tu meta y te mostramos quién te puede ayudar hoy."

**Para comercios (B2B, prospección y respuestas de ventas):** el mismo miedo aplica del
otro lado — muchos clientes finales abandonan una compra por desconfianza del negocio, no
por el negocio en sí. El pitch a un comercio se fortalece mostrando que Neggo les resuelve
ESE freno de conversión (el cliente llega ya verificado y con más disposición a comprar),
no solo "te mandamos tráfico". Combinar esto con el tratamiento de "cuenta grande" (sección
6.1 de `estrategia-adquisicion-clientes-neggo.md`) cuando aplique.
