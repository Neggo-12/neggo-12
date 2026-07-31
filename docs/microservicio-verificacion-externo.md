# Microservicio de Verificación Externo — Diseño

## Motivación (confirmada por el negocio)
Aislar la lógica de consulta a fuentes de verificación/cumplimiento (listas OFAC/ONU/PEP, antecedentes judiciales, y futuras APIs de terceros para marketing/beneficios) en un servicio TOTALMENTE EXTERNO a Neggo — nunca en el mismo repo/infraestructura — para reducir superficie de ataque: si el core de Neggo se ve comprometido, las claves/lógica de este servicio quedan aisladas.

## Flujo propuesto (actualizado 31 jul 2026)
1. Cliente ingresa Nombres, Apellidos, Tipo de ID y Número de ID — ya son el 2do grupo de campos del formulario B2C actual (antes de correo/celular/ingresos), no hace falta reordenar nada.
2. Apenas esos 4 campos están completos, el frontend dispara la consulta al microservicio externo EN SEGUNDO PLANO, sin bloquear al usuario — puede seguir llenando el resto del formulario mientras se resuelve.
3. El microservicio consulta las fuentes reales (por ahora solo OFAC/ONU vía API oficial gratuita — ver sección "Fuentes" abajo, actualizada tras evaluar alternativas).
4. El resultado del chequeo en segundo plano es solo para feedback visual rápido (ej. un check verde discreto) — NUNCA es la barrera de seguridad real. La barrera real va server-side: la función `registrar_b2c_completo` (SECURITY DEFINER) vuelve a verificar contra el microservicio (o contra un resultado ya persistido con su propio ID de verificación) antes de permitir la creación de la cuenta. Si hay match, la función rechaza el registro — nunca confiar en un estado del navegador para esto, mismo patrón que el resto de Neggo.
5. Si el chequeo server-side encuentra un problema, el registro se bloquea al momento de enviar el formulario final, con un mensaje genérico que no revela el motivo exacto (para no darle pistas a quien intenta pasar el filtro):
   > "En este momento no podemos continuar con tu registro. Por favor comunícate con nosotros o revisa que tus datos estén bien ingresados."
6. Pendiente de decidir con Jhey: política ante caída del microservicio (fail-open con revisión manual posterior vs. fail-closed bloqueando todo registro hasta que el servicio vuelva) — no asumir una sin confirmar, es un trade-off real entre seguridad y continuidad del negocio.

## Fuentes investigadas (sesión del 24 jul 2026)
- **OFAC (EE.UU.)**: GRATIS, oficial. sanctionslist.ofac.treas.gov ofrece descarga directa de datos (SDN + Consolidated). Existe proyecto open-source de referencia (moov-io/ofac en GitHub) que ya expone estos datos como API HTTP autohospedable.
- **ONU (Consolidated List)**: GRATIS, oficial, formato descargable (XML).
- **Unión Europea / INTERPOL**: listas públicas pero sin API lista para consumir gratis — requieren scraping o agregador de pago.
- **PEP (Personas Expuestas Políticamente)**: sin fuente única gratuita confiable — depende de compilar múltiples fuentes por país. La pieza más cara de automatizar.
- **Antecedentes judiciales/Procuraduría/Contraloría (Colombia)**: consultables gratis en portales oficiales (procuraduria.gov.co, contraloria.gov.co), pero sin API formal — candidatos a scraping.
- **HunterX** (y agregadores similares: Compliancely, Comply Advantage): cubren las 40 fuentes de una vez, pero de pago — evaluar cuando el volumen del piloto lo justifique.

## Recomendación de fases
- Fase 1 (piloto): solo OFAC + ONU, gratis, vía API oficial — cubre los casos más graves (terrorismo, narcotráfico, sanciones internacionales). **Esta es la única fase que arranca ya** — las demás requieren más investigación de canales autorizados antes de construir nada.
- Fase 2: agregar antecedentes judiciales/RUES colombianos — **solo por canales oficiales autorizados**, nunca scraping de terceros que bypasean protecciones. Pendiente investigar si existe un canal de interoperabilidad formal real (ver sección de proveedores evaluados).
- Fase 3: evaluar agregador de pago (PEP + cobertura completa), cuando el volumen lo justifique económicamente y solo si el proveedor demuestra que su acceso a los datos es autorizado, no scraping.

