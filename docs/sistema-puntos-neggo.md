# Sistema de Puntos Neggo — Diseño

## Modelo de negocio (confirmado)

- Los puntos son una **moneda interoperable** de todo el ecosistema — se ganan en un comercio/constructora y se pueden canjear en **cualquier otro aliado de Neggo** (no ligados al negocio que los emitió).
- Esto requiere un "fondo común": el saldo de puntos pertenece al **cliente**, no a ningún comercio específico.

## Flujo de 3 etapas

1. **EMISIÓN**: cliente compra en Comercio A (compra real, registrada en la Bóveda/`facturas_cliente`) → se calculan puntos según la tasa vigente de A → se suman al saldo del cliente → queda en su historial ("Ganaste X puntos en A").
2. **CANJE**: cliente canjea puntos en Comercio B (puede ser cualquier aliado, no necesariamente A) → se descuentan del saldo del cliente inmediatamente → queda registrado en 2 historiales: el del cliente ("Canjeaste X puntos en B") y el de B ("Cliente canjeó X puntos — Neggo te debe $Y", estado `pendiente_pago`).
3. **LIQUIDACIÓN**: Neggo le paga a B el valor real de esos puntos (mismo patrón que `facturas_ledger`/`facturas_mensuales` ya existente) → el registro pasa de `pendiente_pago` a `pagado` en el histórico de B.

## Tasas de acumulación (Fase 1 — simple)

Por comercio, mismo patrón append-only que `tarifas_comercio_negociadas`: Estándar (1pt/$1.000), Plus (2pt/$1.000), Premium (3pt/$1.000) — configurable, con historial.

## Categorías especiales (Fase 1.5, pendiente de definir)

Compras de alto valor (ej. vivienda vía constructora) requieren un modelo de presupuesto distinto — NO la misma tasa lineal que un comercio pequeño. Regla propuesta (pendiente de aprobar): el presupuesto de puntos se calcula como % de la **comisión real** que Neggo gana en esa transacción (Success Fee/CPL/tarifa), no del valor bruto de venta — así el sistema escala con los ingresos reales y nunca queda descubierto.

## Pendientes de decisión de negocio (bloquean partes específicas, NO todo el sistema)

- Valor de conversión punto→peso.
- Quién financia el fondo de pagos a comercios que reciben canjes (Opción A: Neggo aparta % de su propia comisión; Opción B: el comercio emisor asume el costo como parte de su marketing) — pendiente.
- Tasas específicas por categoría/tipo de comercio — pendiente.
- Vencimiento: puntos SÍ vencen (confirmado), fecha exacta pendiente de definir.

## Fase 2 (después del Nivel 1) — Campañas

El comercio activa multiplicadores temporales sobre su tasa base: Doble puntos, Triple puntos, Happy Hour, Fin de semana, Cumpleaños, Nuevos clientes, Clientes inactivos, Primera compra. Requiere tabla de campañas con vigencia (fecha inicio/fin) y multiplicador.

## Fase 3 (mucho después) — Paquete de Bienvenida multi-aliado

Para compras grandes (ej. vivienda): catálogo de beneficios de terceros (mueblería, ferretería, seguros, mudanzas) que se activan por categoría de compra. Cada aliado aporta su propio cupón — mismo modelo "paga por resultado" que ya usan los comercios. Requiere onboarding de un nuevo tipo de aliado ("proveedor de beneficios"), fuera del alcance de Fase 1/2.

## Explícitamente NO en el alcance inicial

- **Transferencia de puntos entre clientes**: mencionada como idea, pero con riesgo real de lavado (mismo patrón de fraude que el buscador de comercios) — requiere límites estrictos y auditoría antes de construirse. Pendiente de "condiciones" (palabras del negocio).
