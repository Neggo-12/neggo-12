# Finanzas Personales — Fase 1 (spec)

Fecha: 8 de agosto de 2026. Este documento nace de una sesión de research +
estrategia (revisión completa de los documentos fundacionales de Neggo en
`Desktop/neggo inicio/`, benchmark de mercado actual, y decisión directa de
Jhey) — no es una idea nueva desde cero, es la versión ejecutable de algo que
Neggo ya diseñó en 2020-2023 y nunca automatizó.

## 1. Contexto — qué encontramos y qué decidimos

Neggo diseñó en su etapa fundacional (2018-2023) un módulo completo de
finanzas personales: presupuesto, deudas, facturas, metas de ahorro con
fórmulas ya definidas, un diagnóstico financiero basado en Datacrédito que se
hacía **manualmente** (hay reportes reales generados persona por persona en
`Producto/B2C/Diagnóstico financiero/`), y simuladores (ahorro, Reto 52
Semanas, TDC, crédito, pensión) construidos en Excel. Nunca se automatizó ni
se integró al producto actual.

Benchmark de mercado (2025-2026, con búsqueda web, no memoria): Mint cerró en
2024; los líderes actuales son Monarch Money, Copilot Money, Rocket Money,
YNAB, Cleo AI (global) y Ualá, Mobills, Fintonic, Finerio Connect (LatAm).
Colombia volvió obligatorio el Open Finance en 2026 (Decreto 0368) — Belvo y
Finerio Connect (esta última en alianza directa con Bancolombia) ya operan acá.

Decisiones tomadas con Jhey:

- **Camino rápido primero**: registro manual + WhatsApp + OCR de
  facturas/recibos, no conexión bancaria automática (Belvo/Finerio) todavía.
  Motivo: más barato, más rápido de construir, y sirve al público que paga en
  efectivo/fiado — que ninguna app bancarizada (Rocket Money, Monarch) sabe
  tocar.
- **Datacrédito**: la relación comercial está vencida (hay una carta de
  cancelación en los archivos históricos). **Jhey renegocia el acceso** —
  pedir específicamente acceso vía API, no el portal manual que usaban antes,
  para que el diagnóstico se pueda automatizar de una vez. Este ítem bloquea
  la Fase 3 (diagnóstico financiero), no la Fase 1.
- **Segmento repensado**: en 2018 Neggo se definió a sí mismo sirviendo al no
  bancarizado (16M de colombianos sin historial crediticio). Jhey confirma que
  esto ya no refleja quién es Neggo hoy — el producto actual (matching con
  bancos, constructoras, comercios vía Me Interesa/Metas) atrae en la práctica
  a gente que ya compara productos financieros activamente, no a alguien
  excluido del sistema. La tesis de trabajo para Finanzas Personales es
  **bancarizado pero desorganizado y financieramente activo** — coincide con
  el segmento real de Monarch/Rocket Money/Fadi, es más monetizable, y no
  descarta al público informal (el registro manual + WhatsApp los sigue
  sirviendo igual). Esta tesis se valida con datos de uso reales una vez
  lanzado, no es un dogma — si el uso real muestra otro segmento, se seguirá
  ese dato.

## 2. Alcance de Fase 1 (qué se construye ahora)

Objetivo de la fase: dar al cliente una razón para volver a Neggo todos los
días, no solo cuando necesita pedir algo puntual a un banco/comercio.

**Incluido:**

1. **Mi Presupuesto** — ingresos (múltiples fuentes), necesidades (facturas de
   servicios, plan celular, suscripciones, arriendo, transporte, comida),
   deudas, ocio, ahorro. Guardado mensual con histórico, opción de replicar el
   mes anterior. Basado directamente en el spec de `Pilares Neggo.docx` y
   `Doc de funcionalidades.docx` de 2020-2023, adaptado al stack actual.
2. **Mis Deudas** — registro de deudas formales e informales, con el pago
   mensual heredado automáticamente del presupuesto (no doble captura).
3. **Mis Metas / Calculadora de Sueños** — metas de ahorro a corto/mediano/
   largo plazo. Reusa las fórmulas ya definidas en el doc original
   (cuota = valor total / (días restantes / periodicidad)).
4. **OCR de facturas y recibos** — el cliente sube o toma foto de una factura/
   recibo; el sistema extrae comercio, fecha, valor y categoría, y lo carga
   directo a Mi Presupuesto sin captura manual. Este es el punto que Jhey
   señaló como ya intentado antes (sin spec escrito encontrado, pero
   confirmado por su propio recuerdo de una sesión anterior) — ahora es
   técnicamente mucho más simple que en 2020 gracias a proveedores de OCR
   especializados en recibos.