## Proveedores evaluados y descartados (31 jul 2026)

**HunterX** (hunterx.com.co) — descartado por costo. La conexión por API solo está disponible desde el plan "Avanzado" en adelante: 500 consultas por $1.100.000 COP/año (~$2.200 COP/consulta) o "Pro" 1000 consultas por $1.800.000 COP/año (~$1.800 COP/consulta). Los planes más baratos no incluyen API, solo consulta manual — no sirven para integrar en el registro. Muy elevado para el volumen actual de Neggo. Se revalúa en Fase 3 si el volumen lo justifica.

**CoreSoft** (coresoft.solutions) — descartado por seguridad, no por precio (de hecho es más barato: desde $49.000 COP/mes por 500 consultas, y cubre muchas más fuentes: RUNT, SIMIT, cédula, antecedentes, Policía, Procuraduría, RUES, SISBEN, ADRES, Rama Judicial). El problema es de fondo: **no es una fuente oficial ni autorizada** — es un servicio de web scraping que extrae datos de los portales del Estado colombiano. Su propio sitio publicita explícitamente "Rompemos lo que otros no pueden" y "Vencemos cualquier protección" como características del servicio — es decir, venden como ventaja el bypass de CAPTCHAs y sistemas anti-bot. El portal oficial de antecedentes de la Policía Nacional usa CAPTCHA explícitamente "para evitar consultas automatizadas masivas", según la propia entidad. Cuando en su FAQ preguntan si es legal, CoreSoft responde solo sobre el tratamiento de datos (Ley 1581) pero evade la pregunta real de si el método de extracción en sí es legal.

Para un fintech haciendo KYC esto viola la regla de "seguridad primero siempre" (agregada a `CLAUDE.md`): es un proveedor no autorizado, con riesgo legal real (posible infracción a ToS de los portales del Estado, zona gris de la Ley 1273 de 2009 sobre acceso abusivo a sistemas informáticos) y con riesgo de continuidad (si el Estado les cierra el acceso, el pipeline de KYC de Neggo se cae de un día para otro sin aviso, sin que Neggo tenga control ni visibilidad de por qué). **No usar para el pipeline de producción de Neggo**, sin importar cuánto ahorre en costo o cuánta cobertura ofrezca.

## Consideraciones de seguridad para el microservicio en sí
- Aunque esté separado de Neggo, debe tener su propia autenticación fuerte entre servicios (nunca abierto públicamente sin token).
- Nunca debe loguear ni almacenar más datos personales de los estrictamente necesarios para la consulta (minimización de datos, alineado con la Política de Tratamiento de Datos ya existente).
- Riesgo legal de scraping: revisar términos de uso de cada fuente antes de automatizar — preferir API oficial siempre que exista.

