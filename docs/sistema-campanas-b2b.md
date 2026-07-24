# Sistema de Campañas B2B — Segmentación, Rotación y Visión a Futuro

## Los 2 modos de lanzamiento
Al crear una campaña (banco/comercio) o un proyecto (constructora), el B2B elige:
- **Segmentado**: filtros específicos (ciudad, rango de ingresos, producto, score — según el tipo de aliado). Es el modelo ya diseñado en docs/pipeline-b2b-seguridad.md.
- **Alcance Amplio**: llega a "casi todos" los clientes que cumplan un criterio mínimo (ej. solo ciudad, o ningún filtro), sin segmentación fina — para negocios que quieren máxima visibilidad sin afinar público.

## Rotación anti-saturación (CRÍTICO — sin esto el sistema no escala)
Problema real: con potencialmente miles de comercios (ej. 1.000 comercios, 400 solo de celulares), un cliente no puede ver todas las ofertas activas — el feed se saturaría y los negocios pequeños/nuevos nunca tendrían visibilidad frente a los que más pautan.

Solución propuesta: sistema de ROTACIÓN — cada vez que un cliente abre "Ofertas", el sistema muestra un subconjunto rotado de campañas activas que cumplen su segmentación, garantizando que todos los aliados (no solo los de mayor presupuesto) reciban exposición justa con el tiempo. Reutilizar/extender el mismo principio del algoritmo de equidad 40-30-20-10 ya mencionado para distribución de leads en Constructoras (ver AlgorithmMonitor.tsx) — aplicado aquí a VISIBILIDAD de campañas, no solo a asignación de leads.

Objetivo explícito del negocio: "no podemos dejar que solo los grandes anunciantes acaparen la atención — todos los aliados de Neggo deben tener oportunidad real de alcance."

## Segmentación avanzada — hoy vs. futuro
**Hoy (Fase 1, ya diseñada)**: ciudad, rango de ingresos, producto (bancos), score estimado.

**Futuro — progresivo**: barrio, zona, ubicación exacta del cliente. El sistema NO debe pedir todo esto en el registro inicial (fricción, abandono) — debe solicitarlo de forma progresiva y opcional a medida que el cliente usa la plataforma (ej. al completar una meta, al hacer una compra, se le pregunta un dato adicional). Esto alimenta con el tiempo una segmentación cada vez más precisa.

**Ambición explícita del negocio**: la segmentación debe ser tan potente y amplia como la de plataformas como Meta Ads — el B2B debe poder decir "quiero llegar exactamente a este público" con múltiples dimensiones combinables (ubicación + ingresos + historial + comportamiento).

## Fase futura avanzada — marketing por relación histórica y geolocalización
Caso de uso concreto planteado por el negocio: un comercio que está en un evento en una zona X quiere lanzar una promoción dirigida específicamente a:
- Clientes que alguna vez mostraron interés en ese negocio (me_interesa_destinatarios histórico).
- Clientes que ya compraron ahí (facturas_cliente histórico).
- Clientes que tuvieron algún contacto previo (comercio_contactos histórico).

Esto es segmentación por HISTORIAL DE RELACIÓN con el negocio específico, no solo demográfica — ya existen las tablas base para construirlo (me_interesa_destinatarios, comercio_contactos, facturas_cliente), falta la capa de consulta/notificación dirigida.

Notificaciones geolocalizadas: requiere opt-in explícito de ubicación del cliente (transparente, nunca forzado) — evaluar cuando la base de clientes lo justifique.

## Relación con el resto del sistema
- Las campañas de bancos/comercios usan la MISMA infraestructura de seguridad ya construida: código de verificación único por solicitud (me_interesa_destinatarios.codigo_verificacion), teléfono verificado de la organización, nunca contacto libre.
- CPL/comisión de las campañas usa las tarifas YA EXISTENTES (resolver_cpl_comercio para comercios, tarifas_bancos_por_organizacion para bancos) — no se inventa un modelo de precio nuevo.
- El match sigue siendo MANUAL: el cliente ve la campaña como tarjeta y decide activamente hacer clic en "Me interesa" (nunca se genera un lead automático sin acción del cliente) — mismo principio ya aplicado en Oportunidades Inmobiliarias.

## Orden de construcción recomendado (próxima sesión)
1. Fase 1 — Segmentado básico: tabla `campanas` (organization_id, tipo, titulo, descripcion, estado, segmentacion jsonb), CRUD para bancos y comercios, matching manual igual que proyectos inmobiliarios.
2. Fase 1.5 — Modo "Alcance Amplio" como alternativa simple al segmentado.
3. Fase 2 — Rotación anti-saturación (necesaria en cuanto haya volumen real de campañas simultáneas).
4. Fase 3 — Segmentación progresiva por barrio/zona (depende de que el perfil del cliente vaya capturando esos datos con el tiempo).
5. Fase 4 — Marketing por historial de relación + geolocalización (la más avanzada, requiere volumen de datos históricos real).