5. **Bot de WhatsApp** — registro de gasto por texto o nota de voz,
   categorización automática, mismo backend que Mi Presupuesto. Con
   personalidad propia (tono cercano/voseo ya establecido en la marca Neggo),
   no un formulario sin alma — es el factor que más se repite en el benchmark
   como driver real de retención (caso Cleo AI).

**Explícitamente fuera de Fase 1** (para no repetir el error original de querer
construir todo el neobanco de una vez):

- Diagnóstico financiero vía Datacrédito — bloqueado por renegociación
  comercial (Jhey).
- Conexión bancaria automática (Belvo/Finerio/Open Finance) — Fase futura,
  decisión ya tomada de no empezar por acá.
- Redondeo automático a ahorro, negociación/cancelación de suscripciones,
  presupuesto compartido/familiar — funcionalidades validadas en el
  benchmark, quedan para Fase 2 una vez el core esté probado con uso real.
- Cualquier producto de crédito, cuenta o tarjeta propia — eso requiere
  licencia financiera, no es parte de esta conversación.

## 3. Modelo de datos (conceptual — no reemplaza verificación de esquema real)

Antes de escribir cualquier migración real, sigue aplicando la regla de
CLAUDE.md: verificar el esquema actual con una consulta, nunca asumir de
memoria. Este es solo el borrador conceptual de qué tablas nuevas se
necesitarían, para discutir forma antes de fondo:

- `presupuestos_cliente` (mes, cliente_id text, ingresos jsonb, necesidades
  jsonb, deudas jsonb, ocio jsonb, ahorro jsonb, snapshot mensual histórico)
- `deudas_cliente` (cliente_id text, nombre, tipo formal/informal, saldo,
  pago_mensual, origen: manual | heredado_credito_neggo)
- `metas_cliente` (cliente_id text, nombre, valor_objetivo, fecha_final,
  periodicidad, valor_ahorrado_actual, recordatorio boolean)
- `movimientos_ocr` (cliente_id text, imagen_url, comercio_extraido,
  valor_extraido, fecha_extraida, categoria, confianza_ocr, estado:
  pendiente_revision | confirmado | descartado — el cliente siempre confirma
  antes de que se compute como gasto real, el OCR no escribe directo)
- `mensajes_whatsapp_finanzas` (cliente_id text, mensaje_original, tipo:
  texto | audio, movimiento_extraido jsonb, estado)

Todas con RLS estándar del proyecto (cada cliente solo ve lo suyo), y las
escrituras sensibles (confirmar un movimiento OCR, cerrar un mes de
presupuesto) pasan por función SECURITY DEFINER con `SET search_path =
public`, siguiendo el patrón ya establecido en el resto de Neggo.

## 4. Decisiones técnicas pendientes (necesitan su propia evaluación de seguridad)

Por la regla de "seguridad primero" del proyecto, ninguno de estos proveedores
se elige por precio — se evalúan por seguridad/protección de datos financieros
antes que nada:

- **Proveedor de OCR de recibos**: candidatos a evaluar (no elegido todavía):
  Google Document AI, AWS Textract, Mindee, Veryfi. Cada uno procesa
  imágenes de documentos financieros del cliente — requiere la misma
  evaluación de seguridad que se le hizo a Didit antes de elegirlo.
- **Proveedor de WhatsApp Business API**: tiene que ser la plataforma oficial
  de Meta a través de un BSP autorizado (Twilio, 360dialog, Gupshup) — nunca
  un wrapper no oficial, por la misma regla de "nunca bypass de protecciones
  de terceros" que ya aplicó el proyecto al descartar CoreSoft.
- **Renegociación con Datacrédito**: acción de Jhey, pedir acceso vía API.

## 5. Cómo esto conecta con lo que Neggo ya gana plata haciendo

Esto no es una herramienta gratis aislada. Una vez el cliente tiene
presupuesto, deudas y metas reales cargadas en Neggo, ese dato se convierte en
una señal de "Calidad" nueva para el algoritmo de matching 40/30/20/10 que ya
usan Me Interesa y Metas/IFC — mejora la precalificación de leads que se le
venden a bancos y constructoras, lo que sostiene subir el precio de esos
leads a futuro. Ese cruce queda para cuando Fase 1 esté en producción con uso
real, no se construye todavía.

## 6. Próximo paso técnico

Con este spec aprobado, el siguiente paso es diseñar el flujo de UI de "Mi
Presupuesto" dentro del Portal de Clientes existente (reusar la arquitectura
actual, no crear una sección aislada), y decidir el orden real de
construcción: ¿Mi Presupuesto primero y el OCR/WhatsApp como capas de carga
rápida después, o al revés? Recomendación: Mi Presupuesto primero (es el
esqueleto de datos que todo lo demás alimenta), OCR segundo, WhatsApp tercero.