## Estado de construcción (31 jul 2026)
- **Repo separado creado**: `~/Documents/GitHub/neggo-verificacion-externo` (Hono + Cloudflare Workers, TS). `tsc` limpio. Contiene `/v1/compliance` (ONU funcional, CSL/OFAC pendiente de conectar — ver TODO en `src/compliance.ts`) y `/v1/contacto` (email+teléfono vía Abstract API). Falta: `npm run dev`/deploy real con las API keys, y crear el repo en GitHub + cuenta de Cloudflare separada.
- **Tabla de evidencia del lado de Neggo**: migración escrita en `supabase/migrations/20260731_verificaciones_identidad_cliente.sql` (tabla `verificaciones_identidad_cliente` + función `registrar_resultado_verificacion`, SECURITY DEFINER, mismo patrón que `registrar_b2c_completo`). **No aplicada todavía** — el MCP de Supabase no tenía permiso en la sesión donde se escribió; aplicar vía Claude Code o el MCP una vez tenga permiso.
- **Ampliación de alcance confirmada por Jhey**: además de compliance (OFAC/ONU), el microservicio también cubre validación de contacto (email/teléfono, ya en el scaffold) y en el futuro perfil financiero ampliado y enriquecimiento general — ver sección "Roadmap ampliado" abajo.
- **Hallazgo importante, sin resolver todavía**: `LandingHub.tsx` (tarjeta "Soy un Banco") dice "Scoring Datacrédito real, ya integrado" — pero el único "score" que existe en el código es un `score_estimado` calculado internamente a partir del rango de ingresos autodeclarado (`registrar_b2c_completo`), no una integración real con el buró Datacrédito. La palabra "Datacrédito" en el código solo aparece en datos mock de estado de sistema (`data/mock.ts`). Esto es una afirmación de marketing no respaldada por una capacidad real — viola la regla de "cero estadísticas/capacidades inventadas" de `landing-rediseno.md`. Pendiente: corregir el copy o construir la integración real (esto último conecta directo con el track de "perfil financiero/crediticio ampliado" del roadmap de abajo).

## Roadmap ampliado (31 jul 2026 — alcance confirmado por Jhey)
Los 4 frentes que Jhey quiere cubrir, en orden de qué tan listo está cada uno:
1. **Validación de contacto** (email/teléfono) — YA en el scaffold de Fase 1 (Abstract API, 100 gratis/mes cada uno). Complementa, no reemplaza, la confirmación por correo (double opt-in) que ya existe vía Supabase Auth.
2. **Compliance/riesgo** (OFAC/ONU ahora; antecedentes/PEP colombianos después) — Fase 1 en construcción (ONU funcional, CSL/OFAC pendiente), Fase 2 bloqueada hasta confirmar canal autorizado real con Confecámaras/Policía (ver sección de proveedores evaluados).
3. **Perfil financiero/crediticio ampliado** — no arrancado. Conecta con el hallazgo de Datacrédito de arriba: primero corregir/confirmar qué existe hoy antes de construir algo nuevo que lo duplique.
4. **Enriquecimiento general** (redes, negocio propio, etc.) — no arrancado, menor prioridad. Necesita su propia investigación de fuentes autorizadas antes de tocar código (mismo criterio de seguridad que todo lo demás — nada de scraping de terceros no autorizados).

## Pendiente de decisión (próxima sesión)
- Confirmar directamente con Confecámaras (RUES) y con la Policía Nacional si existe un canal de datos autorizado y automatizable (no scraping) para consultas programáticas — el de RUES es gratis manualmente pero sin API pública confirmada; el de Policía usa CAPTCHA por diseño y su único canal automatizable mencionado (Decreto 019 de 2012, art. 94) parece requerir convenio de interoperabilidad formal con el Estado, no una simple API key — hay que verificarlo con la entidad, no asumirlo.
- Política de fail-open vs. fail-closed si el microservicio de verificación está caído al momento del registro (ver sección "Flujo propuesto").
- Stack tecnológico del microservicio: recomendado TypeScript + Hono sobre Cloudflare Workers (mismo lenguaje que ya domina el equipo, cero dependencias compartidas con el repo de Neggo) para la Fase 1, evaluando Python/FastAPI más adelante si Fase 2 requiere scraping propio (no de terceros) de fuentes que sí lo permitan por sus ToS.
- Hosting: cuenta de Cloudflare completamente separada de la de neggo.co (no otro proyecto en la misma cuenta) — logra el aislamiento real sin sumar un proveedor nuevo que aprender.
- Modelo de autenticación entre Neggo y el microservicio: API key estática (32+ bytes) como secret en ambos lados, enviada en header propio, validada antes de procesar cualquier request. Reforzar con rate limiting (allowlist de IP no es viable en Cloudflare Workers por IP saliente no fija).
